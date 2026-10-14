import { Request, Response, NextFunction } from 'express';
import { authStrategy } from '../lib/auth/auth.strategy';
import { JwtPayload } from '../lib/jwt-payload.builder';
import { Errors } from '../lib/errors';

// Extend Express Request to carry the decoded JWT payload
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

// ── GoF: Decorator ────────────────────────────────────────────────────────────
// authenticate wraps a route handler with identity verification.
// Uses AuthStrategy (GoF Strategy) to extract + verify the token.
// Attaches req.user — handlers never touch JWT directly.

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const token = authStrategy.extractFromRequest(req);
  if (!token) {
    next(Errors.unauthorized());
    return;
  }
  try {
    req.user = authStrategy.verify(token);
    next();
  } catch {
    next(Errors.unauthorized());
  }
}

// For public routes whose answer depends on who is asking (e.g. a manager sees
// only their branch): attaches req.user when a valid token is sent, never rejects.
export function optionalAuthenticate(req: Request, _res: Response, next: NextFunction): void {
  const token = authStrategy.extractFromRequest(req);
  if (token) {
    try {
      req.user = authStrategy.verify(token);
    } catch {
      // Treat a bad token as anonymous on a public route.
    }
  }
  next();
}
