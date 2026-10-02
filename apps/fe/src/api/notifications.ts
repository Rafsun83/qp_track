import { apiRequest, apiRequestPaginated } from "./client";
import type { AppNotification, NotificationPage } from "../types/notification";

/** GET /api/notifications - the caller's own notifications, newest first. */
export async function getNotifications(
  token: string,
  params: { page?: number; limit?: number; unread?: boolean } = {},
): Promise<NotificationPage> {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.unread) query.set("unread", "true");
  const qs = query.toString();
  const { items, pagination } = await apiRequestPaginated<AppNotification>(
    `/api/notifications${qs ? `?${qs}` : ""}`,
    { token },
  );
  return { items, total: pagination.total, page: pagination.page, limit: pagination.limit };
}

/** GET /api/notifications/unread-count */
export function getUnreadNotificationCount(token: string): Promise<{ count: number }> {
  return apiRequest<{ count: number }>("/api/notifications/unread-count", { token });
}

/** PATCH /api/notifications/:id/read - 404s for someone else's notification. */
export function markNotificationRead(token: string, id: string): Promise<AppNotification> {
  return apiRequest<AppNotification>(`/api/notifications/${id}/read`, {
    method: "PATCH",
    token,
  });
}

/** PATCH /api/notifications/read-all */
export function markAllNotificationsRead(token: string): Promise<{ updated: number }> {
  return apiRequest<{ updated: number }>("/api/notifications/read-all", {
    method: "PATCH",
    token,
  });
}
