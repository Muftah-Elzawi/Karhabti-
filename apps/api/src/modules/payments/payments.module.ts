import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentAdminService } from './application/payment-admin.service';
import { PaymentWebhookService } from './application/payment-webhook.service';
import { PaymentService } from './application/payment.service';
import { PaymentRepository } from './infrastructure/payment.repository';
import { AdminPaymentsController } from './presentation/admin-payments.controller';
import { PaymentWebhookController } from './presentation/payment-webhook.controller';
import { PaymentsController } from './presentation/payments.controller';

@Module({
  imports: [NotificationsModule],
  controllers: [PaymentsController, PaymentWebhookController, AdminPaymentsController],
  providers: [PaymentService, PaymentWebhookService, PaymentAdminService, PaymentRepository],
})
export class PaymentsModule {}
