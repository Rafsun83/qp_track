import type { OrganizationMember } from "./organization";

export interface User {
  id: string;
  name: string;
  loginCount: number;
  email: string;
  location: string;
  userName: string;
  createdAt: string;
  memberships?: OrganizationMember[];
}
