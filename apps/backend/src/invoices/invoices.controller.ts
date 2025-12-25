import {
  Controller,
  Post,
  Put,
  Body,
  HttpCode,
  HttpStatus,
  Param,
} from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { OperatorContextDto } from './dto/operator-context.dto';
import { IssueInvoiceDto } from './dto/issue-invoice.dto';

@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

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
   * Requires operatorContext in request body.
   */
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
   *
   * Requires operatorContext in request body.
   */
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
   *
   * Requires operatorContext in request body.
   */
  @Post(':invoiceId/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(
    @Param('invoiceId') invoiceId: string,
    @Body() operatorContext: OperatorContextDto,
  ) {
    return this.invoicesService.cancel(invoiceId, operatorContext);
  }
}

