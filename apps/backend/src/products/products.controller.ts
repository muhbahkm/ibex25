import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { ProductsService } from './products.service';
import { StoreScopeGuard } from '../core/store-scope.guard';
import { RateLimitGuard } from '../core/operational/guards/rate-limit.guard';

/**
 * Products Controller
 *
 * Provides read-only access to products.
 * S3: Protected with StoreScopeGuard to enforce tenant isolation.
 * C1: Protected with RateLimitGuard for operational safety.
 */
@UseGuards(StoreScopeGuard, RateLimitGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  /**
   * Get All Products
   * GET /products
   *
   * Returns all products for the current store.
   * Read-only endpoint - no mutations, no side effects.
   *
   * Security:
   * - Store-scoped using AuthContext.storeId (via StoreScopeGuard)
   *
   * Response:
   * {
   *   success: true,
   *   data: [
   *     {
   *       id: string,
   *       name: string,
   *       price: string
   *     }
   *   ]
   * }
   */
  @Get()
  async findAll(@Req() request: Request) {
    const storeId = request['storeId'] as string;
    return this.productsService.findAll(storeId);
  }
}

