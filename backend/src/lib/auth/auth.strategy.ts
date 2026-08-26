import jwt from 'jsonwebtoken';
import { Request } from 'express';
import { env } from '../../config/env';
import { JwtPayload } from '../jwt-payload.builder';

// ── GoF: Strategy ─────────────────────────────────────────────────────────────
// AuthStrategy defines the contract for any auth mechanism.
// Middleware is coded to the interface — not to jsonwebtoken directly.
// Swapping to opaque session tokens requires only a new concrete Strategy class.

export interface AuthStrategy {
  sign(payload: JwtPayload): string;
  verify(token: string): JwtPayload;
  extractFromRequest(req: Request): string | null;
}

// ── Concrete Strategy: JWT ────────────────────────────────────────────────────
export class JwtStrategy implements AuthStrategy {
  sign(payload: JwtPayload): string {
    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    });
  }

  verify(token: string): JwtPayload {
    return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  }

  extractFromRequest(req: Request): string | null {
    const auth = req.headers.authorization;
    if (auth?.startsWith('Bearer ')) return auth.slice(7);
    // Also check httpOnly cookie as fallback
    const cookie = (req as Request & { cookies?: Record<string, string> }).cookies?.sn_token;
    return cookie ?? null;
  }
}

// Singleton instance exported for use in middleware + services
export const authStrategy: AuthStrategy = new JwtStrategy();
