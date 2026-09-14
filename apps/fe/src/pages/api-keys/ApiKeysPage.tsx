import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { generateApiKey, getLatestApiKey, revokeApiKey } from "../../api/apiKeys";
import { ApiError } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import { Alert } from "../../components/ui/Alert";
import type { ApiKeyMeta } from "../../types/apiKey";
import { clearStoredApiKey, readStoredApiKey, writeStoredApiKey } from "./apiKeyStorage";
import "./ApiKeysPage.css";

export function ApiKeysPage() {
  const { token } = useAuth();

  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<ApiKeyMeta | null>(null);
  const [rawKey, setRawKey] = useState<string | null>(null);

  const [label, setLabel] = useState("");
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  /**
   * Single source of truth for "what's the current key": re-fetches
   * GET /api-key/latest and reconciles it with whatever's cached in
   * localStorage. Callers never clear/mutate storage themselves - they just
   * call this afterward and let it decide (no active key, or a different
   * key's id than what's cached, both fall out to clearing storage here).
   */
  const refreshLatest = useCallback(async () => {
    if (!token) return;

    const latest = await getLatestApiKey(token);
    const active = latest && !latest.revokedAt ? latest : null;
    setMeta(active);

    if (!active) {
      clearStoredApiKey();
      setRawKey(null);
      return;
    }

    const stored = readStoredApiKey();
    if (stored && stored.id === active.id) {
      setRawKey(stored.apiKey);
    } else {
      if (stored) clearStoredApiKey();
      setRawKey(null);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    setLoading(true);

    refreshLatest()
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Failed to load API key status.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token, refreshLatest]);

  async function handleGenerate(event: FormEvent) {
    event.preventDefault();
    if (!token) return;

    setError(null);
    setMessage(null);
    setGenerating(true);
    try {
      const { apiKey } = await generateApiKey(token, label.trim() || undefined);

      // The key was already generated at this point - show it no matter what
      // happens next, so a hiccup fetching metadata never hides the one
      // chance the user gets to see/copy the raw value.
      setRawKey(apiKey);
      setCopied(false);
      setLabel("");
      setMessage("API key generated.");

      try {
        const latest = await getLatestApiKey(token);
        if (latest) {
          writeStoredApiKey({ id: latest.id, apiKey });
          setMeta(latest);
        }
      } catch {
        // Metadata (label/created date/id for local caching) failed to load,
        // but the raw key above is still valid and shown - not fatal.
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to generate API key.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleCopy() {
    if (!rawKey) return;
    try {
      await navigator.clipboard.writeText(rawKey);
      setCopied(true);
    } catch {
      setError("Couldn't copy to clipboard - please copy it manually.");
    }
  }

  async function handleRevoke() {
    if (!token) return;
    if (!window.confirm("Revoke your API key? Anything using it will stop working immediately.")) {
      return;
    }

    setError(null);
    setMessage(null);
    setRevoking(true);
    try {
      await revokeApiKey(token);
      await refreshLatest();
      setCopied(false);
      setMessage("API key revoked.");
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 404
          ? "No API key found to revoke."
          : err instanceof ApiError
            ? err.message
            : "Failed to revoke API key.",
      );
    } finally {
      setRevoking(false);
    }
  }

  return (
    <div>
      <h1 className="api-keys-page__title">API Key</h1>
      <p className="api-keys-page__subtitle">
        Generate an API key to authenticate webhook requests, or revoke your existing key.
      </p>

      {error && <Alert variant="error">{error}</Alert>}
      {message && <Alert variant="success">{message}</Alert>}

      {loading && <p className="api-keys-page__status">Checking for an existing key...</p>}

      {!loading && (meta || rawKey) && (
        <div className="api-keys-card">
          <h2 className="api-keys-card__title">Your API key</h2>

          {rawKey ? (
            <div className="api-keys-key-box">
              {meta && (
                <p className="api-keys-key-box__hint">
                  {meta.label ? `Label: ${meta.label}. ` : ""}
                  Created {new Date(meta.createdAt).toLocaleString()}.
                </p>
              )}
              <div className="api-keys-key-box__row">
                <code className="api-keys-key-box__value">{rawKey}</code>
                <button type="button" className="api-keys-btn" onClick={handleCopy}>
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          ) : (
            meta && (
              <div className="api-keys-key-box">
                <p className="api-keys-key-box__hint">
                  The full key isn't available on this device - it's only ever shown once, right
                  after it's generated. Here's what's on record for it:
                </p>
                <div className="api-keys-key-box__row">
                  <code className="api-keys-key-box__value">{meta.prefix}••••••••••••••••</code>
                </div>
                <p className="api-keys-key-box__hint">
                  {meta.label ? `Label: ${meta.label}. ` : ""}
                  Created {new Date(meta.createdAt).toLocaleString()}.
                </p>
              </div>
            )
          )}

          <button
            type="button"
            className="api-keys-btn api-keys-btn--danger api-keys-card__revoke"
            onClick={handleRevoke}
            disabled={revoking}
          >
            {revoking ? "Revoking..." : "Revoke API key"}
          </button>
        </div>
      )}

      {!loading && !meta && !rawKey && (
        <div className="api-keys-card">
          <h2 className="api-keys-card__title">Generate a new key</h2>
          <form className="api-keys-form" onSubmit={handleGenerate}>
            <div className="api-keys-field">
              <label htmlFor="label">Label (optional)</label>
              <input
                id="label"
                type="text"
                placeholder="e.g. survey webhook"
                value={label}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setLabel(event.target.value)}
              />
            </div>
            <button
              type="submit"
              className="api-keys-btn api-keys-btn--primary"
              disabled={generating}
            >
              {generating ? "Generating..." : "Generate key"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
