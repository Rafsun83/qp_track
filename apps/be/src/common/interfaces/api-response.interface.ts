export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
  // Only present when the handler returned a PaginatedResult.
  pagination?: PaginationMeta;
  timestamp: string;
}
