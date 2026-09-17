import type { User } from "./user";

export type OrganizationRole = "OWNER" | "ADMIN" | "MEMBER";

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  role: OrganizationRole;
  joinedAt: string;
  user?: User;
  organization?: Organization;
}

export interface Organization {
  id: string;
  name: string;
  ownerId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  owner?: User;
  members?: OrganizationMember[];
}
