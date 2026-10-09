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
  emailNotVerified: (msg?: string) => new AppError(403, 'EMAIL_NOT_VERIFIED', msg ?? 'Please verify your email before logging in.'),
  forbidden:     (msg?: string)   => new AppError(403, 'FORBIDDEN', msg ?? 'Insufficient permissions'),
  badRequest:    (msg: string)    => new AppError(400, 'BAD_REQUEST', msg),
  conflict:      (msg: string)    => new AppError(409, 'CONFLICT', msg),
  invalidCreds:  ()               => new AppError(401, 'INVALID_CREDENTIALS', 'Invalid username or password'),
  internal:      ()               => new AppError(500, 'INTERNAL', 'Internal server error'),
  dbUnavailable: ()               => new AppError(503, 'DB_UNAVAILABLE', 'The database is temporarily unavailable. Please try again shortly.'),
} as const;
