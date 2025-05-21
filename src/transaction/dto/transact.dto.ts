import { IsString, IsNumber, IsNotEmpty, Length, IsEnum, IsOptional, IsObject, Min, Max } from 'class-validator';

export class TransactDto {
  @IsNumber({ maxDecimalPlaces: 4 }, { message: 'Amount can have maximum 4 decimal places' })
  @IsNotEmpty({ message: 'Transaction amount is required' })
  @Min(-999999999, { message: 'Amount exceeds minimum limit' })
  @Max(999999999, { message: 'Amount exceeds maximum limit' })
  amount: number;

  @IsString()
  @Length(1, 255, { message: 'Description must be between 1 and 255 characters' })
  description: string;

  @IsString()
  @Length(1, 50)
  referenceId: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}