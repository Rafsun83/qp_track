import { apiRequest } from "./client";
import type { ProjectMember, ProjectRole } from "../types/project";

export interface AddProjectMemberPayload {
  userId: string;
  role: ProjectRole;
}

/** POST /api/project/:projectId/member - requires auth (JWT) only. */
export function addProjectMember(
  token: string,
  projectId: string,
  payload: AddProjectMemberPayload,
): Promise<ProjectMember> {
  return apiRequest<ProjectMember>(`/api/project/${projectId}/member`, {
    method: "POST",
    token,
    body: payload,
  });
}

/** DELETE /api/project/:projectId/member/:userId - requires auth (JWT) only. */
export function removeProjectMember(
  token: string,
  projectId: string,
  userId: string,
): Promise<unknown> {
  return apiRequest(`/api/project/${projectId}/member/${userId}`, {
    method: "DELETE",
    token,
  });
}

export interface UpdateProjectMemberRolePayload {
  role: ProjectRole;
}

/** PATCH /api/project/:projectId/member/:userId - requires auth (JWT) only. */
export function updateProjectMemberRole(
  token: string,
  projectId: string,
  userId: string,
  payload: UpdateProjectMemberRolePayload,
): Promise<ProjectMember> {
  return apiRequest<ProjectMember>(
    `/api/project/${projectId}/member/${userId}`,
    {
      method: "PATCH",
      token,
      body: payload,
    },
  );
}
