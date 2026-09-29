import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ResponseMessage } from '../../../common/decorators/response-message.decorator.js';
import { ResponseInterceptor } from '../../../common/interceptors/response.interceptor.js';
import { CurrentUser } from '../../auth/decorator/current-user.decorator.js';
import { CurrentUserDto } from '../../auth/dto/current-user.dto.js';
import { FilterNotificationDto } from '../dto/filter-notification.dto.js';
import { NotificationService } from '../service/notification.service.js';

// Every route is scoped to the caller: there is no way to read or mark
// someone else's notifications.
@UseInterceptors(ResponseInterceptor)
@Controller('api')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @ResponseMessage('Notifications fetched successfully')
  @Get('notifications')
  findAll(
    @CurrentUser() user: CurrentUserDto,
    @Query() query: FilterNotificationDto,
  ) {
    return this.notificationService.findAll(user.sub, query);
  }

  @ResponseMessage('Unread notification count fetched successfully')
  @Get('notifications/unread-count')
  async unreadCount(@CurrentUser() user: CurrentUserDto) {
    return { count: await this.notificationService.countUnread(user.sub) };
  }

  @ResponseMessage('All notifications marked as read')
  @Patch('notifications/read-all')
  markAllRead(@CurrentUser() user: CurrentUserDto) {
    return this.notificationService.markAllRead(user.sub);
  }

  @ResponseMessage('Notification marked as read')
  @Patch('notifications/:id/read')
  markRead(
    @CurrentUser() user: CurrentUserDto,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notificationService.markRead(user.sub, id);
  }
}
