import { Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import type { CursorQuery } from '@karhabti/validation';
import { cursorQuerySchema } from '@karhabti/validation';
import type { ApiEnvelope, PageMeta } from '@karhabti/types';

import { CurrentUser } from '../../../common/guards/current-user.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import type { AuthenticatedUser } from '../../auth/domain/token-payload';
import type { NotificationDto } from '../application/notification.service';
import { NotificationService } from '../application/notification.service';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiOperation({ summary: 'My notifications (newest first, both languages included)' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(cursorQuerySchema)) query: CursorQuery,
  ): Promise<ApiEnvelope<NotificationDto[], PageMeta>> {
    return this.notificationService.list(user.id, query);
  }

  @Post(':id/read')
  @HttpCode(204)
  @ApiOperation({ summary: 'Mark a notification as read' })
  async markRead(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    await this.notificationService.markRead(user.id, id);
  }
}
