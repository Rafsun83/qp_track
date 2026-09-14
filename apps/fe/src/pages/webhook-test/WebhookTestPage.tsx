import { useState, type ChangeEvent, type FormEvent } from "react";
import { testWebhook, type WebhookTestResponse } from "../../api/webhook";
import { ApiError } from "../../api/client";
import { Alert } from "../../components/ui/Alert";
import "./WebhookTestPage.css";

const DEFAULT_BODY = `{
  "surveyId": "abc123",
  "surveyName": "Customer Satisfaction",
  "answers": { "q1": "yes" }
}`;

type Result = { kind: "success"; data: WebhookTestResponse } | { kind: "error"; message: string };

export function WebhookTestPage() {
  const [apiKey, setApiKey] = useState("");
  const [bodyText, setBodyText] = useState(DEFAULT_BODY);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setResult(null);

    let parsedBody: unknown;
    try {
      parsedBody = bodyText.trim() ? JSON.parse(bodyText) : {};
    } catch {
      setResult({ kind: "error", message: "Body must be valid JSON." });
      return;
    }

    setSubmitting(true);
    try {
      const data = await testWebhook(apiKey.trim(), parsedBody);
      setResult({ kind: "success", data });
    } catch (err) {
      setResult({
        kind: "error",
        message: err instanceof ApiError ? err.message : "Failed to reach the webhook.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="webhook-test-page__title">Webhook Test</h1>
      <p className="webhook-test-page__subtitle">
        Send a test request to <code>POST /webhook/response/test</code> - nothing is saved, this
        only checks that your API key and payload are valid.
      </p>

      <form className="webhook-test-form" onSubmit={handleSubmit}>
        <div className="webhook-test-field">
          <label htmlFor="apiKey">x-api-key header</label>
          <input
            id="apiKey"
            type="text"
            placeholder="sk-live_..."
            required
            value={apiKey}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setApiKey(event.target.value)}
          />
        </div>

        <div className="webhook-test-field">
          <label htmlFor="body">Request body (JSON)</label>
          <textarea
            id="body"
            rows={10}
            required
            value={bodyText}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setBodyText(event.target.value)}
          />
        </div>

        <button type="submit" className="webhook-test-submit" disabled={submitting}>
          {submitting ? "Sending..." : "Send test request"}
        </button>
      </form>

      {result && (
        <div className="webhook-test-result">
          {result.kind === "success" ? (
            <>
              <Alert variant="success">Webhook responded successfully.</Alert>
              <pre className="webhook-test-result__json">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            </>
          ) : (
            <Alert variant="error">{result.message}</Alert>
          )}
        </div>
      )}
    </div>
  );
}
