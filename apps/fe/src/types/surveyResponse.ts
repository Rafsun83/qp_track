export interface SurveyResponseRecord {
  id: string;
  userId: string;
  responseData: Record<string, unknown>;
  createdAt: string;
}
