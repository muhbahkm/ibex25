import {
  Controller,
  Post,
  Put,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { OperatorContextDto } from './dto/operator-context.dto';
import { IssueInvoiceDto } from './dto/issue-invoice.dto';
import { StoreScopeGuard } from '../core/store-scope.guard';
import { PlanLimitGuard } from '../billing/guards/plan-limit.guard';
import { BillingStatusGuard } from '../billing/guards/billing-status.guard';
import { RateLimitGuard } from '../core/operational/guards/rate-limit.guard';
import { WriteThrottleGuard } from '../core/operational/guards/write-throttle.guard';

/**
 * Invoices Controller
 *
 * S3: Protected with StoreScopeGuard to enforce tenant isolation at controller level.
 * Additional enforcement exists at service layer (defense in depth).
 * B1: PlanLimitGuard applied to issue endpoint for soft enforcement.
 * B3: BillingStatusGuard applied to issue endpoint for billing status enforcement.
 * C1: RateLimitGuard and WriteThrottleGuard applied for operational safety.
 */
@UseGuards(StoreScopeGuard, RateLimitGuard)
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  /**
   * Get All Invoices
   * GET /invoices
   *
   * Returns all invoices for the current store.
   * Read-only endpoint - no mutations, no side effects.
   *
   * Security:
   * - Store-scoped using AuthContext.storeId (via StoreScopeGuard)
   * - Requires VIEW_REPORTS permission (enforced in frontend)
   *
   * Response:
   * {
   *   success: true,
   *   data: [
   *     {
   *       id: string,
   *       customerName: string | null,
   *       totalAmount: string,
   *       status: "DRAFT" | "ISSUED" | "UNPAID" | "PAID" | "CANCELLED",
   *       createdAt: string
   *     }
   *   ]
   * }
   */
  @Get()
  async findAll(@Req() request: Request) {
    const storeId = request['storeId'] as string;
    return this.invoicesService.findAll(storeId);
  }

  /**
   * Get Single Invoice
   * GET /invoices/:id
   *
   * Returns a single invoice by ID for the current store.
   * Read-only endpoint - no mutations, no side effects.
   *
   * Security:
   * - Store-scoped using AuthContext.storeId (via StoreScopeGuard)
   * - Requires VIEW_REPORTS permission (enforced in frontend)
   *
   * Response:
   * {
   *   success: true,
   *   data: {
   *     id: string,
   *     customerId: string | null,
   *     customerName: string | null,
   *     status: "DRAFT" | "ISSUED" | "UNPAID" | "PAID" | "CANCELLED",
   *     totalAmount: string,
   *     createdAt: string,
   *     items: Array<{
   *       id: string,
   *       productId: string,
   *       productName: string,
   *       quantity: number,
   *       unitPrice: string
   *     }>
   *   }
   * }
   */
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() request: Request) {
    const storeId = request['storeId'] as string;
    return this.invoicesService.findOne(id, storeId);
  }

  /**
   * Create Draft Invoice
   * POST /invoices
   *
   * Creates a new invoice with status DRAFT.
   * DRAFT invoices have no financial impact and can be modified.
   *
   * Requires operatorContext in request body:
   * {
   *   ...createInvoiceDto,
   *   operatorContext: { operatorId, storeId }
   * }
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() body: CreateInvoiceDto & { operatorContext: OperatorContextDto },
  ) {
    const { operatorContext, ...createInvoiceDto } = body;
    return this.invoicesService.create(createInvoiceDto, operatorContext);
  }

  /**
   * Update Draft Invoice
   * PUT /invoices/:id/draft
   *
   * Updates a DRAFT invoice only.
   * Once an invoice is ISSUED, it cannot be modified.
   *
   * Permission: Same operator who created it, OR store manager
   *
   * Requires operatorContext in request body.
   */
  @Put(':invoiceId/draft')
  @HttpCode(HttpStatus.OK)
  async updateDraft(
    @Param('invoiceId') invoiceId: string,
    @Body() body: UpdateInvoiceDto & { operatorContext: OperatorContextDto },
  ) {
    const { operatorContext, ...updateInvoiceDto } = body;
    return this.invoicesService.updateDraft(
      invoiceId,
      updateInvoiceDto,
      operatorContext,
    );
  }

  /**
   * Issue Invoice - THE CRITICAL ENDPOINT
   * POST /invoices/:id/issue
   *
   * This is the most dangerous endpoint in the entire system.
   * It's the moment when an invoice transitions from "malleable data"
   * to a binding business and legal commitment.
   *
   * Business Rules:
   * - Cannot issue invoice without items
   * - Cannot issue invoice with totalAmount = 0
   * - Cannot issue invoice twice
   * - Cannot issue cancelled invoice
   * - Issue is an atomic transaction
   * - Operator must belong to invoice's store
   *
   * B1: Protected with PlanLimitGuard for soft enforcement of plan limits.
   * B3: Protected with BillingStatusGuard to enforce billing account status.
   * C1: Protected with WriteThrottleGuard for write operation throttling.
   *
   * Requires operatorContext in request body.
   */
  @UseGuards(PlanLimitGuard, BillingStatusGuard, WriteThrottleGuard)
  @Post(':invoiceId/issue')
  @HttpCode(HttpStatus.OK)
  async issue(
    @Param('invoiceId') invoiceId: string,
    @Body() issueDto: IssueInvoiceDto,
  ) {
    return this.invoicesService.issue(invoiceId, issueDto);
  }

  /**
   * Settle Invoice
   * POST /invoices/:id/settle
   *
   * Permission: Store manager only (conceptual - not technical role yet)
   * Attribution: settledByUserId is recorded
   * C1: Protected with WriteThrottleGuard for write operation throttling.
   *
   * Requires operatorContext in request body.
   */
  @UseGuards(WriteThrottleGuard)
  @Post(':invoiceId/settle')
  @HttpCode(HttpStatus.OK)
  async settle(
    @Param('invoiceId') invoiceId: string,
    @Body() operatorContext: OperatorContextDto,
  ) {
    return this.invoicesService.settle(invoiceId, operatorContext);
  }

  /**
   * Cancel Invoice
   * POST /invoices/:id/cancel
   *
   * Permission: Store manager only (conceptual - not technical role yet)
   * Attribution: cancelledByUserId is recorded
   * C1: Protected with WriteThrottleGuard for write operation throttling.
   *
   * Requires operatorContext in request body.
   */
  @UseGuards(WriteThrottleGuard)
  @Post(':invoiceId/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(
    @Param('invoiceId') invoiceId: string,
    @Body() operatorContext: OperatorContextDto,
  ) {
    return this.invoicesService.cancel(invoiceId, operatorContext);
  }
}
