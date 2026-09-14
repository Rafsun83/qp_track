import { apiRequest } from "./client";

export interface WebhookTestResponse {
  status: string;
  userId: string;
  responseData: unknown;
}

/**
 * POST /webhook/response/test - API key only (no JWT). Dry-run of the real
 * webhook: doesn't persist anything, just echoes back what the key/body resolve to.
 */
export function testWebhook(apiKey: string, body: unknown): Promise<WebhookTestResponse> {
  return apiRequest<WebhookTestResponse>("/webhook/response/test", {
    method: "POST",
    body,
    headers: { "x-api-key": apiKey },
  });
}
