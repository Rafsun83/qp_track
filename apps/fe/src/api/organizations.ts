import { apiRequest } from "./client";
import type { Organization, OrganizationMember, OrganizationRole } from "../types/organization";

/** POST /api/organizations - requires auth. Caller becomes the OWNER of the new org. */
export function createOrganization(token: string, name: string): Promise<Organization> {
  return apiRequest<Organization>("/api/organizations", {
    method: "POST",
    token,
    body: { name },
  });
}

/** GET /api/organizations - requires auth. Only returns organizations the caller owns. */
export function getMyOrganizations(token: string): Promise<Organization[]> {
  return apiRequest<Organization[]>("/api/organizations", { token });
}

/** GET /api/organizations/:id - requires auth. Returns null if the org doesn't exist. */
export function getOrganizationById(token: string, id: string): Promise<Organization | null> {
  return apiRequest<Organization | null>(`/api/organizations/${id}`, { token });
}

export interface AddOrganizationMemberPayload {
  userId: string;
  role: OrganizationRole;
}

/** POST /api/organizations/:id/members - requires auth. */
export function addOrganizationMember(
  token: string,
  organizationId: string,
  payload: AddOrganizationMemberPayload,
): Promise<OrganizationMember> {
  return apiRequest<OrganizationMember>(`/api/organizations/${organizationId}/members`, {
    method: "POST",
    token,
    body: payload,
  });
}

/** DELETE /api/organizations/:id/members/:userId - requires auth + OWNER role in that org. */
export function removeOrganizationMember(
  token: string,
  organizationId: string,
  userId: string,
): Promise<unknown> {
  return apiRequest(`/api/organizations/${organizationId}/members/${userId}`, {
    method: "DELETE",
    token,
  });
}
