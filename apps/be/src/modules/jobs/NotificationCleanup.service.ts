import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationService } from '../notifications/service/notification.service.js';

// Notifications older than this are deleted.
// 1 second	1 * 1000	1,000
// 30 seconds	30 * 1000	30,000
// 1 minute	60 * 1000	60,000
// 2 minutes	2 * 60 * 1000	120,000
// 5 minutes	5 * 60 * 1000	300,000
// 1 hour	60 * 60 * 1000	3,600,000
// 1 day	24 * 60 * 60 * 1000	86,400,000
// 30 days	30 * 24 * 60 * 60 * 1000	2,592,000,000
const RETENTION_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class NotificationCleanupService {
  private readonly logger = new Logger(NotificationCleanupService.name);

  constructor(private readonly notificationService: NotificationService) {}

  // Runs outside any HTTP request, so there is no current user here;
  // the cleanup applies to all users' notifications.
  @Cron(CronExpression.EVERY_12_HOURS)
  async handleCron() {
    try {
      const cutoff = new Date(Date.now() - RETENTION_MS);
      const deleted = await this.notificationService.deleteOlderThan(cutoff);
      this.logger.debug(
        `Deleted ${deleted} notification(s) older than ${cutoff.toISOString()}`,
      );
    } catch (error) {
      this.logger.error('Notification cleanup failed', error as Error);
    }
  }
}
