-- ============================================================================
-- Migration 019: Competitive Booking Room Holds (Two-Tier Concurrency Control)
-- ============================================================================
-- Prevents race conditions when two or more users attempt to book the same room
-- on the same or overlapping dates by creating an ephemeral hold when entering
-- the designated booking confirmation page.
-- ============================================================================

CREATE TABLE IF NOT EXISTS room_holds (
    hold_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id VARCHAR(36) NOT NULL,
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    session_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '10 minutes')
);

CREATE INDEX IF NOT EXISTS idx_room_holds_lookup 
ON room_holds(room_id, check_in_date, check_out_date, expires_at);
