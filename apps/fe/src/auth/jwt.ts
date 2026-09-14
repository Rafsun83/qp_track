interface JwtPayload {
  exp?: number;
  [key: string]: unknown;
}

/** Decodes a JWT payload without verifying the signature - fine for reading `exp` client-side. */
export function decodeJwt(token: string): JwtPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const json = decodeURIComponent(
      atob(padded)
        .split("")
        .map((char) => "%" + char.charCodeAt(0).toString(16).padStart(2, "0"))
        .join(""),
    );
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

export function getTokenExpiryMs(token: string): number | null {
  const payload = decodeJwt(token);
  if (!payload?.exp) return null;
  return payload.exp * 1000;
}

export function isTokenExpired(token: string): boolean {
  const expiryMs = getTokenExpiryMs(token);
  if (expiryMs === null) return true;
  return Date.now() >= expiryMs;
}

/** The signed-in user's id, from the `sub` claim set by the backend at login. */
export function getUserIdFromToken(token: string): string | null {
  const payload = decodeJwt(token);
  const sub = payload?.sub;
  return typeof sub === "string" ? sub : null;
}
