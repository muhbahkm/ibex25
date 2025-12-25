import { IsEnum, IsUUID } from 'class-validator';
import { PaymentType } from '@prisma/client';
import { OperatorContextDto } from './operator-context.dto';

/**
 * Issue Invoice DTO
 *
 * Used for the POST /invoices/:id/issue endpoint.
 * Requires paymentType to be explicitly provided at issue time.
 *
 * Rules:
 * - CASH → invoice ends as PAID
 * - CREDIT → invoice ends as UNPAID
 */
export class IssueInvoiceDto extends OperatorContextDto {
  @IsEnum(PaymentType, {
    message: 'paymentType must be either CASH or CREDIT',
  })
  paymentType: PaymentType;
}

