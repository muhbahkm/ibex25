import { IsUUID } from 'class-validator';

/**
 * Operator Context DTO
 *
 * Represents the operator (user) performing an operation and their store context.
 * This is passed explicitly in every financial operation request.
 *
 * This is a temporary solution before full Auth system is implemented.
 * It enforces discipline and prevents "anyone can do anything" logic.
 */
export class OperatorContextDto {
  @IsUUID()
  operatorId: string;

  @IsUUID()
  storeId: string;
}

