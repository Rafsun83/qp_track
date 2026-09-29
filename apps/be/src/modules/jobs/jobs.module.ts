import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { NotificationCleanupService } from './NotificationCleanup.service.js';

@Module({
  imports: [NotificationsModule],
  providers: [NotificationCleanupService],
})
export class JobsModule {}
