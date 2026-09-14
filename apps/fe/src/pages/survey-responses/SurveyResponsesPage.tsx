import { useEffect, useState, type ChangeEvent } from "react";
import { getSurveyResponses } from "../../api/surveyResponses";
import { useAuth } from "../../auth/AuthContext";
import type { SurveyResponseRecord } from "../../types/surveyResponse";
import "./SurveyResponsesPage.css";

const SEARCH_DEBOUNCE_MS = 300;

/** The webhook accepts any JSON shape, so survey id/name are read defensively. */
function getSurveyId(record: SurveyResponseRecord): string {
  const value = record.responseData?.surveyId;
  return typeof value === "string" || typeof value === "number" ? String(value) : "—";
}

function getSurveyName(record: SurveyResponseRecord): string {
  const value = record.responseData?.surveyName ?? record.responseData?.name;
  return typeof value === "string" ? value : "—";
}

export function SurveyResponsesPage() {
  const { token } = useAuth();

  const [userIdInput, setUserIdInput] = useState("");
  const [debouncedUserId, setDebouncedUserId] = useState("");

  const [responses, setResponses] = useState<SurveyResponseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedUserId(userIdInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [userIdInput]);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    getSurveyResponses(token, { userId: debouncedUserId || undefined })
      .then((data) => {
        if (!cancelled) setResponses(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load survey responses.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token, debouncedUserId]);

  return (
    <div>
      <h1 className="survey-responses-page__title">Survey Response</h1>
      <p className="survey-responses-page__subtitle">
        All responses received via the webhook.
      </p>

      <div className="survey-responses-filters">
        <div className="survey-responses-filters__field">
          <label htmlFor="userId-filter">Filter by user ID</label>
          <input
            id="userId-filter"
            type="text"
            placeholder="e.g. df7db73d-f047-44d5-9d51-62ec043bfe0e"
            value={userIdInput}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setUserIdInput(event.target.value)}
          />
        </div>
        {userIdInput !== "" && (
          <button
            type="button"
            className="survey-responses-filters__clear"
            onClick={() => setUserIdInput("")}
          >
            Clear filter
          </button>
        )}
      </div>

      {loading && <p className="survey-responses-page__status">Loading survey responses...</p>}
      {!loading && error && <p className="survey-responses-page__status">{error}</p>}
      {!loading && !error && responses.length === 0 && (
        <p className="survey-responses-page__status">No survey responses yet.</p>
      )}

      {!loading && !error && responses.length > 0 && (
        <div className="survey-responses-table-wrap">
          <table className="survey-responses-table">
            <thead>
              <tr>
                <th>Survey ID</th>
                <th>Survey name</th>
                <th>Response</th>
                <th>User ID</th>
                <th>Received</th>
              </tr>
            </thead>
            <tbody>
              {responses.map((record) => (
                <tr key={record.id}>
                  <td>{getSurveyId(record)}</td>
                  <td>{getSurveyName(record)}</td>
                  <td>
                    <pre className="survey-responses-table__json">
                      {JSON.stringify(record.responseData, null, 2)}
                    </pre>
                  </td>
                  <td>{record.userId}</td>
                  <td>{new Date(record.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
