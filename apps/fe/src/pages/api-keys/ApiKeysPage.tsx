import { useState, type ChangeEvent, type FormEvent } from "react";
import { generateApiKey, revokeApiKey } from "../../api/apiKeys";
import { ApiError } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import { Alert } from "../../components/ui/Alert";
import "./ApiKeysPage.css";

export function ApiKeysPage() {
  const { token } = useAuth();

  const [label, setLabel] = useState("");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleGenerate(event: FormEvent) {
    event.preventDefault();
    if (!token) return;

    setError(null);
    setMessage(null);
    setGenerating(true);
    try {
      const { apiKey } = await generateApiKey(token, label.trim() || undefined);
      setGeneratedKey(apiKey);
      setCopied(false);
      setLabel("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to generate API key.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleCopy() {
    if (!generatedKey) return;
    try {
      await navigator.clipboard.writeText(generatedKey);
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
      setMessage("API key revoked.");
      setGeneratedKey(null);
      setCopied(false);
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
          <button type="submit" className="api-keys-btn api-keys-btn--primary" disabled={generating}>
            {generating ? "Generating..." : "Generate key"}
          </button>
        </form>

        {generatedKey && (
          <div className="api-keys-key-box">
            <p className="api-keys-key-box__hint">
              Save this now - it's shown only once and can't be retrieved again.
            </p>
            <div className="api-keys-key-box__row">
              <code className="api-keys-key-box__value">{generatedKey}</code>
              <button type="button" className="api-keys-btn" onClick={handleCopy}>
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="api-keys-card">
        <h2 className="api-keys-card__title">Revoke key</h2>
        <p className="api-keys-card__text">
          This revokes your API key. Any request using it (including the webhook test page) will
          be rejected afterward.
        </p>
        <button
          type="button"
          className="api-keys-btn api-keys-btn--danger"
          onClick={handleRevoke}
          disabled={revoking}
        >
          {revoking ? "Revoking..." : "Revoke API key"}
        </button>
      </div>
    </div>
  );
}
