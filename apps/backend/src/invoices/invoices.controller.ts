import {
  Controller,
  Post,
  Put,
  Body,
  HttpCode,
  HttpStatus,
  Param,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { OperatorContextDto } from './dto/operator-context.dto';
import { IssueInvoiceDto } from './dto/issue-invoice.dto';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionsGuard, RequirePermissions } from '../auth/permissions.guard';
import { Permission } from '../auth/permissions.enum';
import { AuthContext } from '../auth/auth-context.interface';

@Controller('invoices')
@UseGuards(AuthGuard)
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
   * Security:
   * - Requires ISSUE_INVOICE permission
   * - AuthContext extracted from headers (x-user-id, x-store-id, x-role)
   * - OperatorContextDto still accepted for backward compatibility
   */
  @Post(':invoiceId/issue')
  @HttpCode(HttpStatus.OK)
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.ISSUE_INVOICE)
  async issue(
    @Param('invoiceId') invoiceId: string,
    @Body() issueDto: IssueInvoiceDto,
    @Req() request: Request & { auth?: AuthContext },
  ) {
    // Bridge: Extract AuthContext from request (set by AuthGuard)
    const authContext = request.auth;
    if (!authContext) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'AUTH_CONTEXT_MISSING',
          message: 'Authentication context is missing. AuthGuard must be applied.',
        },
      });
    }

    // Bridge: Validate AuthContext matches OperatorContextDto (if provided)
    // Use AuthContext as source of truth, but validate consistency
    if (issueDto.operatorId && issueDto.operatorId !== authContext.userId) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'OPERATOR_ID_MISMATCH',
          message: `Operator ID mismatch. Header x-user-id (${authContext.userId}) does not match body operatorId (${issueDto.operatorId}).`,
        },
      });
    }

    if (issueDto.storeId && issueDto.storeId !== authContext.storeId) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'STORE_ID_MISMATCH',
          message: `Store ID mismatch. Header x-store-id (${authContext.storeId}) does not match body storeId (${issueDto.storeId}).`,
        },
      });
    }

    // Bridge: Use AuthContext as source of truth, override DTO values
    const validatedIssueDto: IssueInvoiceDto = {
      ...issueDto,
      operatorId: authContext.userId,
      storeId: authContext.storeId,
    };

    return this.invoicesService.issue(invoiceId, validatedIssueDto);
  }

  /**
   * Settle Invoice
   * POST /invoices/:id/settle
   *
   * Security:
   * - Requires SETTLE_INVOICE permission
   * - AuthContext extracted from headers (x-user-id, x-store-id, x-role)
   * - Attribution: settledByUserId is recorded
   * - OperatorContextDto still accepted for backward compatibility
   */
  @Post(':invoiceId/settle')
  @HttpCode(HttpStatus.OK)
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.SETTLE_INVOICE)
  async settle(
    @Param('invoiceId') invoiceId: string,
    @Body() operatorContext: OperatorContextDto,
    @Req() request: Request & { auth?: AuthContext },
  ) {
    // Bridge: Extract AuthContext from request (set by AuthGuard)
    const authContext = request.auth;
    if (!authContext) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'AUTH_CONTEXT_MISSING',
          message: 'Authentication context is missing. AuthGuard must be applied.',
        },
      });
    }

    // Bridge: Validate AuthContext matches OperatorContextDto (if provided)
    // Use AuthContext as source of truth, but validate consistency
    if (operatorContext.operatorId && operatorContext.operatorId !== authContext.userId) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'OPERATOR_ID_MISMATCH',
          message: `Operator ID mismatch. Header x-user-id (${authContext.userId}) does not match body operatorId (${operatorContext.operatorId}).`,
        },
      });
    }

    if (operatorContext.storeId && operatorContext.storeId !== authContext.storeId) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'STORE_ID_MISMATCH',
          message: `Store ID mismatch. Header x-store-id (${authContext.storeId}) does not match body storeId (${operatorContext.storeId}).`,
        },
      });
    }

    // Bridge: Use AuthContext as source of truth, override DTO values
    const validatedOperatorContext: OperatorContextDto = {
      operatorId: authContext.userId,
      storeId: authContext.storeId,
    };

    return this.invoicesService.settle(invoiceId, validatedOperatorContext);
  }

  /**
   * Cancel Invoice
   * POST /invoices/:id/cancel
   *
   * Security:
   * - Requires CANCEL_INVOICE permission
   * - AuthContext extracted from headers (x-user-id, x-store-id, x-role)
   * - Attribution: cancelledByUserId is recorded
   * - OperatorContextDto still accepted for backward compatibility
   */
  @Post(':invoiceId/cancel')
  @HttpCode(HttpStatus.OK)
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.CANCEL_INVOICE)
  async cancel(
    @Param('invoiceId') invoiceId: string,
    @Body() operatorContext: OperatorContextDto,
    @Req() request: Request & { auth?: AuthContext },
  ) {
    // Bridge: Extract AuthContext from request (set by AuthGuard)
    const authContext = request.auth;
    if (!authContext) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'AUTH_CONTEXT_MISSING',
          message: 'Authentication context is missing. AuthGuard must be applied.',
        },
      });
    }

    // Bridge: Validate AuthContext matches OperatorContextDto (if provided)
    // Use AuthContext as source of truth, but validate consistency
    if (operatorContext.operatorId && operatorContext.operatorId !== authContext.userId) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'OPERATOR_ID_MISMATCH',
          message: `Operator ID mismatch. Header x-user-id (${authContext.userId}) does not match body operatorId (${operatorContext.operatorId}).`,
        },
      });
    }

    if (operatorContext.storeId && operatorContext.storeId !== authContext.storeId) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'STORE_ID_MISMATCH',
          message: `Store ID mismatch. Header x-store-id (${authContext.storeId}) does not match body storeId (${operatorContext.storeId}).`,
        },
      });
    }

    // Bridge: Use AuthContext as source of truth, override DTO values
    const validatedOperatorContext: OperatorContextDto = {
      operatorId: authContext.userId,
      storeId: authContext.storeId,
    };

    return this.invoicesService.cancel(invoiceId, validatedOperatorContext);
  }
}

