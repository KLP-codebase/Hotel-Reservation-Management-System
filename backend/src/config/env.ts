import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  DATABASE_URL:     z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET:       z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_EXPIRES_IN:   z.string().default('8h'),
  PORT:             z.coerce.number().default(4000),
  NODE_ENV:         z.enum(['development', 'production', 'test']).default('development'),
  ALLOWED_ORIGINS:  z.string().default('http://localhost:3000'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌  Invalid environment variables:\n', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
