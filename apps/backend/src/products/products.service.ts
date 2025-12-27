import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get All Products
   *
   * Read-only method to fetch all products for a store.
   * No business logic, no side effects, no mutations.
   *
   * @param storeId - Store ID (from AuthContext via StoreScopeGuard)
   * @returns Array of products with minimal fields
   */
  async findAll(storeId: string) {
    const products = await this.prisma.product.findMany({
      where: {
        storeId,
      },
      select: {
        id: true,
        name: true,
        price: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Transform to response shape
    return products.map((product) => ({
      id: product.id,
      name: product.name,
      price: product.price.toString(),
    }));
  }
}

