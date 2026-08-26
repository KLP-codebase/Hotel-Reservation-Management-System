// ── GoF: Factory Method ───────────────────────────────────────────────────────
// ResponseFactory produces typed API response objects.
// Routes call factory methods — never construct raw JSON shapes.
// Adding a new response shape requires only one new static method here.

export interface ApiResponse<T> {
  success: true;
  message: string;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  code: string;
  status: number;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export class ResponseFactory {
  static ok<T>(data: T, message = 'Success'): ApiResponse<T> {
    return { success: true, message, data };
  }

  static created<T>(data: T, message = 'Created'): ApiResponse<T> {
    return { success: true, message, data };
  }

  static paginated<T>(
    items: T[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedResponse<T> {
    return {
      success: true,
      data: items,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  static fail(
    message: string,
    code: string,
    status: number,
    errors?: Record<string, string[]>,
  ): ApiErrorResponse {
    return { success: false, message, code, status, ...(errors ? { errors } : {}) };
  }
}
