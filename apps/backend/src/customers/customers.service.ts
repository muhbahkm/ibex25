import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { InvoiceStatus } from '@prisma/client';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const customers = await this.prisma.customer.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        name: true,
        isGuest: true,
        store: {
          select: {
            name: true,
          },
        },
      },
    });

    return customers.map((customer) => ({
      id: customer.id,
      name: customer.name,
      isGuest: customer.isGuest,
      storeName: customer.store.name,
    }));
  }

  async getStatement(customerId: string) {
    // Fetch customer with invoices
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        invoices: {
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
            creator: {
              select: {
                id: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        store: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${customerId} not found`);
    }

    // Calculate totals
    const unpaidInvoices = customer.invoices.filter(
      (invoice) => invoice.status === InvoiceStatus.UNPAID,
    );
    const paidInvoices = customer.invoices.filter(
      (invoice) => invoice.status === InvoiceStatus.PAID,
    );
    const cancelledInvoices = customer.invoices.filter(
      (invoice) => invoice.status === InvoiceStatus.CANCELLED,
    );

    // Calculate outstanding balance (sum of unpaid invoices)
    const outstandingBalance = unpaidInvoices.reduce(
      (sum, invoice) => sum + Number(invoice.totalAmount),
      0,
    );

    // Calculate total sales (sum of paid invoices)
    const totalSales = paidInvoices.reduce(
      (sum, invoice) => sum + Number(invoice.totalAmount),
      0,
    );

    // Calculate total amount (all invoices)
    const totalAmount = customer.invoices.reduce(
      (sum, invoice) => sum + Number(invoice.totalAmount),
      0,
    );

    return {
      customer: {
        id: customer.id,
        name: customer.name,
        isGuest: customer.isGuest,
        createdAt: customer.createdAt,
        store: customer.store,
      },
      summary: {
        totalInvoices: customer.invoices.length,
        unpaidInvoices: unpaidInvoices.length,
        paidInvoices: paidInvoices.length,
        cancelledInvoices: cancelledInvoices.length,
        outstandingBalance,
        totalSales,
        totalAmount,
      },
      invoices: customer.invoices.map((invoice) => ({
        id: invoice.id,
        status: invoice.status,
        totalAmount: Number(invoice.totalAmount),
        createdAt: invoice.createdAt,
        createdBy: invoice.creator,
        items: invoice.items.map((item) => ({
          id: item.id,
          product: item.product,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          subtotal: Number(item.unitPrice) * item.quantity,
        })),
      })),
    };
  }
}

