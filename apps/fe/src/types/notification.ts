export type NotificationType =
  | "TICKET_ASSIGNED"
  | "TICKET_STATUS_CHANGED"
  | "TICKET_COMMENTED"
  | "PROJECT_MEMBER_ADDED"
  | "PROJECT_MEMBER_REMOVED"
  | "PROJECT_ROLE_CHANGED"
  | "ORGANIZATION_MEMBER_ADDED";

export interface AppNotification {
  id: string;
  recipientId: string;
  actorId: string | null;
  type: NotificationType;
  title: string;
  message: string;
  entityType: "ticket" | "project_member" | "organization_member" | string;
  entityId: string;
  organizationId: string | null;
  projectId: string | null;
  /** Extra ids for deep-linking, e.g. `sprintId` for a ticket. */
  data: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationPage {
  items: AppNotification[];
  total: number;
  page: number;
  limit: number;
}
