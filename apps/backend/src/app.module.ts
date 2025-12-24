import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { InvoicesModule } from './invoices/invoices.module';
import { CustomersModule } from './customers/customers.module';
import { PrismaService } from './prisma.service';

@Module({
  imports: [InvoicesModule, CustomersModule],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}

