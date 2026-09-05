import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ResponseFactory } from '../lib/response';

// ── GoF: Decorator ────────────────────────────────────────────────────────────
// validate() wraps a route handler with input validation.
// The route handler is unaware of validation — it only receives valid data.

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const fieldErrors = (result.error as ZodError).flatten().fieldErrors as Record<string, string[]>;
      res.status(422).json(
        ResponseFactory.fail('Validation failed', 'VALIDATION_ERROR', 422, fieldErrors),
      );
      return;
    }
    req.body = result.data;
    next();
  };
}
