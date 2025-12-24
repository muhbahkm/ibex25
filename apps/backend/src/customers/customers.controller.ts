import { Controller, Get, Param } from '@nestjs/common';
import { CustomersService } from './customers.service';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  async findAll() {
    return this.customersService.findAll();
  }

  @Get(':customerId/statement')
  async getStatement(@Param('customerId') customerId: string) {
    return this.customersService.getStatement(customerId);
  }
}

