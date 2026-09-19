export type ProjectStatus =
  | "PLANNING"
  | "ACTIVE"
  | "ON_HOLD"
  | "COMPLETED"
  | "ARCHIVED"
  | "CANCELLED";

export type ProjectRole = "LEAD" | "CONTRIBUTOR" | "VIEWER";

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectRole;
  addedAt: string;
}

export interface Project {
  id: string;
  organizationId: string;
  name: string;
  key: string;
  description: string;
  status: ProjectStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  members?: ProjectMember[];
}
