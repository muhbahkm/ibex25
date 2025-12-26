import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '@prisma/client';

/**
 * Plans Service
 *
 * B1: Manages subscription plan definitions.
 * Plans define limits and features available to stores.
 *
 * ⚠️ FOUNDATION ONLY: No pricing, no billing cycles.
 */
@Injectable()
export class PlansService {
  constructor(private prisma: PrismaService) {}

  /**
   * Find a plan by code
   */
  async findByCode(code: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { code },
    });

    if (!plan) {
      throw new NotFoundException(`Plan with code '${code}' not found`);
    }

    return plan;
  }

  /**
   * Find a plan by ID
   */
  async findById(id: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { id },
    });

    if (!plan) {
      throw new NotFoundException(`Plan with ID '${id}' not found`);
    }

    return plan;
  }

  /**
   * Get all plans
   */
  async findAll() {
    return this.prisma.plan.findMany({
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Create a new plan (for seeding/admin use)
   */
  async create(data: {
    code: string;
    name: string;
    description?: string;
    limits: Prisma.InputJsonValue;
    features: Prisma.InputJsonValue;
  }) {
    return this.prisma.plan.create({
      data,
    });
  }
}
