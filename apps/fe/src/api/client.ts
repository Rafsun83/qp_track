export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

/** Wired up by AuthProvider so a 401 on an authenticated request logs the user out. */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  token?: string | null;
  /** Extra headers, e.g. `x-api-key` for API-key-protected endpoints. */
  headers?: Record<string, string>;
}

function extractErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "message" in body) {
    const message = (body as { message?: unknown }).message;
    if (Array.isArray(message)) return message.join(", ");
    if (typeof message === "string") return message;
  }
  return fallback;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, token, headers: extraHeaders } = options;

  const headers: Record<string, string> = { ...extraHeaders };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  const parsed = text ? JSON.parse(text) : null;

  if (!response.ok) {
    // Only treat this as a session expiry if the request was actually authenticated -
    // a 401 from /auth/login just means wrong credentials, not an expired session.
    if (response.status === 401 && token) {
      unauthorizedHandler?.();
    }
    // Error responses are NOT wrapped in the envelope below - they bypass the
    // backend's ResponseInterceptor entirely (exceptions skip interceptors),
    // so they keep their original { message, error, statusCode } shape.
    throw new ApiError(response.status, extractErrorMessage(parsed, response.statusText), parsed);
  }

  // Every successful backend response is wrapped in a shared envelope:
  // { statusCode, message, data, timestamp }. Unwrap it here, once, so
  // every caller of apiRequest keeps getting back the plain payload it
  // already expects - falls back to the raw body if something unwrapped
  // ever shows up unexpectedly, rather than throwing.
  return (parsed && typeof parsed === "object" && "data" in parsed
    ? (parsed as { data: unknown }).data
    : parsed) as T;
}
