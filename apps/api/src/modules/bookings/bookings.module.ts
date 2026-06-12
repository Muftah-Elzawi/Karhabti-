import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { BookingAdminService } from './application/booking-admin.service';
import { BookingProviderService } from './application/booking-provider.service';
import { BookingService } from './application/booking.service';
import { BookingRepository } from './infrastructure/booking.repository';
import { AdminBookingsController } from './presentation/admin-bookings.controller';
import { BookingsController } from './presentation/bookings.controller';
import { ProviderBookingsController } from './presentation/provider-bookings.controller';

@Module({
  imports: [NotificationsModule],
  controllers: [BookingsController, ProviderBookingsController, AdminBookingsController],
  providers: [BookingService, BookingProviderService, BookingAdminService, BookingRepository],
})
export class BookingsModule {}
