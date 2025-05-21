import { HttpException, HttpStatus } from '@nestjs/common';

export class BaseException extends HttpException {
  constructor(
    message: string,
    status: HttpStatus,
    public readonly code: string,
    public readonly details?: any
  ) {
    super(
      {
        status,
        code,
        message,
        details,
        timestamp: new Date().toISOString(),
      },
      status
    );
  }
} 