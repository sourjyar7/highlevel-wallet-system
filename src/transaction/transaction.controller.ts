import { Controller, Post, Body, Param, Get, Query, Res, Delete } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { TransactDto } from './dto/transact.dto';
import { Response } from 'express';

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

  @Get('transactions/export')
  async exportTransactions(
    @Query('walletId') walletId: string,
    @Res() res: Response
  ) {
    const transactions = await this.transactionService.getAllTransactions(walletId);
    const csv = this.transactionService.convertToCSV(transactions);
    
    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', 'attachment; filename=transactions.csv');
    return res.send(csv);
  }

  @Delete('transactions/:id')
  deleteTransaction(@Param('id') id: string) {
    return this.transactionService.deleteTransaction(id);
  }

  @Delete('transactions/wallet/:walletId')
  deleteAllTransactions(@Param('walletId') walletId: string) {
    return this.transactionService.deleteAllTransactions(walletId);
  }
}