import { HttpStatus } from '@nestjs/common';
import { BaseException } from './base.exception';

export class InsufficientBalanceException extends BaseException {
  constructor(details?: any) {
    super(
      'Insufficient balance for this transaction',
      HttpStatus.BAD_REQUEST,
      'INSUFFICIENT_BALANCE',
      details
    );
  }
}

export class WalletNotFoundException extends BaseException {
  constructor(walletId: string) {
    super(
      `Wallet with ID ${walletId} not found`,
      HttpStatus.NOT_FOUND,
      'WALLET_NOT_FOUND'
    );
  }
}

export class WalletStatusException extends BaseException {
  constructor(status: string) {
    super(
      `Cannot perform operation on wallet with status: ${status}`,
      HttpStatus.BAD_REQUEST,
      'INVALID_WALLET_STATUS'
    );
  }
}

export class DuplicateReferenceIdException extends BaseException {
  constructor(referenceId: string) {
    super(
      `Transaction with reference ID ${referenceId} already exists`,
      HttpStatus.CONFLICT,
      'DUPLICATE_REFERENCE_ID'
    );
  }
}

export class InvalidTransactionAmountException extends BaseException {
  constructor(amount: string) {
    super(
      `Invalid transaction amount: ${amount}`,
      HttpStatus.BAD_REQUEST,
      'INVALID_TRANSACTION_AMOUNT'
    );
  }
}

export class TransactionFailedException extends BaseException {
  constructor(message: string, details?: any) {
    super(
      message,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'TRANSACTION_FAILED',
      details
    );
  }
}

export class InvalidPaginationParamsException extends BaseException {
  constructor(details?: any) {
    super(
      'Invalid pagination parameters',
      HttpStatus.BAD_REQUEST,
      'INVALID_PAGINATION_PARAMS',
      details
    );
  }
} 