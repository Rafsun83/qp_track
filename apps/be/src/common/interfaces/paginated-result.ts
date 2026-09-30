import type { PaginationMeta } from './api-response.interface.js';

// Return this from a service/handler to get a paginated envelope:
// ResponseInterceptor unwraps `items` into `data` and `pagination` alongside it.
export class PaginatedResult<T> {
  readonly pagination: PaginationMeta;

  constructor(
    readonly items: T[],
    total: number,
    page: number,
    limit: number,
  ) {
    const totalPages = Math.ceil(total / limit);
    this.pagination = {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }
}
