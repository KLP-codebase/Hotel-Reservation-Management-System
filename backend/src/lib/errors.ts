// ── Shared types ──────────────────────────────────────────────────────────────
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const Errors = {
  notFound:      (entity: string) => new AppError(404, 'NOT_FOUND', `${entity} not found`),
  unauthorized:  ()               => new AppError(401, 'UNAUTHORIZED', 'Authentication required'),
  forbidden:     ()               => new AppError(403, 'FORBIDDEN', 'Insufficient permissions'),
  badRequest:    (msg: string)    => new AppError(400, 'BAD_REQUEST', msg),
  conflict:      (msg: string)    => new AppError(409, 'CONFLICT', msg),
  invalidCreds:  ()               => new AppError(401, 'INVALID_CREDENTIALS', 'Invalid username or password'),
  internal:      ()               => new AppError(500, 'INTERNAL', 'Internal server error'),
} as const;
