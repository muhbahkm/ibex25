import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
  Inject,
  Scope,
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { PrismaService } from '../prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { OperatorContextDto } from './dto/operator-context.dto';
import { IssueInvoiceDto } from './dto/issue-invoice.dto';
import { Prisma, InvoiceStatus, PaymentType, LedgerEntryType } from '@prisma/client';
import { InvoiceStateTransitions } from './utils/invoice-state-transitions';
import { StoreOwnershipGuard } from './utils/store-ownership.guard';
import { LedgerGuard } from './utils/ledger-guard';

@Injectable({ scope: Scope.REQUEST })
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(REQUEST) private request: Request,
  ) {}

  /**
   * S3: Enforce Store Ownership with Logging
   *
   * This method provides defense-in-depth by validating store ownership
   * at the service layer, even though StoreScopeGuard already validates
   * at the controller level.
   *
   * The dual validation (guard + service) is a security feature, not redundancy:
   * - Guard: Prevents unauthorized requests from reaching the service
   * - Service: Validates ownership even if guard is bypassed or service is called directly
   *
   * @param invoiceStoreId - The storeId of the invoice
   * @param operatorStoreId - The storeId from AuthContext (or operatorContext)
   * @param operation - Description of the operation being performed
   * @param invoiceId - The invoice ID (for logging)
   */
  private enforceStoreOwnership(
    invoiceStoreId: string,
    operatorStoreId: string,
    operation: string,
    invoiceId: string,
  ): void {
    if (invoiceStoreId !== operatorStoreId) {
      const requestId = (this.request?.['requestId'] as string) || 'unknown';
      this.logger.warn(
        `[${requestId}] INVOICE_CROSS_TENANT_ACCESS: invoiceId=${invoiceId}, ` +
          `operatorStoreId=${operatorStoreId}, invoiceStoreId=${invoiceStoreId}, operation=${operation}`,
      );

      throw new ForbiddenException({
        message: `Operation '${operation}' on invoice ${invoiceId} is forbidden. ` +
          `Cross-tenant access denied. Operator storeId=${operatorStoreId}, Invoice storeId=${invoiceStoreId}.`,
        code: 'INVOICE_CROSS_TENANT_ACCESS',
      });
    }
  }

  async create(
    createInvoiceDto: CreateInvoiceDto,
    operatorContext: OperatorContextDto,
  ) {
    const { storeId, createdBy, customerId, items } = createInvoiceDto;

    // Store Ownership Guard: Validate operator belongs to the store
    StoreOwnershipGuard.validateOperatorStore(
      operatorContext.storeId,
      storeId,
      'create invoice',
    );

    // Validate operator is the creator
    if (operatorContext.operatorId !== createdBy) {
      throw new ForbiddenException(
        `Operator ${operatorContext.operatorId} cannot create invoice on behalf of user ${createdBy}. ` +
          `The operatorId must match createdBy.`,
      );
    }

    // All new invoices start as DRAFT
    // They must be issued (DRAFT → ISSUED) before they have any financial impact
    const status: InvoiceStatus = InvoiceStatus.DRAFT;

    // Use transaction to ensure all operations succeed or fail together
    return await this.prisma.$transaction(async (tx) => {
      // Fetch all products with their current prices and stock
      const productIds = items.map((item) => item.productId);
      const products = await tx.product.findMany({
        where: {
          id: { in: productIds },
          storeId: storeId,
        },
      });

      // Validate all products exist and belong to the store
      if (products.length !== productIds.length) {
        const foundIds = products.map((p) => p.id);
        const missingIds = productIds.filter((id) => !foundIds.includes(id));
        throw new NotFoundException(
          `Products not found or do not belong to store: ${missingIds.join(', ')}`,
        );
      }

      // Aggregate quantities per product for stock validation (in case same product appears multiple times)
      const productQuantities = new Map<string, number>();
      for (const item of items) {
        const currentQty = productQuantities.get(item.productId) || 0;
        productQuantities.set(item.productId, currentQty + item.quantity);
      }

      // Validate stock availability for each product (checking total quantity)
      for (const [productId, totalQuantity] of productQuantities.entries()) {
        const product = products.find((p) => p.id === productId);
        if (!product) {
          throw new NotFoundException(`Product not found: ${productId}`);
        }

        // Check stock availability
        if (product.stock < totalQuantity) {
          throw new BadRequestException(
            `Insufficient stock for product ${product.name}. Available: ${product.stock}, Requested: ${totalQuantity}`,
          );
        }
      }

      // Build invoice items (one per request item) and calculate totals
      const invoiceItems: Array<{
        productId: string;
        quantity: number;
        unitPrice: Prisma.Decimal;
      }> = [];
      let totalAmount = new Prisma.Decimal(0);

      for (const item of items) {
        const product = products.find((p) => p.id === item.productId);
        if (!product) {
          throw new NotFoundException(`Product not found: ${item.productId}`);
        }

        // Calculate item total and add to invoice total
        const itemTotal = product.price.mul(item.quantity);
        totalAmount = totalAmount.add(itemTotal);

        invoiceItems.push({
          productId: product.id,
          quantity: item.quantity,
          unitPrice: product.price,
        });
      }

      // Create invoice with items
      // NOTE: DRAFT invoices do NOT affect stock
      // Stock will be decremented only when invoice is ISSUED
      const invoice = await tx.invoice.create({
        data: {
          storeId,
          createdBy,
          customerId,
          status,
          totalAmount,
          items: {
            create: invoiceItems,
          },
        },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                },
              },
            },
          },
          customer: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // DRAFT invoices: NO stock decrement
      // Stock will be decremented when invoice is ISSUED (in issue() method)

      return invoice;
    });
  }

  /**
   * Update Draft Invoice
   *
   * Allows modification of DRAFT invoices only.
   * Once an invoice is ISSUED, it cannot be modified.
   *
   * Allowed modifications:
   * - Change customerId
   * - Change items (add, remove, modify)
   * - Recalculate totalAmount
   *
   * Forbidden:
   * - Modifying non-DRAFT invoices
   * - Changing storeId or createdBy
   *
   * Permission Rules:
   * - Same operator who created it, OR
   * - Store manager (conceptual - not technical role yet)
   */
  async updateDraft(
    invoiceId: string,
    updateInvoiceDto: UpdateInvoiceDto,
    operatorContext: OperatorContextDto,
  ) {
    // Fetch the invoice first to validate it exists and check its status
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        items: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${invoiceId} not found`);
    }

    // S3: Enforce store ownership at service layer (defense in depth)
    // This validation runs even if StoreScopeGuard is bypassed
    this.enforceStoreOwnership(
      invoice.storeId,
      operatorContext.storeId,
      'update draft invoice',
      invoiceId,
    );

    // Business Rule: Only DRAFT invoices can be modified
    if (!InvoiceStateTransitions.canModify(invoice.status)) {
      throw new BadRequestException(
        `Invoice ${invoiceId} has status ${invoice.status} and cannot be modified. Only DRAFT invoices can be modified.`,
      );
    }

    // Permission: Same operator who created it, OR store manager
    // For v1: Allow if same operator (store manager logic comes later)
    if (invoice.createdBy !== operatorContext.operatorId) {
      throw new ForbiddenException(
        `Invoice ${invoiceId} can only be modified by the operator who created it (${invoice.createdBy}) or a store manager. ` +
          `Current operator: ${operatorContext.operatorId}`,
      );
    }

    // Use transaction to ensure all operations succeed or fail together
    return await this.prisma.$transaction(async (tx) => {
      const updateData: any = {};

      // Update customerId if provided
      if (updateInvoiceDto.customerId !== undefined) {
        updateData.customerId = updateInvoiceDto.customerId;
      }

      // Update items if provided
      if (updateInvoiceDto.items !== undefined) {
        // Validate items array is not empty
        if (updateInvoiceDto.items.length === 0) {
          throw new BadRequestException(
            'Invoice must have at least one item. Cannot update invoice with empty items array.',
          );
        }

        // Fetch all products with their current prices and stock
        const productIds = updateInvoiceDto.items.map((item) => item.productId);
        const products = await tx.product.findMany({
          where: {
            id: { in: productIds },
            storeId: invoice.storeId,
          },
        });

        // Validate all products exist and belong to the store
        if (products.length !== productIds.length) {
          const foundIds = products.map((p) => p.id);
          const missingIds = productIds.filter((id) => !foundIds.includes(id));
          throw new NotFoundException(
            `Products not found or do not belong to store: ${missingIds.join(', ')}`,
          );
        }

        // Aggregate quantities per product for stock validation
        const productQuantities = new Map<string, number>();
        for (const item of updateInvoiceDto.items) {
          const currentQty = productQuantities.get(item.productId) || 0;
          productQuantities.set(item.productId, currentQty + item.quantity);
        }

        // Validate stock availability (for DRAFT, we check but don't decrement)
        for (const [productId, totalQuantity] of productQuantities.entries()) {
          const product = products.find((p) => p.id === productId);
          if (!product) {
            throw new NotFoundException(`Product not found: ${productId}`);
          }

          // Check stock availability (informational only for DRAFT)
          if (product.stock < totalQuantity) {
            throw new BadRequestException(
              `Insufficient stock for product ${product.name}. Available: ${product.stock}, Requested: ${totalQuantity}`,
            );
          }
        }

        // Calculate new total amount
        let totalAmount = new Prisma.Decimal(0);
        const invoiceItems: Array<{
          productId: string;
          quantity: number;
          unitPrice: Prisma.Decimal;
        }> = [];

        for (const item of updateInvoiceDto.items) {
          const product = products.find((p) => p.id === item.productId);
          if (!product) {
            throw new NotFoundException(`Product not found: ${item.productId}`);
          }

          const itemTotal = product.price.mul(item.quantity);
          totalAmount = totalAmount.add(itemTotal);

          invoiceItems.push({
            productId: product.id,
            quantity: item.quantity,
            unitPrice: product.price,
          });
        }

        updateData.totalAmount = totalAmount;

        // Delete existing items and create new ones
        await tx.invoiceItem.deleteMany({
          where: { invoiceId: invoiceId },
        });

        updateData.items = {
          create: invoiceItems,
        };
      }

      // Update invoice
      const updatedInvoice = await tx.invoice.update({
        where: { id: invoiceId },
        data: updateData,
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                },
              },
            },
          },
          customer: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return updatedInvoice;
    });
  }

  /**
   * Issue Invoice - The Critical Point
   *
   * This is the most dangerous operation in the entire system.
   * It's the moment when an invoice transitions from "malleable data"
   * to a binding business and legal commitment.
   *
   * Business Rules (MANDATORY):
   * 1. Cannot issue invoice without items
   * 2. Cannot issue invoice with totalAmount = 0
   * 3. Cannot issue invoice twice
   * 4. Cannot issue cancelled invoice
   * 5. Issue is an atomic transaction
   * 6. Operator must belong to invoice's store
   *
   * What happens during Issue:
   * - State change: DRAFT → ISSUED → (UNPAID or PAID)
   * - Data freeze: Prices, quantities, totals, customer are frozen
   * - Financial path determination:
   *   - If no customerId: ISSUED → PAID (cash/immediate)
   *   - If customerId exists: ISSUED → UNPAID (credit/deferred)
   * - Stock decrement: Products stock is decremented
   * - Attribution: issuedByUserId is recorded
   */
  async issue(invoiceId: string, issueDto: IssueInvoiceDto) {
    // Use transaction to ensure atomicity
    return await this.prisma.$transaction(async (tx) => {
      // Fetch the invoice with all necessary data
      const invoice = await tx.invoice.findUnique({
        where: { id: invoiceId },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                  stock: true,
                },
              },
            },
          },
        },
      });

      if (!invoice) {
        throw new NotFoundException(`Invoice with ID ${invoiceId} not found`);
      }

      // S3: Enforce store ownership at service layer (defense in depth)
      // This validation runs even if StoreScopeGuard is bypassed
      this.enforceStoreOwnership(
        invoice.storeId,
        issueDto.storeId,
        'issue invoice',
        invoiceId,
      );

      // Business Rule 1: Cannot issue invoice without items
      if (!invoice.items || invoice.items.length === 0) {
        throw new BadRequestException(
          `Invoice ${invoiceId} cannot be issued: invoice has no items. An invoice must have at least one item before it can be issued.`,
        );
      }

      // Business Rule 2: Cannot issue invoice with totalAmount = 0
      if (Number(invoice.totalAmount) <= 0) {
        throw new BadRequestException(
          `Invoice ${invoiceId} cannot be issued: total amount is ${invoice.totalAmount}. Invoice total must be greater than zero.`,
        );
      }

      // Business Rule 3 & 4: Validate state transition
      if (!InvoiceStateTransitions.canIssue(invoice.status)) {
        throw new BadRequestException(
          `Invoice ${invoiceId} has status ${invoice.status} and cannot be issued. Only DRAFT invoices can be issued.`,
        );
      }

      // Validate the transition
      InvoiceStateTransitions.validateTransition(
        invoice.status,
        InvoiceStatus.ISSUED,
        invoiceId,
      );

      // Determine final state after ISSUED based on paymentType:
      // - CASH → PAID (immediate payment)
      // - CREDIT → UNPAID (deferred payment)
      // This rule is final and non-negotiable
      const finalStatus: InvoiceStatus =
        issueDto.paymentType === PaymentType.CASH
          ? InvoiceStatus.PAID
          : InvoiceStatus.UNPAID;

      // Validate the final transition
      InvoiceStateTransitions.validateTransition(
        InvoiceStatus.ISSUED,
        finalStatus,
        invoiceId,
      );

      // Aggregate quantities per product for stock validation
      const productQuantities = new Map<string, number>();
      for (const item of invoice.items) {
        const currentQty = productQuantities.get(item.productId) || 0;
        productQuantities.set(item.productId, currentQty + item.quantity);
      }

      // Validate stock availability BEFORE decrementing
      // This is critical: we check stock at issue time, not at draft creation time
      for (const [productId, totalQuantity] of productQuantities.entries()) {
        const item = invoice.items.find((i) => i.productId === productId);
        if (!item) {
          throw new NotFoundException(`Product not found in invoice: ${productId}`);
        }

        const product = item.product;
        if (product.stock < totalQuantity) {
          throw new BadRequestException(
            `Cannot issue invoice ${invoiceId}: Insufficient stock for product ${product.name}. Available: ${product.stock}, Required: ${totalQuantity}`,
          );
        }
      }

      // Decrement stock for all products (atomic operation)
      for (const [productId, totalQuantity] of productQuantities.entries()) {
        await tx.product.update({
          where: { id: productId },
          data: {
            stock: {
              decrement: totalQuantity,
            },
          },
        });
      }

      // Update invoice status: DRAFT → ISSUED → (UNPAID or PAID)
      // Data is now frozen: prices, quantities, totals, customer cannot be changed
      // Attribution: Record who issued this invoice
      // paymentType: Record the payment type at issue time
      const updatedInvoice = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          status: finalStatus,
          paymentType: issueDto.paymentType,
          issuedByUserId: issueDto.operatorId,
        },
        select: {
          id: true,
          status: true,
          paymentType: true,
          totalAmount: true,
          customerId: true,
          issuedByUserId: true,
        },
      });

      // E2: Create Payment record for CASH payments at issue time
      // Payment is created in the same transaction as invoice update
      // This ensures atomicity: if payment creation fails, invoice update is rolled back
      if (issueDto.paymentType === PaymentType.CASH) {
        await tx.payment.create({
          data: {
            storeId: invoice.storeId,
            invoiceId: invoiceId,
            amount: invoice.totalAmount,
            method: PaymentType.CASH,
          },
        });
      }

      // F3: Guard against duplicate SALE ledger entry
      // This check runs inside the same transaction before ledger creation
      // If a SALE entry already exists, the entire transaction is aborted
      // This ensures idempotency: retries are safe, duplicates are impossible
      await LedgerGuard.ensureNoSaleEntry(tx, invoiceId, invoice.storeId);

      // F2: Create LedgerEntry (SALE) when invoice is issued
      // Ledger entry is created in the same transaction as invoice update
      // This ensures atomicity: if ledger creation fails, invoice update is rolled back
      // Ledger entry reflects the financial event: invoice sale occurred
      await tx.ledgerEntry.create({
        data: {
          storeId: invoice.storeId,
          invoiceId: invoiceId,
          type: LedgerEntryType.SALE,
          amount: invoice.totalAmount,
        },
      });

      return {
        invoiceId: updatedInvoice.id,
        previousStatus: invoice.status,
        currentStatus: updatedInvoice.status,
        paymentType: updatedInvoice.paymentType,
        totalAmount: Number(updatedInvoice.totalAmount),
        customerId: updatedInvoice.customerId,
        issuedAt: new Date().toISOString(),
        message:
          updatedInvoice.status === InvoiceStatus.PAID
            ? 'Invoice issued and marked as PAID (CASH payment)'
            : 'Invoice issued and marked as UNPAID (CREDIT payment)',
      };
    });
  }

  /**
   * Settle Invoice
   *
   * Permission: Store manager only (conceptual - not technical role yet)
   * Attribution: settledByUserId is recorded
   */
  async settle(invoiceId: string, operatorContext: OperatorContextDto) {
    // Use transaction to ensure atomicity
    return await this.prisma.$transaction(async (tx) => {
      // Fetch the invoice first to validate it exists and check its status
      const invoice = await tx.invoice.findUnique({
        where: { id: invoiceId },
        select: {
          id: true,
          status: true,
          storeId: true,
          totalAmount: true,
          paymentType: true,
        },
      });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${invoiceId} not found`);
    }

      // S3: Enforce store ownership at service layer (defense in depth)
      // This validation runs even if StoreScopeGuard is bypassed
      this.enforceStoreOwnership(
        invoice.storeId,
        operatorContext.storeId,
        'settle invoice',
        invoiceId,
      );

      // Permission: Store manager only (for v1, we allow any operator in the store)
      // TODO: Add store manager role check in future

      // Validate transition: Only UNPAID can be settled
      if (!InvoiceStateTransitions.canSettle(invoice.status)) {
        throw new BadRequestException(
          `Invoice ${invoiceId} has status ${invoice.status} and cannot be settled. Only UNPAID invoices can be settled.`,
        );
      }

      // Validate the transition
      InvoiceStateTransitions.validateTransition(
        invoice.status,
        InvoiceStatus.PAID,
        invoiceId,
      );

      // Store previous status before update
      const previousStatus = invoice.status;

      // Update invoice status from UNPAID to PAID
      // Attribution: Record who settled this invoice
      const updatedInvoice = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          status: InvoiceStatus.PAID,
          settledByUserId: operatorContext.operatorId,
        },
        select: {
          id: true,
          status: true,
          totalAmount: true,
          paymentType: true,
          settledByUserId: true,
        },
      });

      // E2: Create Payment record for CREDIT payments at settle time
      // Payment is created in the same transaction as invoice update
      // This ensures atomicity: if payment creation fails, invoice update is rolled back
      // Only create payment if invoice was CREDIT (paymentType should be CREDIT for UNPAID invoices)
      if (invoice.paymentType === PaymentType.CREDIT) {
        await tx.payment.create({
          data: {
            storeId: invoice.storeId,
            invoiceId: invoiceId,
            amount: invoice.totalAmount,
            method: PaymentType.CREDIT,
          },
        });
      }

      // F3: Guard against duplicate RECEIPT ledger entry
      // This check runs inside the same transaction before ledger creation
      // If a RECEIPT entry already exists, the entire transaction is aborted
      // This ensures idempotency: retries are safe, duplicates are impossible
      await LedgerGuard.ensureNoReceiptEntry(tx, invoiceId, invoice.storeId);

      // F2: Create LedgerEntry (RECEIPT) when invoice is settled
      // Ledger entry is created in the same transaction as invoice update
      // This ensures atomicity: if ledger creation fails, invoice update is rolled back
      // Ledger entry reflects the financial event: payment received for invoice
      await tx.ledgerEntry.create({
        data: {
          storeId: invoice.storeId,
          invoiceId: invoiceId,
          type: LedgerEntryType.RECEIPT,
          amount: invoice.totalAmount,
        },
      });

      // Return settlement response
      return {
        invoiceId: updatedInvoice.id,
        previousStatus: previousStatus,
        currentStatus: updatedInvoice.status,
        settledAt: new Date().toISOString(),
      };
    });
  }

  /**
   * Cancel Invoice
   *
   * Permission: Store manager only (conceptual - not technical role yet)
   * Attribution: cancelledByUserId is recorded
   */
  async cancel(invoiceId: string, operatorContext: OperatorContextDto) {
    // Fetch the invoice first to validate it exists and check its status
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        id: true,
        status: true,
        storeId: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${invoiceId} not found`);
    }

    // S3: Enforce store ownership at service layer (defense in depth)
    // This validation runs even if StoreScopeGuard is bypassed
    this.enforceStoreOwnership(
      invoice.storeId,
      operatorContext.storeId,
      'cancel invoice',
      invoiceId,
    );

    // Permission: Store manager only (for v1, we allow any operator in the store)
    // TODO: Add store manager role check in future

    // Validate transition: Only DRAFT or ISSUED can be cancelled
    if (!InvoiceStateTransitions.canCancel(invoice.status)) {
      throw new BadRequestException(
        `Invoice ${invoiceId} has status ${invoice.status} and cannot be cancelled. Only DRAFT or ISSUED invoices can be cancelled.`,
      );
    }

    // Validate the transition
    InvoiceStateTransitions.validateTransition(
      invoice.status,
      InvoiceStatus.CANCELLED,
      invoiceId,
    );

    // Store previous status before update
    const previousStatus = invoice.status;

    // Update invoice status to CANCELLED
    // Attribution: Record who cancelled this invoice
    const updatedInvoice = await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: InvoiceStatus.CANCELLED,
        cancelledByUserId: operatorContext.operatorId,
      },
      select: {
        id: true,
        status: true,
        cancelledByUserId: true,
      },
    });

    return {
      invoiceId: updatedInvoice.id,
      previousStatus: previousStatus,
      currentStatus: updatedInvoice.status,
      cancelledAt: new Date().toISOString(),
    };
  }
}

