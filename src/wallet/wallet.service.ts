import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Wallet } from './wallet.entity';
import { CreateWalletDto } from './dto/createWallet.dto';
import { Transaction } from '../transaction/transaction.entity';
import Decimal from 'decimal.js';
import { TransactDto } from '../transaction/dto/transact.dto';
import { WalletNotFoundException, WalletStatusException, InsufficientBalanceException, DuplicateReferenceIdException, InvalidTransactionAmountException } from '../common/exceptions/wallet.exception';
import { BaseException } from '../common/exceptions/base.exception';
import { HttpStatus } from '@nestjs/common';
import { TransactionFailedException } from '../common/exceptions/wallet.exception';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet) private walletRepo: Repository<Wallet>,
    @InjectRepository(Transaction) private transactionRepo: Repository<Transaction>,
    private dataSource: DataSource
  ) {}

  async createWallet(dto: CreateWalletDto) {
    try {
      return await this.dataSource.transaction(async manager => {
        const wallet = this.walletRepo.create({
          name: dto.name,
          balance: new Decimal(dto.balance || 0).toFixed(4),
          status: dto.status || 'ACTIVE',
          metadata: dto.metadata
        });

        const savedWallet = await manager.save(wallet);

        const transaction = this.transactionRepo.create({
          wallet: savedWallet,
          amount: savedWallet.balance,
          balance: savedWallet.balance,
          description: 'Initial setup',
          type: 'CREDIT',
          status: 'COMPLETED',
          processedAt: new Date(),
          referenceId: `INITIAL_SETUP_${savedWallet.id}`
        });

        await manager.save(transaction);
        return { ...savedWallet, transactionId: transaction.id };
      });
    } catch (error) {
      if (error.code === '23505') { // Unique constraint violation
        throw new BaseException(
          'Wallet name already exists',
          HttpStatus.CONFLICT,
          'DUPLICATE_WALLET_NAME'
        );
      }
      throw new TransactionFailedException(
        'Failed to create wallet',
        { error: error.message }
      );
    }
  }

  async getWallet(id: string) {
    try {
      const wallet = await this.walletRepo.findOne({
        where: { id },
        relations: ['transactions']
      });

      if (!wallet) {
        throw new WalletNotFoundException(id);
      }

      return wallet;
    } catch (error) {
      if (error instanceof WalletNotFoundException) {
        throw error;
      }
      throw new BaseException(
        'Failed to fetch wallet',
        HttpStatus.INTERNAL_SERVER_ERROR,
        'WALLET_FETCH_ERROR',
        { error: error.message }
      );
    }
  }

  async transact(walletId: string, dto: TransactDto) {
    try {
      return await this.dataSource.transaction(async manager => {
        const wallet = await manager.findOne(Wallet, {
          where: { id: walletId },
          lock: { mode: 'pessimistic_write' },
        });
        
        if (!wallet) {
          throw new WalletNotFoundException(walletId);
        }

        if (wallet.status !== 'ACTIVE') {
          throw new WalletStatusException(wallet.status);
        }

        if (dto.referenceId) {
          const existingTransaction = await manager.findOne(Transaction, {
            where: { referenceId: dto.referenceId }
          });
          
          if (existingTransaction) {
            throw new DuplicateReferenceIdException(dto.referenceId);
          }
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

        wallet.balance = newBalance.toFixed(4);
        await manager.save(wallet);

        const transaction = this.transactionRepo.create({
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

        await manager.save(transaction);

        return {
          balance: wallet.balance,
          transactionId: transaction.id
        };
      });
    } catch (error) {
      if (error instanceof BaseException) {
        throw error;
      }
      throw new TransactionFailedException(
        'Transaction processing failed',
        { error: error.message }
      );
    }
  }

  async getAllWallets() {
    try {
      return await this.walletRepo.find({
        order: { createdAt: 'DESC' }
      });
    } catch (error) {
      throw new BaseException(
        'Failed to fetch wallets',
        HttpStatus.INTERNAL_SERVER_ERROR,
        'WALLETS_FETCH_ERROR',
        { error: error.message }
      );
    }
  }

  async deleteWallet(id: string) {
    try {
      const wallet = await this.walletRepo.findOne({
        where: { id },
        relations: ['transactions']
      });

      if (!wallet) {
        throw new WalletNotFoundException(id);
      }

      if (wallet.transactions.length > 0) {
        throw new BaseException(
          'Cannot delete wallet with existing transactions',
          HttpStatus.BAD_REQUEST,
          'WALLET_HAS_TRANSACTIONS'
        );
      }

      await this.walletRepo.remove(wallet);
      return { message: 'Wallet deleted successfully' };
    } catch (error) {
      if (error instanceof BaseException) {
        throw error;
      }
      throw new BaseException(
        'Failed to delete wallet',
        HttpStatus.INTERNAL_SERVER_ERROR,
        'WALLET_DELETE_ERROR',
        { error: error.message }
      );
    }
  }

  async updateWalletStatus(id: string, status: 'ACTIVE' | 'FROZEN' | 'CLOSED') {
    try {
      const wallet = await this.walletRepo.findOne({
        where: { id }
      });

      if (!wallet) {
        throw new WalletNotFoundException(id);
      }

      wallet.status = status;
      await this.walletRepo.save(wallet);
      
      return wallet;
    } catch (error) {
      if (error instanceof BaseException) {
        throw error;
      }
      throw new BaseException(
        'Failed to update wallet status',
        HttpStatus.INTERNAL_SERVER_ERROR,
        'WALLET_STATUS_UPDATE_ERROR',
        { error: error.message }
      );
    }
  }
}
