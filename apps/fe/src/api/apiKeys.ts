import { apiRequest } from "./client";
import type { RevokedApiKey } from "../types/apiKey";

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
