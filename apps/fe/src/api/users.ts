import { apiRequest } from "./client";
import type { User } from "../types/user";

/** GET /api/users/:id - requires auth. */
export function getUserById(token: string, id: string): Promise<User> {
  return apiRequest<User>(`/api/users/${id}`, { token });
}

/** GET /api/users?userName=... - requires auth. Search: userName contains this text. */
export function searchUsersByUserName(token: string, userName: string): Promise<User[]> {
  const query = new URLSearchParams({ userName });
  return apiRequest<User[]>(`/api/users?${query.toString()}`, { token });
}
