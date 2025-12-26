import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { InvoicesModule } from './invoices/invoices.module';
import { CustomersModule } from './customers/customers.module';
import { LedgerModule } from './ledger/ledger.module';
import { BillingModule } from './billing/billing.module';
import { StripeModule } from './billing/stripe/stripe.module';
import { UsageModule } from './usage/usage.module';
import { ProductsModule } from './products/products.module';
import { PrismaService } from './prisma.service';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';

@Module({
  imports: [
    InvoicesModule,
    CustomersModule,
    LedgerModule,
    BillingModule,
    StripeModule, // B4: Stripe integration
    UsageModule,
    ProductsModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply Request ID middleware to all routes
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
