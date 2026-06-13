import { Controller, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../../common/guards/current-user.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { Roles } from '../../../common/guards/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import type { AuthenticatedUser } from '../../auth/domain/token-payload';
import type { PaymentDto } from '../application/payment-dto';
import { PaymentAdminService } from '../application/payment-admin.service';

@ApiTags('admin/payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/payments')
export class AdminPaymentsController {
  constructor(private readonly paymentAdminService: PaymentAdminService) {}

  @Post(':id/refund')
  @HttpCode(200)
  @ApiOperation({ summary: 'Refund a successful payment (audited)' })
  refund(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<PaymentDto> {
    return this.paymentAdminService.refund(user.id, id);
  }
}
