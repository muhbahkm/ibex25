import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { Prisma, InvoiceStatus } from '@prisma/client';

@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaService) {}

  async create(createInvoiceDto: CreateInvoiceDto) {
    const { storeId, createdBy, customerId, items } = createInvoiceDto;

    // Determine invoice status based on customerId
    const status: InvoiceStatus = customerId === null ? InvoiceStatus.PAID : InvoiceStatus.UNPAID;

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

      // Update product stock for all unique products
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

      return invoice;
    });
  }

  async settle(invoiceId: string) {
    // Fetch the invoice first to validate it exists and check its status
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        id: true,
        status: true,
      },
    });

    // Invoice not found
    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${invoiceId} not found`);
    }

    // Invoice already PAID
    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException(
        `Invoice ${invoiceId} is already PAID and cannot be settled again`,
      );
    }

    // Invoice is CANCELLED
    if (invoice.status === InvoiceStatus.CANCELLED) {
      throw new BadRequestException(
        `Invoice ${invoiceId} is CANCELLED and cannot be settled`,
      );
    }

    // Only UNPAID invoices can be settled
    if (invoice.status !== InvoiceStatus.UNPAID) {
      throw new BadRequestException(
        `Invoice ${invoiceId} has status ${invoice.status} and cannot be settled. Only UNPAID invoices can be settled`,
      );
    }

    // Store previous status before update
    const previousStatus = invoice.status;

    // Update invoice status from UNPAID to PAID
    const updatedInvoice = await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: InvoiceStatus.PAID,
      },
      select: {
        id: true,
        status: true,
      },
    });

    // Return settlement response
    return {
      invoiceId: updatedInvoice.id,
      previousStatus: previousStatus,
      currentStatus: updatedInvoice.status,
      settledAt: new Date().toISOString(),
    };
  }
}

