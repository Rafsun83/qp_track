import { apiRequest } from "./client";
import type { Ticket, TicketPriority, TicketStatus } from "../types/ticket";

export interface CreateTicketPayload {
  title: string;
  description: string;
  status?: TicketStatus;
  priority?: TicketPriority;
}

/** POST /api/project/:projectId/sprint/:sprintId/ticket - requires project membership (LEAD or CONTRIBUTOR). */
export function createTicket(
  token: string,
  projectId: string,
  sprintId: string,
  payload: CreateTicketPayload,
): Promise<Ticket> {
  return apiRequest<Ticket>(
    `/api/project/${projectId}/sprint/${sprintId}/ticket`,
    { method: "POST", token, body: payload },
  );
}

/** GET /api/project/:projectId/sprint/:sprintId/ticket - requires project membership (any role). */
export function getTicketsForSprint(
  token: string,
  projectId: string,
  sprintId: string,
): Promise<Ticket[]> {
  return apiRequest<Ticket[]>(
    `/api/project/${projectId}/sprint/${sprintId}/ticket`,
    { token },
  );
}

export interface UpdateTicketPayload {
  title?: string;
  description?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
}

/** PUT /api/project/:projectId/sprint/:sprintId/ticket/:ticketId - requires project membership (LEAD or CONTRIBUTOR). */
export function updateTicket(
  token: string,
  projectId: string,
  sprintId: string,
  ticketId: string,
  payload: UpdateTicketPayload,
): Promise<Ticket> {
  return apiRequest<Ticket>(
    `/api/project/${projectId}/sprint/${sprintId}/ticket/${ticketId}`,
    { method: "PUT", token, body: payload },
  );
}

/** DELETE /api/project/:projectId/sprint/:sprintId/ticket/:ticketId - requires project membership (LEAD or CONTRIBUTOR). */
export function deleteTicket(
  token: string,
  projectId: string,
  sprintId: string,
  ticketId: string,
): Promise<unknown> {
  return apiRequest(
    `/api/project/${projectId}/sprint/${sprintId}/ticket/${ticketId}`,
    { method: "DELETE", token },
  );
}
