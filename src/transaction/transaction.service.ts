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

  async getTransactions(walletId: string, skip = 0, limit = 10) {
    try {
      if (skip < 0 || limit <= 0 || limit > 100) {
        throw new InvalidPaginationParamsException({
          skip,
          limit,
          message: 'Skip must be >= 0 and limit must be between 1 and 100'
        });
      }

      const wallet = await this.walletRepo.findOne({
        where: { id: walletId }
      });

      if (!wallet) {
        throw new WalletNotFoundException(walletId);
      }

      const [transactions, total] = await this.transactionRepo.findAndCount({
        where: { wallet: { id: walletId } },
        skip,
        take: limit,
        order: { createdAt: 'DESC' }
      });

      return {
        transactions,
        pagination: {
          total,
          skip,
          limit
        }
      };
    } catch (error) {
      if (error instanceof BaseException) {
        throw error;
      }
      throw new BaseException(
        'Failed to fetch transactions',
        HttpStatus.INTERNAL_SERVER_ERROR,
        'TRANSACTION_FETCH_ERROR',
        { error: error.message }
      );
    }
  }
}

