import { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors';
import { ResponseFactory } from '../lib/response';

// ── GoF: Chain of Responsibility — Terminal Handler ───────────────────────────
// This is the last node in the Express middleware chain.
// AppError instances (thrown by services/middleware) are mapped to structured JSON.
// Unknown errors become 500 — never leak stack traces in production.

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.status).json(
      ResponseFactory.fail(err.message, err.code, err.status),
    );
    return;
  }

  // PostgreSQL constraint violations — surface as 409 Conflict
  if (typeof err === 'object' && err !== null && 'code' in err) {
    const pgErr = err as { code: string; detail?: string };
    if (pgErr.code === '23505') { // unique_violation
      res.status(409).json(ResponseFactory.fail('Duplicate value', 'CONFLICT', 409));
      return;
    }
    if (pgErr.code === '23503') { // foreign_key_violation
      res.status(400).json(ResponseFactory.fail('Invalid reference', 'BAD_REQUEST', 400));
      return;
    }
    if (pgErr.code === 'P0001' || pgErr.code === 'P0002') { // fn_create_staff_account / fn_deactivate_staff
      const msg = (pgErr as { message?: string }).message ?? 'Database error';
      res.status(400).json(ResponseFactory.fail(msg, 'DB_FUNCTION_ERROR', 400));
      return;
    }
  }

  console.error('[error]', err);
  res.status(500).json(ResponseFactory.fail('Internal server error', 'INTERNAL', 500));
}
