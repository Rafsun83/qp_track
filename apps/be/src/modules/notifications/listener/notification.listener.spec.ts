import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Organizations } from '../../organizations/entity/organization.entity.js';
import { Project } from '../../projects/entity/project.entity.js';
import { ProjectRole } from '../../project_members/enum/project-role.enum.js';
import { Ticket } from '../../tickets/entity/ticket.entity.js';
import { TicketStatus } from '../../tickets/enum/ticket-status.enum.js';
import { User } from '../../users/entity/user.entity.js';
import { NotificationType } from '../enum/notification-type.enum.js';
import { NotificationService } from '../service/notification.service.js';
import { NotificationListener } from './notification.listener.js';

const ticket = (overrides: Partial<Ticket> = {}) =>
  ({
    id: 'ticket-1',
    projectId: 'project-1',
    sprintId: 'sprint-1',
    title: 'Fix login',
    status: TicketStatus.TODO,
    createdBy: 'creator',
    assigneeId: 'creator',
    ...overrides,
  }) as Ticket;

describe('NotificationListener', () => {
  let listener: NotificationListener;
  let notify: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    notify = vi.fn().mockResolvedValue([]);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationListener,
        { provide: NotificationService, useValue: { notify } },
        {
          provide: getRepositoryToken(Project),
          useValue: {
            findOne: vi.fn().mockResolvedValue({
              id: 'project-1',
              name: 'Website',
              organizationId: 'org-1',
            }),
          },
        },
        {
          provide: getRepositoryToken(Organizations),
          useValue: {
            findOne: vi.fn().mockResolvedValue({ id: 'org-1', name: 'Acme' }),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: vi.fn().mockResolvedValue({ id: 'actor', name: 'Jane' }),
          },
        },
      ],
    }).compile();

    listener = module.get(NotificationListener);
  });

  describe('ticket.updated', () => {
    it('notifies the new assignee when a ticket is reassigned', async () => {
      await listener.onTicketUpdated({
        actorId: 'actor',
        projectId: 'project-1',
        before: ticket(),
        after: ticket({ assigneeId: 'bob' }),
      });

      expect(notify).toHaveBeenCalledTimes(1);
      expect(notify).toHaveBeenCalledWith(
        ['bob'],
        expect.objectContaining({
          type: NotificationType.TICKET_ASSIGNED,
          actorId: 'actor',
          organizationId: 'org-1',
          data: { sprintId: 'sprint-1' },
        }),
      );
    });

    it('notifies creator and assignee on a status change', async () => {
      await listener.onTicketUpdated({
        actorId: 'actor',
        projectId: 'project-1',
        before: ticket({ assigneeId: 'bob' }),
        after: ticket({ assigneeId: 'bob', status: TicketStatus.DONE }),
      });

      expect(notify).toHaveBeenCalledWith(
        ['creator', 'bob'],
        expect.objectContaining({
          type: NotificationType.TICKET_STATUS_CHANGED,
          message: 'Jane moved "Fix login" from TODO to DONE',
        }),
      );
    });

    it('does not send a newly assigned user a second status notification', async () => {
      await listener.onTicketUpdated({
        actorId: 'actor',
        projectId: 'project-1',
        before: ticket(),
        after: ticket({ assigneeId: 'bob', status: TicketStatus.IN_PROGRESS }),
      });

      expect(notify).toHaveBeenCalledTimes(2);
      expect(notify).toHaveBeenNthCalledWith(
        2,
        ['creator'],
        expect.objectContaining({
          type: NotificationType.TICKET_STATUS_CHANGED,
        }),
      );
    });

    it('does nothing when neither assignee nor status changed', async () => {
      await listener.onTicketUpdated({
        actorId: 'actor',
        projectId: 'project-1',
        before: ticket(),
        after: ticket({ title: 'Renamed' }),
      });

      expect(notify).not.toHaveBeenCalled();
    });

    it('swallows errors so a failed notification never breaks the caller', async () => {
      notify.mockRejectedValue(new Error('db down'));

      await expect(
        listener.onTicketUpdated({
          actorId: 'actor',
          projectId: 'project-1',
          before: ticket(),
          after: ticket({ assigneeId: 'bob' }),
        }),
      ).resolves.toBeUndefined();
    });
  });

  it('notifies ticket creator and assignee about a new comment', async () => {
    await listener.onCommentCreated({
      actorId: 'actor',
      projectId: 'project-1',
      commentId: 'comment-1',
      ticket: ticket({ assigneeId: 'bob' }),
    });

    expect(notify).toHaveBeenCalledWith(
      ['creator', 'bob'],
      expect.objectContaining({
        type: NotificationType.TICKET_COMMENTED,
        data: { sprintId: 'sprint-1', commentId: 'comment-1' },
      }),
    );
  });

  it('skips role-change notifications when the role did not change', async () => {
    await listener.onProjectMemberRoleUpdated({
      actorId: 'actor',
      projectId: 'project-1',
      userId: 'bob',
      memberId: 'member-1',
      oldRole: ProjectRole.VIEWER,
      newRole: ProjectRole.VIEWER,
    });

    expect(notify).not.toHaveBeenCalled();
  });

  it('notifies a user added to an organization', async () => {
    await listener.onOrganizationMemberAdded({
      actorId: 'actor',
      organizationId: 'org-1',
      userId: 'bob',
      memberId: 'member-1',
      role: 'MEMBER' as never,
    });

    expect(notify).toHaveBeenCalledWith(
      ['bob'],
      expect.objectContaining({
        type: NotificationType.ORGANIZATION_MEMBER_ADDED,
        message: 'Jane added you to Acme as MEMBER',
      }),
    );
  });
});
