-- ============================================================================
-- Migration 020: Trusted Guest Devices (30-day Device Trust for 2FA Bypass)
-- ============================================================================
-- Stores cryptographically hashed device trust tokens to allow returning guest
-- devices to bypass the email sign-in challenge for up to 30 days.
-- ============================================================================

CREATE TABLE IF NOT EXISTS trusted_guest_devices (
    device_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_account_id UUID NOT NULL REFERENCES user_accounts(user_account_id) ON DELETE CASCADE,
    device_token_hash VARCHAR(64) NOT NULL UNIQUE,
    device_name VARCHAR(255),
    ip_address VARCHAR(50),
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_trusted_devices_lookup 
ON trusted_guest_devices(device_token_hash, user_account_id, expires_at);

CREATE INDEX IF NOT EXISTS idx_trusted_devices_user 
ON trusted_guest_devices(user_account_id);
