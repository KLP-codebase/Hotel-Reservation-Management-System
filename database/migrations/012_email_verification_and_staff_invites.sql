-- Migration 012: Add email verification and staff invitation columns
-- Applied to live Railway PostgreSQL on 2026-10-03

-- 1. Add verification columns to user_accounts for guests
ALTER TABLE user_accounts
ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS verification_token VARCHAR(128) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS verification_token_expires_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_verification_sent_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Add invitation columns to staff table for clean staff onboarding
ALTER TABLE staff
ADD COLUMN IF NOT EXISTS invite_token VARCHAR(128) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS invite_token_expires_at TIMESTAMPTZ DEFAULT NULL;

-- 3. Backfill existing active user_accounts as verified
UPDATE user_accounts
SET is_email_verified = TRUE
WHERE is_email_verified = FALSE;

-- 4. Create lookup indexes for fast token resolution
CREATE INDEX IF NOT EXISTS idx_user_accounts_verification_token
ON user_accounts(verification_token)
WHERE verification_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_staff_invite_token
ON staff(invite_token)
WHERE invite_token IS NOT NULL;
