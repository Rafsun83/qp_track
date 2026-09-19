import { apiRequest } from "./client";
import type { Project, ProjectStatus } from "../types/project";

export interface CreateProjectPayload {
  name: string;
  description: string;
  key: string;
}

/** POST /api/organization/:organizationId/project - requires auth + OWNER/ADMIN role in that org. */
export function createProject(
  token: string,
  organizationId: string,
  payload: CreateProjectPayload,
): Promise<Project> {
  return apiRequest<Project>(`/api/organization/${organizationId}/project`, {
    method: "POST",
    token,
    body: payload,
  });
}

/** GET /api/organization/:organizationId/project - requires auth + OWNER role in that org. */
export function getProjectsInOrganization(
  token: string,
  organizationId: string,
): Promise<Project[]> {
  return apiRequest<Project[]>(`/api/organization/${organizationId}/project`, {
    token,
  });
}

/** GET /api/organization/:organizationId/project/:id - requires auth. Returns null if not found. */
export function getProjectById(
  token: string,
  organizationId: string,
  projectId: string,
): Promise<Project | null> {
  return apiRequest<Project | null>(
    `/api/organization/${organizationId}/project/${projectId}`,
    { token },
  );
}

export interface UpdateProjectPayload {
  name?: string;
  description?: string;
  key?: string;
  status?: ProjectStatus;
}

/** PATCH /api/organization/:organizationId/project/:id - requires auth + OWNER/ADMIN role in that org. */
export function updateProject(
  token: string,
  organizationId: string,
  projectId: string,
  payload: UpdateProjectPayload,
): Promise<Project> {
  return apiRequest<Project>(
    `/api/organization/${organizationId}/project/${projectId}`,
    {
      method: "PATCH",
      token,
      body: payload,
    },
  );
}

/** DELETE /api/organization/:organizationId/project/:id - requires auth + OWNER role in that org. */
export function deleteProject(
  token: string,
  organizationId: string,
  projectId: string,
): Promise<unknown> {
  return apiRequest(
    `/api/organization/${organizationId}/project/${projectId}`,
    {
      method: "DELETE",
      token,
    },
  );
}
