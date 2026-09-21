import { apiRequest } from "./client";
import type { Sprint, SprintStatus } from "../types/sprint";

export interface CreateSprintPayload {
  name: string;
  startDate: string;
  endDate: string;
  status?: SprintStatus;
}

/** POST /api/project/:projectId/sprint - requires project membership (LEAD or CONTRIBUTOR). */
export function createSprint(
  token: string,
  projectId: string,
  payload: CreateSprintPayload,
): Promise<Sprint> {
  return apiRequest<Sprint>(`/api/project/${projectId}/sprint`, {
    method: "POST",
    token,
    body: payload,
  });
}

/** GET /api/project/:projectId/sprint - requires project membership (any role). */
export function getSprintsForProject(
  token: string,
  projectId: string,
): Promise<Sprint[]> {
  return apiRequest<Sprint[]>(`/api/project/${projectId}/sprint`, { token });
}

/** GET /api/project/:projectId/sprint/:sprintId - requires project membership (any role). */
export function getSprintById(
  token: string,
  projectId: string,
  sprintId: string,
): Promise<Sprint> {
  return apiRequest<Sprint>(`/api/project/${projectId}/sprint/${sprintId}`, {
    token,
  });
}

export interface UpdateSprintPayload {
  name?: string;
  startDate?: string;
  endDate?: string;
  status?: SprintStatus;
}

/** PUT /api/project/:projectId/sprint/:sprintId - requires project membership (LEAD or CONTRIBUTOR). */
export function updateSprint(
  token: string,
  projectId: string,
  sprintId: string,
  payload: UpdateSprintPayload,
): Promise<Sprint> {
  return apiRequest<Sprint>(`/api/project/${projectId}/sprint/${sprintId}`, {
    method: "PUT",
    token,
    body: payload,
  });
}

/** DELETE /api/project/:projectId/sprint/:sprintId - requires project membership (LEAD only). */
export function deleteSprint(
  token: string,
  projectId: string,
  sprintId: string,
): Promise<unknown> {
  return apiRequest(`/api/project/${projectId}/sprint/${sprintId}`, {
    method: "DELETE",
    token,
  });
}
