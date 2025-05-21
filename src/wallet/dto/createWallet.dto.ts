import { IsString, IsOptional, IsNumber, Min, ValidateNested, Length, IsEnum, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateWalletDto {
  @IsString()
  @Length(1, 100)
  name: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  balance?: number = 0;

  @IsOptional()
  @IsEnum(['ACTIVE', 'FROZEN', 'CLOSED'])
  status?: 'ACTIVE' | 'FROZEN' | 'CLOSED' = 'ACTIVE';

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any> = {};
}
