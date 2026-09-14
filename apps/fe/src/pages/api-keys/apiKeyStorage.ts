const STORAGE_KEY = "api_key_raw";

interface StoredApiKey {
  /** The `id` of the ApiKeyMeta this raw value belongs to, so a stale value from a revoked/replaced key is never shown as current. */
  id: string;
  apiKey: string;
}

export function readStoredApiKey(): StoredApiKey | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredApiKey) : null;
  } catch {
    return null;
  }
}

export function writeStoredApiKey(entry: StoredApiKey): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
  } catch {
    // Storage unavailable (private mode, quota, etc) - the key still works, it just won't be remembered.
  }
}

export function clearStoredApiKey(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore.
  }
}
