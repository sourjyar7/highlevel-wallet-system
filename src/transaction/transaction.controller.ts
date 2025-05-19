import { Controller, Post, Body, Param, Get, Query } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { TransactDto } from './dto/transact.dto';

@Controller()
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post('transact/:walletId')
  transact(@Param('walletId') walletId: string, @Body() dto: TransactDto) {
    return this.transactionService.transact(walletId, dto);
  }

  @Get('transactions')
  getTransactions(
    @Query('walletId') walletId: string,
    @Query('skip') skip = '0',
    @Query('limit') limit = '10'
  ) {
    return this.transactionService.getTransactions(walletId, parseInt(skip), parseInt(limit));
  }
}