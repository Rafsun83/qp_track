import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Notification } from '../entity/notification.entity.js';
import { NotificationType } from '../enum/notification-type.enum.js';
import {
  NotificationGateway,
  NotificationSocketEvents,
} from '../gateway/notification.gateway.js';
import { NotificationService } from './notification.service.js';

const input = {
  actorId: 'actor',
  type: NotificationType.TICKET_ASSIGNED,
  title: 'Ticket assigned to you',
  message: 'Jane assigned you "Fix login"',
  entityType: 'ticket',
  entityId: 'ticket-1',
};

describe('NotificationService', () => {
  let service: NotificationService;
  let repo: Record<string, ReturnType<typeof vi.fn>>;
  let emitToUser: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    repo = {
      create: vi.fn((row) => row),
      save: vi.fn(async (rows) =>
        rows.map((row: object, i: number) => ({ id: `n-${i}`, ...row })),
      ),
      count: vi.fn().mockResolvedValue(3),
      findOne: vi.fn(),
      update: vi.fn().mockResolvedValue({ affected: 2 }),
    };
    emitToUser = vi.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: getRepositoryToken(Notification), useValue: repo },
        { provide: NotificationGateway, useValue: { emitToUser } },
      ],
    }).compile();

    service = module.get(NotificationService);
  });

  it('dedupes recipients and never notifies the actor', async () => {
    const saved = await service.notify(
      ['bob', 'actor', 'bob', null, undefined],
      input,
    );

    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ recipientId: 'bob' });
  });

  it('does not touch the database when nobody is left to notify', async () => {
    await expect(service.notify(['actor'], input)).resolves.toEqual([]);
    expect(repo.save).not.toHaveBeenCalled();
    expect(emitToUser).not.toHaveBeenCalled();
  });

  it('pushes the notification and the new unread count to the recipient', async () => {
    await service.notify(['bob'], input);

    expect(emitToUser).toHaveBeenCalledWith(
      'bob',
      NotificationSocketEvents.NEW,
      expect.objectContaining({ recipientId: 'bob', type: input.type }),
    );
    expect(emitToUser).toHaveBeenCalledWith(
      'bob',
      NotificationSocketEvents.UNREAD_COUNT,
      { count: 3 },
    );
  });

  it("404s when marking someone else's notification as read", async () => {
    repo.findOne.mockResolvedValue(null);

    await expect(service.markRead('bob', 'n-1')).rejects.toThrow(
      NotFoundException,
    );
    expect(repo.findOne).toHaveBeenCalledWith({
      where: { id: 'n-1', recipientId: 'bob' },
    });
  });

  it('does not re-save an already read notification', async () => {
    repo.findOne.mockResolvedValue({ id: 'n-1', readAt: new Date() });

    await service.markRead('bob', 'n-1');

    expect(repo.save).not.toHaveBeenCalled();
  });

  it('marks all unread as read and returns the count', async () => {
    await expect(service.markAllRead('bob')).resolves.toEqual({ updated: 2 });
    expect(emitToUser).toHaveBeenCalledWith(
      'bob',
      NotificationSocketEvents.UNREAD_COUNT,
      { count: 3 },
    );
  });
});
