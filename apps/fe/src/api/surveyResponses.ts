import { apiRequest } from "./client";
import type { SurveyResponseRecord } from "../types/surveyResponse";

export interface SurveyResponsesQuery {
  userId?: string;
}

/** GET /api/survey-response - requires auth. `userId` is an optional filter. */
export function getSurveyResponses(
  token: string,
  query: SurveyResponsesQuery = {},
): Promise<SurveyResponseRecord[]> {
  const params = new URLSearchParams();
  if (query.userId) params.set("userId", query.userId);

  const qs = params.toString();
  return apiRequest<SurveyResponseRecord[]>(`/api/survey-response${qs ? `?${qs}` : ""}`, {
    token,
  });
}
