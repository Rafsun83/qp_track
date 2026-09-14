import { apiRequest } from "./client";
import type { User } from "../types/user";

/** GET /api/users/:id - requires auth. */
export function getUserById(token: string, id: string): Promise<User> {
  return apiRequest<User>(`/api/users/${id}`, { token });
}
