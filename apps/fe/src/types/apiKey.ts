export interface ApiKeyMeta {
  id: string;
  userId: string;
  prefix: string;
  label: string | null;
  createdAt: string;
  lastUpdatedAt: string | null;
  revokedAt: string | null;
}

export type RevokedApiKey = ApiKeyMeta;
