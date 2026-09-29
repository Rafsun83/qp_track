import type { AppNotification, NotificationType } from "../types/notification";

export type NotificationTone = "info" | "accent" | "success" | "danger" | "warning";

/** Color family per notification kind, so lists and toasts are scannable at a glance. */
export const NOTIFICATION_TONE: Record<NotificationType, NotificationTone> = {
  TICKET_ASSIGNED: "info",
  TICKET_STATUS_CHANGED: "warning",
  TICKET_COMMENTED: "info",
  PROJECT_MEMBER_ADDED: "accent",
  PROJECT_ROLE_CHANGED: "accent",
  PROJECT_MEMBER_REMOVED: "danger",
  ORGANIZATION_MEMBER_ADDED: "success",
};

/** Where clicking a notification takes the user, or null if there's nowhere useful. */
export function notificationLink(notification: AppNotification): string | null {
  const { organizationId, projectId, entityType, entityId, type, data } = notification;
  if (!organizationId) return null;

  const orgPath = `/organizations/${organizationId}`;
  const projectPath = projectId ? `${orgPath}/projects/${projectId}` : null;

  if (entityType === "ticket") {
    const sprintId = typeof data?.sprintId === "string" ? data.sprintId : null;
    if (projectPath && sprintId) {
      // SprintTicketsPage opens the ticket's detail modal from ?ticket=.
      return `${projectPath}/sprints/${sprintId}?ticket=${entityId}`;
    }
    return projectPath;
  }

  // A removed member can't open the project any more; send them to the org.
  if (type === "PROJECT_MEMBER_REMOVED") return orgPath;
  if (entityType === "project_member") return projectPath ?? orgPath;
  return orgPath;
}

const relativeTime = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

/** "just now", "5 minutes ago", "yesterday", ... */
export function formatRelativeTime(iso: string, now = Date.now()): string {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) {
      return relativeTime.format(Math.round(seconds / size), unit);
    }
  }
  return "just now";
}
