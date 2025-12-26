import { IsUUID, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateInvoiceItemDto } from './create-invoice-item.dto';

/**
 * Update Invoice DTO
 *
 * Used ONLY for updating DRAFT invoices.
 * Once an invoice is ISSUED, it cannot be modified.
 */
export class UpdateInvoiceDto {
  @IsUUID()
  @IsOptional()
  customerId?: string | null;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceItemDto)
  @IsOptional()
  items?: CreateInvoiceItemDto[];
}
