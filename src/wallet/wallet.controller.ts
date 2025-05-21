import { Controller, Post, Body, Get, Param, Delete, Patch } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { CreateWalletDto } from './dto/createWallet.dto';

@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post('setup')
  createWallet(@Body() dto: CreateWalletDto) {
    return this.walletService.createWallet(dto);
  }

  @Get(':id')
  getWallet(@Param('id') id: string) {
    return this.walletService.getWallet(id);
  }

  @Get()
  getAllWallets() {
    return this.walletService.getAllWallets();
  }

  @Delete(':id')
  deleteWallet(@Param('id') id: string) {
    return this.walletService.deleteWallet(id);
  }

  @Patch(':id/status')
  updateWalletStatus(
    @Param('id') id: string,
    @Body('status') status: 'ACTIVE' | 'FROZEN' | 'CLOSED'
  ) {
    return this.walletService.updateWalletStatus(id, status);
  }
}