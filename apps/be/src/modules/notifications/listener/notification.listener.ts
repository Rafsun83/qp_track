import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organizations } from '../../organizations/entity/organization.entity.js';
import { Project } from '../../projects/entity/project.entity.js';
import { User } from '../../users/entity/user.entity.js';
import { NotificationType } from '../enum/notification-type.enum.js';
import {
  type CommentCreatedEvent,
  NotificationEvents,
  type OrganizationMemberAddedEvent,
  type ProjectMemberAddedEvent,
  type ProjectMemberRemovedEvent,
  type ProjectMemberRoleUpdatedEvent,
  type TicketUpdatedEvent,
} from '../events/notification.events.js';
import { NotificationService } from '../service/notification.service.js';

// `async: true` runs handlers on the next tick, so the HTTP response that
// triggered the event is never delayed by notification work. Failures are
// logged and swallowed - a broken notification must not break the API call
// (the change itself has already committed by the time events fire).
@Injectable()
export class NotificationListener {
  private readonly logger = new Logger(NotificationListener.name);

  constructor(
    private readonly notificationService: NotificationService,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(Organizations)
    private readonly organizationRepository: Repository<Organizations>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  @OnEvent(NotificationEvents.TICKET_UPDATED, { async: true })
  async onTicketUpdated({
    actorId,
    projectId,
    before,
    after,
  }: TicketUpdatedEvent) {
    await this.safely(NotificationEvents.TICKET_UPDATED, async () => {
      const assigneeChanged =
        !!after.assigneeId && after.assigneeId !== before.assigneeId;
      const statusChanged = after.status !== before.status;
      if (!assigneeChanged && !statusChanged) return;

      const [project, actorName] = await Promise.all([
        this.findProject(projectId),
        this.actorName(actorId),
      ]);
      const base = {
        actorId,
        entityType: 'ticket',
        entityId: after.id,
        projectId,
        organizationId: project?.organizationId ?? null,
        data: { sprintId: after.sprintId },
      };

      if (assigneeChanged) {
        await this.notificationService.notify([after.assigneeId], {
          ...base,
          type: NotificationType.TICKET_ASSIGNED,
          title: 'Ticket assigned to you',
          message: `${actorName} assigned you "${after.title}"${this.inProject(project)}`,
        });
      }

      if (statusChanged) {
        // A freshly assigned user already got the assignment notification
        // above; don't send them a second one for the same save.
        const recipients = [after.createdBy, after.assigneeId].filter(
          (id) => !(assigneeChanged && id === after.assigneeId),
        );
        await this.notificationService.notify(recipients, {
          ...base,
          type: NotificationType.TICKET_STATUS_CHANGED,
          title: 'Ticket status changed',
          message: `${actorName} moved "${after.title}" from ${before.status} to ${after.status}`,
          data: { ...base.data, from: before.status, to: after.status },
        });
      }
    });
  }

  @OnEvent(NotificationEvents.COMMENT_CREATED, { async: true })
  async onCommentCreated({
    actorId,
    projectId,
    commentId,
    ticket,
  }: CommentCreatedEvent) {
    await this.safely(NotificationEvents.COMMENT_CREATED, async () => {
      const [project, actorName] = await Promise.all([
        this.findProject(projectId),
        this.actorName(actorId),
      ]);
      await this.notificationService.notify(
        [ticket.createdBy, ticket.assigneeId],
        {
          actorId,
          type: NotificationType.TICKET_COMMENTED,
          title: 'New comment',
          message: `${actorName} commented on "${ticket.title}"`,
          entityType: 'ticket',
          entityId: ticket.id,
          projectId,
          organizationId: project?.organizationId ?? null,
          data: { sprintId: ticket.sprintId, commentId },
        },
      );
    });
  }

  @OnEvent(NotificationEvents.PROJECT_MEMBER_ADDED, { async: true })
  async onProjectMemberAdded({
    actorId,
    projectId,
    userId,
    memberId,
    role,
  }: ProjectMemberAddedEvent) {
    await this.safely(NotificationEvents.PROJECT_MEMBER_ADDED, async () => {
      const [project, actorName] = await Promise.all([
        this.findProject(projectId),
        this.actorName(actorId),
      ]);
      await this.notificationService.notify([userId], {
        actorId,
        type: NotificationType.PROJECT_MEMBER_ADDED,
        title: 'Added to a project',
        message: `${actorName} added you to ${project?.name ?? 'a project'} as ${role}`,
        entityType: 'project_member',
        entityId: memberId,
        projectId,
        organizationId: project?.organizationId ?? null,
        data: { role },
      });
    });
  }

  @OnEvent(NotificationEvents.PROJECT_MEMBER_REMOVED, { async: true })
  async onProjectMemberRemoved({
    actorId,
    projectId,
    userId,
    memberId,
  }: ProjectMemberRemovedEvent) {
    await this.safely(NotificationEvents.PROJECT_MEMBER_REMOVED, async () => {
      const [project, actorName] = await Promise.all([
        this.findProject(projectId),
        this.actorName(actorId),
      ]);
      await this.notificationService.notify([userId], {
        actorId,
        type: NotificationType.PROJECT_MEMBER_REMOVED,
        title: 'Removed from a project',
        message: `${actorName} removed you from ${project?.name ?? 'a project'}`,
        entityType: 'project_member',
        entityId: memberId,
        projectId,
        organizationId: project?.organizationId ?? null,
      });
    });
  }

  @OnEvent(NotificationEvents.PROJECT_MEMBER_ROLE_UPDATED, { async: true })
  async onProjectMemberRoleUpdated({
    actorId,
    projectId,
    userId,
    memberId,
    oldRole,
    newRole,
  }: ProjectMemberRoleUpdatedEvent) {
    await this.safely(
      NotificationEvents.PROJECT_MEMBER_ROLE_UPDATED,
      async () => {
        if (oldRole === newRole) return;
        const [project, actorName] = await Promise.all([
          this.findProject(projectId),
          this.actorName(actorId),
        ]);
        await this.notificationService.notify([userId], {
          actorId,
          type: NotificationType.PROJECT_ROLE_CHANGED,
          title: 'Project role changed',
          message: `${actorName} changed your role in ${project?.name ?? 'a project'} from ${oldRole} to ${newRole}`,
          entityType: 'project_member',
          entityId: memberId,
          projectId,
          organizationId: project?.organizationId ?? null,
          data: { from: oldRole, to: newRole },
        });
      },
    );
  }

  @OnEvent(NotificationEvents.ORGANIZATION_MEMBER_ADDED, { async: true })
  async onOrganizationMemberAdded({
    actorId,
    organizationId,
    userId,
    memberId,
    role,
  }: OrganizationMemberAddedEvent) {
    await this.safely(
      NotificationEvents.ORGANIZATION_MEMBER_ADDED,
      async () => {
        const [organization, actorName] = await Promise.all([
          this.organizationRepository.findOne({
            where: { id: organizationId },
            select: { id: true, name: true },
          }),
          this.actorName(actorId),
        ]);
        await this.notificationService.notify([userId], {
          actorId,
          type: NotificationType.ORGANIZATION_MEMBER_ADDED,
          title: 'Added to an organization',
          message: `${actorName} added you to ${organization?.name ?? 'an organization'} as ${role}`,
          entityType: 'organization_member',
          entityId: memberId,
          organizationId,
          data: { role },
        });
      },
    );
  }

  private findProject(projectId: string) {
    return this.projectRepository.findOne({
      where: { id: projectId },
      select: { id: true, name: true, organizationId: true },
    });
  }

  private async actorName(actorId: string | null): Promise<string> {
    if (!actorId) return 'Someone';
    const actor = await this.userRepository.findOne({
      where: { id: actorId },
      select: { id: true, name: true },
    });
    return actor?.name ?? 'Someone';
  }

  private inProject(project: Pick<Project, 'name'> | null) {
    return project ? ` in ${project.name}` : '';
  }

  private async safely(event: string, handler: () => Promise<void>) {
    try {
      await handler();
    } catch (err) {
      this.logger.error(
        `Failed to create notifications for "${event}"`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }
}
