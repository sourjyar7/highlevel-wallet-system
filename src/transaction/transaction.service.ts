import { Injectable, BadRequestException, NotFoundException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Wallet } from '../wallet/wallet.entity';
import { Transaction } from './transaction.entity';
import { TransactDto } from './dto/transact.dto';
import Decimal from 'decimal.js';
import { WalletNotFoundException, WalletStatusException, InvalidTransactionAmountException, InsufficientBalanceException } from '../common/exceptions/wallet.exception';
import { BaseException } from '../common/exceptions/base.exception';
import { InvalidPaginationParamsException } from '../common/exceptions/wallet.exception';
import { TransactionFailedException } from '../common/exceptions/wallet.exception';
import { DuplicateReferenceIdException } from '../common/exceptions/wallet.exception';

@Injectable()
export class TransactionService {
  constructor(
    @InjectRepository(Wallet) private walletRepo: Repository<Wallet>,
    @InjectRepository(Transaction) private transactionRepo: Repository<Transaction>,
    private dataSource: DataSource
  ) {}

  async transact(walletId: string, dto: TransactDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    
    try {
      // Start transaction
      await queryRunner.connect();
      await queryRunner.startTransaction();

      // First check for existing transaction with explicit query runner
      const existingTransaction = await queryRunner.manager.findOne(Transaction, {
        where: { referenceId: dto.referenceId },
        relations: ['wallet']
      });
      
      if (existingTransaction) {
        // If found, verify it's for the same wallet and amount
        if (existingTransaction.wallet.id !== walletId) {
          throw new DuplicateReferenceIdException(
            `Reference ID ${dto.referenceId} already used for different wallet`
          );
        }
        
        if (existingTransaction.amount !== dto.amount.toString()) {
          throw new DuplicateReferenceIdException(
            `Reference ID ${dto.referenceId} already used with different amount`
          );
        }
        
        // Return the existing transaction result (idempotent response)
        await queryRunner.release();
        return {
          balance: existingTransaction.balance,
          transactionId: existingTransaction.id,
          idempotent: true
        };
      }

      // Proceed with new transaction...
      const wallet = await queryRunner.manager.findOne(Wallet, {
        where: { id: walletId },
        lock: { mode: 'pessimistic_write' },
      });
      
      if (!wallet) {
        throw new WalletNotFoundException(walletId);
      }

      if (wallet.status !== 'ACTIVE') {
        throw new WalletStatusException(wallet.status);
      }

      const oldBalance = new Decimal(wallet.balance);
      const amount = new Decimal(dto.amount);

      if (amount.isZero()) {
        throw new InvalidTransactionAmountException(amount.toString());
      }

      const newBalance = oldBalance.plus(amount);

      if (newBalance.isNegative()) {
        throw new InsufficientBalanceException({
          currentBalance: oldBalance.toString(),
          requestedAmount: amount.toString(),
        });
      }

      // Update wallet
      wallet.balance = newBalance.toFixed(4);
      await queryRunner.manager.save(wallet);

      // Create transaction record
      const transaction = queryRunner.manager.create(Transaction, {
        wallet,
        amount: amount.toFixed(4),
        balance: wallet.balance,
        description: dto.description,
        type: amount.isPositive() ? 'CREDIT' : 'DEBIT',
        referenceId: dto.referenceId,
        metadata: dto.metadata,
        status: 'COMPLETED',
        processedAt: new Date()
      });

      await queryRunner.manager.save(transaction);

      // Commit transaction
      await queryRunner.commitTransaction();

      return {
        balance: wallet.balance,
        transactionId: transaction.id,
        idempotent: false
      };

    } catch (error) {
      // Rollback transaction on any error
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }

      if (error instanceof BaseException) {
        throw error;
      }
      throw new TransactionFailedException(
        'Transaction processing failed',
        { error: error.message }
      );

    } finally {
      // Release query runner
      if (!queryRunner.isReleased) {
        await queryRunner.release();
      }
    }
  }

  async getTransactions(
    walletId: string,
    skip = 0,
    limit = 10,
    sort = 'createdAt',
    order: 'ASC' | 'DESC' = 'DESC'
  ) {
    const [transactions, total] = await this.transactionRepo.findAndCount({
      where: { wallet: { id: walletId } },
      skip,
      take: limit,
      order: { [sort]: order }
    });

    return {
      transactions,
      pagination: { total, skip, limit }
    };
  }

  async getAllTransactions(walletId: string) {
    return await this.transactionRepo.find({
      where: { wallet: { id: walletId } },
      order: { createdAt: 'DESC' }
    });
  }

  convertToCSV(transactions: Transaction[]): string {
    const headers = ['Date', 'Amount', 'Type', 'Description', 'Balance'];
    const rows = transactions.map(tx => [
      new Date(tx.createdAt).toISOString(),
      tx.amount,
      tx.type,
      tx.description,
      tx.balance
    ]);
    
    return [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
  }

  async deleteTransaction(id: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      // First find the transaction without lock
      const transaction = await queryRunner.manager.findOne(Transaction, {
        where: { id },
        relations: ['wallet']
      });

      if (!transaction) {
        throw new BaseException(
          'Transaction not found',
          HttpStatus.NOT_FOUND,
          'TRANSACTION_NOT_FOUND'
        );
      }

      // Then lock the wallet separately
      const wallet = await queryRunner.manager.findOne(Wallet, {
        where: { id: transaction.wallet.id },
        lock: { mode: 'pessimistic_write' }
      });

      if (!wallet) {
        throw new WalletNotFoundException(transaction.wallet.id);
      }

      if (wallet.status !== 'FROZEN') {
        throw new BaseException(
          'Wallet must be frozen before deleting transactions',
          HttpStatus.BAD_REQUEST,
          'WALLET_NOT_FROZEN'
        );
      }

      // Proceed with deletion...
      await queryRunner.manager.remove(transaction);

      await queryRunner.commitTransaction();
      return { message: 'Transaction deleted successfully' };

    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      if (error instanceof BaseException) {
        throw error;
      }
      throw new BaseException(
        'Failed to delete transaction',
        HttpStatus.INTERNAL_SERVER_ERROR,
        'TRANSACTION_DELETE_ERROR',
        { error: error.message }
      );
    } finally {
      if (!queryRunner.isReleased) {
        await queryRunner.release();
      }
    }
  }

  async deleteAllTransactions(walletId: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      const wallet = await queryRunner.manager.findOne(Wallet, {
        where: { id: walletId }
      });

      if (!wallet) {
        throw new WalletNotFoundException(walletId);
      }

      if (wallet.status !== 'FROZEN') {
        throw new BaseException(
          'Wallet must be frozen before deleting all transactions',
          HttpStatus.BAD_REQUEST,
          'WALLET_NOT_FROZEN'
        );
      }

      // Delete all transactions
      await queryRunner.manager.delete(Transaction, { wallet: { id: walletId } });
      
      // Reset wallet balance to 0
      wallet.balance = '0';
      await queryRunner.manager.save(wallet);

      await queryRunner.commitTransaction();
      return { message: 'All transactions deleted successfully' };

    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      if (error instanceof BaseException) {
        throw error;
      }
      throw new BaseException(
        'Failed to delete transactions',
        HttpStatus.INTERNAL_SERVER_ERROR,
        'TRANSACTIONS_DELETE_ERROR',
        { error: error.message }
      );
    } finally {
      if (!queryRunner.isReleased) {
        await queryRunner.release();
      }
    }
  }
}

