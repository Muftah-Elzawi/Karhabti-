import { Module } from '@nestjs/common';

import { AddressService } from './application/address.service';
import { AddressRepository } from './infrastructure/address.repository';
import { AddressesController } from './presentation/addresses.controller';

@Module({
  controllers: [AddressesController],
  providers: [AddressService, AddressRepository],
  exports: [AddressService],
})
export class AddressesModule {}
