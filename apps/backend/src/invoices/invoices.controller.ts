import { Controller, Post, Body, HttpCode, HttpStatus, Param } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';

@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createInvoiceDto: CreateInvoiceDto) {
    return this.invoicesService.create(createInvoiceDto);
  }

  @Post(':invoiceId/settle')
  @HttpCode(HttpStatus.OK)
  async settle(@Param('invoiceId') invoiceId: string) {
    return this.invoicesService.settle(invoiceId);
  }
}

