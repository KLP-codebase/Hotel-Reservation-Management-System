import path from 'path';
import dotenv from 'dotenv';
import { z } from 'zod';

// Explicitly load backend/.env as mandated by AGENTS.md
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: false });

const envSchema = z.object({
  DATABASE_URL:     z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET:       z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_EXPIRES_IN:   z.string().default('8h'),
  PORT:             z.coerce.number().default(4000),
  NODE_ENV:         z.enum(['development', 'production', 'test']).default('development'),
  ALLOWED_ORIGINS:  z.string().default('http://localhost:3000'),

  // ── Email Delivery Strategy ───────────────────────────────────────
  EMAIL_PROVIDER:   z.enum(['smtp', 'resend', 'console']).default('console'),
  EMAIL_FROM:       z.string().min(1, 'EMAIL_FROM is required').refine(
                      (val) => val.includes('@'),
                      'EMAIL_FROM must contain a valid email address'
                    ).default('noreply@skynest.lk'),
  APP_URL:          z.string().url().default('http://localhost:3000'),
  CONTACT_INBOX_EMAIL: z.string().email().default('ashinthyajayakody@gmail.com'),

  // ── Gemini AI ──────────────────────────────────────────────────────
  GEMINI_API_KEY:   z.string().optional(),

  // Resend (required when EMAIL_PROVIDER=resend, optional otherwise)
  RESEND_API_KEY:   z.string().optional(),

  // SMTP / Nodemailer (required when EMAIL_PROVIDER=smtp, optional otherwise)
  SMTP_HOST:        z.string().optional(),
  SMTP_PORT:        z.coerce.number().optional(),
  SMTP_SECURE:      z.string().transform((v) => v === 'true').optional(),
  SMTP_USER:        z.string().optional(),
  SMTP_PASS:        z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.EMAIL_PROVIDER === 'resend') {
    if (!data.RESEND_API_KEY || !data.RESEND_API_KEY.startsWith('re_')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'RESEND_API_KEY is required and must start with "re_" when EMAIL_PROVIDER=resend',
        path: ['RESEND_API_KEY'],
      });
    }
  }

  if (data.EMAIL_PROVIDER === 'smtp') {
    if (!data.SMTP_HOST) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'SMTP_HOST is required when EMAIL_PROVIDER=smtp', path: ['SMTP_HOST'] });
    }
    if (!data.SMTP_PORT) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'SMTP_PORT is required when EMAIL_PROVIDER=smtp', path: ['SMTP_PORT'] });
    }
    if (!data.SMTP_USER) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'SMTP_USER is required when EMAIL_PROVIDER=smtp', path: ['SMTP_USER'] });
    }
    if (!data.SMTP_PASS) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'SMTP_PASS is required when EMAIL_PROVIDER=smtp', path: ['SMTP_PASS'] });
    }
  }
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌  Invalid environment variables:\n', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
