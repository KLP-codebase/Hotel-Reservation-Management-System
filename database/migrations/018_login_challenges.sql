-- Migration 018: Add login_challenges table for email sign-in authorization (2FA)
-- Applied to live Neon PostgreSQL on 2026-10-10

CREATE TABLE IF NOT EXISTS login_challenges (
  challenge_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_account_id UUID NOT NULL REFERENCES user_accounts(user_account_id) ON DELETE CASCADE,
  auth_token VARCHAR(128) NOT NULL UNIQUE,
  otp_code VARCHAR(10) NOT NULL,
  ip_address VARCHAR(50),
  user_agent VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_login_challenges_token ON login_challenges(auth_token);
CREATE INDEX IF NOT EXISTS idx_login_challenges_status ON login_challenges(challenge_id, status);
