import { Request, Response, NextFunction } from 'express';
import { AccountType } from '../lib/jwt-payload.builder';
import { Errors } from '../lib/errors';

// ── GoF: Decorator ────────────────────────────────────────────────────────────
// authorize() wraps a route handler with role-based access control.
// Reads req.user (attached by authenticate Decorator).
// Returns 403 if the user's role is not in the allowed set.

export function authorize(...roles: AccountType[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(Errors.unauthorized());
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(Errors.forbidden());
      return;
    }
    next();
  };
}
