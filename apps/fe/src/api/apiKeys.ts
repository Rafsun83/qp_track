import { ApiError, apiRequest } from "./client";
import type { ApiKeyMeta, RevokedApiKey } from "../types/apiKey";

export interface GenerateApiKeyResponse {
  apiKey: string;
}

/** POST /api-key - requires auth. Returns the raw key, shown only once. */
export function generateApiKey(token: string, label?: string): Promise<GenerateApiKeyResponse> {
  return apiRequest<GenerateApiKeyResponse>("/api-key", {
    method: "POST",
    token,
    body: label ? { label } : {},
  });
}

/**
 * DELETE /api-key/delete - requires auth. Revokes a key belonging to the
 * current user (looked up by userId, not by key id - the API has no way to
 * target one key among several yet).
 */
export function revokeApiKey(token: string): Promise<RevokedApiKey> {
  return apiRequest<RevokedApiKey>("/api-key/delete", { method: "DELETE", token });
}

/**
 * GET /api-key/latest - requires auth. Never returns the raw key (only bcrypt
 * hashes are stored server-side) - just metadata for checking whether the
 * user still has an active key. Returns null instead of throwing on 404
 * (the user has never generated a key).
 */
export async function getLatestApiKey(token: string): Promise<ApiKeyMeta | null> {
  try {
    return await apiRequest<ApiKeyMeta>("/api-key/latest", { token });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}
