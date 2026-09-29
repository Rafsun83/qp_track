import type { OrganizationRole } from '../../organization_members/enum/organization-role.enum.js';
import type { ProjectRole } from '../../project_members/enum/project-role.enum.js';
import type { Ticket } from '../../tickets/entity/ticket.entity.js';

// Domain events emitted by feature services *after* their transaction has
// committed. NotificationListener turns them into notifications; producers
// don't know or care who is listening.
export const NotificationEvents = {
  TICKET_UPDATED: 'ticket.updated',
  COMMENT_CREATED: 'comment.created',
  PROJECT_MEMBER_ADDED: 'project.member.added',
  PROJECT_MEMBER_REMOVED: 'project.member.removed',
  PROJECT_MEMBER_ROLE_UPDATED: 'project.member.role_updated',
  ORGANIZATION_MEMBER_ADDED: 'organization.member.added',
} as const;

export interface TicketUpdatedEvent {
  actorId: string;
  projectId: string;
  before: Ticket;
  after: Ticket;
}

export interface CommentCreatedEvent {
  actorId: string;
  projectId: string;
  commentId: string;
  ticket: Pick<
    Ticket,
    'id' | 'sprintId' | 'title' | 'createdBy' | 'assigneeId'
  >;
}

export interface ProjectMemberAddedEvent {
  actorId: string;
  projectId: string;
  userId: string;
  memberId: string;
  role: ProjectRole;
}

export interface ProjectMemberRemovedEvent {
  actorId: string;
  projectId: string;
  userId: string;
  memberId: string;
}

export interface ProjectMemberRoleUpdatedEvent {
  actorId: string;
  projectId: string;
  userId: string;
  memberId: string;
  oldRole: ProjectRole;
  newRole: ProjectRole;
}

export interface OrganizationMemberAddedEvent {
  actorId: string;
  organizationId: string;
  userId: string;
  memberId: string;
  role: OrganizationRole;
}
