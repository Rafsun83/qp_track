import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThan, Repository } from 'typeorm';
import { FilterNotificationDto } from '../dto/filter-notification.dto.js';
import { Notification } from '../entity/notification.entity.js';
import { NotificationType } from '../enum/notification-type.enum.js';
import {
  NotificationGateway,
  NotificationSocketEvents,
} from '../gateway/notification.gateway.js';

export interface NotificationInput {
  actorId: string | null;
  type: NotificationType;
  title: string;
  message: string;
  entityType: string;
  entityId: string;
  organizationId?: string | null;
  projectId?: string | null;
  data?: Record<string, any> | null;
}

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly gateway: NotificationGateway,
  ) {}

  // Persists one notification per recipient, then pushes it in realtime.
  // The actor is never notified about their own action.
  async notify(
    recipientIds: (string | null | undefined)[],
    input: NotificationInput,
  ): Promise<Notification[]> {
    const recipients = [...new Set(recipientIds)].filter(
      (id): id is string => !!id && id !== input.actorId,
    );
    if (!recipients.length) return [];

    const saved = await this.notificationRepository.save(
      recipients.map((recipientId) =>
        this.notificationRepository.create({
          ...input,
          recipientId,
          organizationId: input.organizationId ?? null,
          projectId: input.projectId ?? null,
          data: input.data ?? null,
        }),
      ),
    );

    for (const notification of saved) {
      this.gateway.emitToUser(
        notification.recipientId,
        NotificationSocketEvents.NEW,
        notification,
      );
      await this.pushUnreadCount(notification.recipientId);
    }
    return saved;
  }

  async findAll(recipientId: string, query: FilterNotificationDto) {
    const { unread, page = 1, limit = 20 } = query;

    const [items, total] = await this.notificationRepository.findAndCount({
      where: {
        recipientId,
        ...(unread === true && { readAt: IsNull() }),
      },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit };
  }

  // Hard-deletes every notification created before the cutoff, for all users.
  async deleteOlderThan(cutoff: Date): Promise<number> {
    const result = await this.notificationRepository.delete({
      createdAt: LessThan(cutoff),
    });
    return result.affected ?? 0;
  }

  countUnread(recipientId: string): Promise<number> {
    return this.notificationRepository.count({
      where: { recipientId, readAt: IsNull() },
    });
  }

  async markRead(recipientId: string, id: string): Promise<Notification> {
    // Scoped by recipient: someone else's notification id 404s.
    const notification = await this.notificationRepository.findOne({
      where: { id, recipientId },
    });
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (!notification.readAt) {
      notification.readAt = new Date();
      await this.notificationRepository.save(notification);
      await this.pushUnreadCount(recipientId);
    }
    return notification;
  }

  async markAllRead(recipientId: string): Promise<{ updated: number }> {
    const result = await this.notificationRepository.update(
      { recipientId, readAt: IsNull() },
      { readAt: new Date() },
    );
    await this.pushUnreadCount(recipientId);
    return { updated: result.affected ?? 0 };
  }

  // Keeps the badge in sync across all of the user's open tabs/devices.
  private async pushUnreadCount(recipientId: string) {
    const count = await this.countUnread(recipientId);
    this.gateway.emitToUser(
      recipientId,
      NotificationSocketEvents.UNREAD_COUNT,
      {
        count,
      },
    );
  }
}
