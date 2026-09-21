import { apiRequest } from "./client";
import type { Comment } from "../types/comment";

export interface CreateCommentPayload {
  comment: string;
}

/** POST /api/project/:projectId/sprint/:sprintId/ticket/:ticketId/comment - requires project membership (any role). */
export function createComment(
  token: string,
  projectId: string,
  sprintId: string,
  ticketId: string,
  payload: CreateCommentPayload,
): Promise<Comment> {
  return apiRequest<Comment>(
    `/api/project/${projectId}/sprint/${sprintId}/ticket/${ticketId}/comment`,
    { method: "POST", token, body: payload },
  );
}

/** GET /api/project/:projectId/sprint/:sprintId/ticket/:ticketId/comment - requires project membership (any role). */
export function getCommentsForTicket(
  token: string,
  projectId: string,
  sprintId: string,
  ticketId: string,
): Promise<Comment[]> {
  return apiRequest<Comment[]>(
    `/api/project/${projectId}/sprint/${sprintId}/ticket/${ticketId}/comment`,
    { token },
  );
}

export interface UpdateCommentPayload {
  comment: string;
}

/** PUT .../comment/:commentId - requires the caller to be the comment's author. */
export function updateComment(
  token: string,
  projectId: string,
  sprintId: string,
  ticketId: string,
  commentId: string,
  payload: UpdateCommentPayload,
): Promise<Comment> {
  return apiRequest<Comment>(
    `/api/project/${projectId}/sprint/${sprintId}/ticket/${ticketId}/comment/${commentId}`,
    { method: "PUT", token, body: payload },
  );
}

/** DELETE .../comment/:commentId - requires the caller to be the comment's author. */
export function deleteComment(
  token: string,
  projectId: string,
  sprintId: string,
  ticketId: string,
  commentId: string,
): Promise<unknown> {
  return apiRequest(
    `/api/project/${projectId}/sprint/${sprintId}/ticket/${ticketId}/comment/${commentId}`,
    { method: "DELETE", token },
  );
}
