-- ════════════════════════════════════════════════════════════════════════════
-- 011 — Double-booking guard for the LIVE (Railway) schema
-- ════════════════════════════════════════════════════════════════════════════
-- init.sql declares btree_gist, the no_double_booking exclusion constraint and
-- fn_check_room_availability(), but none of them were ever applied to Railway
-- (verified 2026-09-26). This migration applies them.
--
-- Live-schema note: booking_rooms.room_id is VARCHAR (→ rooms.id), not INT as
-- in init.sql, so fn_check_room_availability takes a VARCHAR room id here.
--
-- Safe to re-run: every step is idempotent. Runs as one transaction.
-- Pre-check (must return 0 rows, otherwise the constraint cannot be added):
--   SELECT a.booking_room_id, b.booking_room_id
--   FROM booking_rooms a JOIN booking_rooms b
--     ON a.room_id = b.room_id AND a.booking_room_id < b.booking_room_id
--    AND daterange(a.check_in_date, a.check_out_date) && daterange(b.check_in_date, b.check_out_date)
--    AND a.status <> 'CANCELLED' AND b.status <> 'CANCELLED';
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- Lets a GiST index compare plain scalar columns (room_id) with "=".
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- The database itself now refuses two non-cancelled room lines for the same
-- room whose [check_in, check_out) date ranges overlap. Back-to-back stays
-- (check-in on another guest's check-out day) are allowed.
DO $$ BEGIN
    ALTER TABLE booking_rooms
        ADD CONSTRAINT no_double_booking
        EXCLUDE USING gist (
            room_id WITH =,
            daterange(check_in_date, check_out_date, '[)') WITH &&
        )
        WHERE (status <> 'CANCELLED');
EXCEPTION WHEN duplicate_table OR duplicate_object THEN null; END $$;

-- Stored-function version of the availability check (TRUE = room is free).
CREATE OR REPLACE FUNCTION fn_check_room_availability(
    p_room_id      VARCHAR,
    p_check_in     DATE,
    p_check_out    DATE,
    p_exclude_booking_room_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_conflict_count INT;
BEGIN
    IF p_check_out <= p_check_in THEN
        RAISE EXCEPTION 'check_out_date must be after check_in_date';
    END IF;

    SELECT COUNT(*) INTO v_conflict_count
    FROM booking_rooms
    WHERE room_id        = p_room_id
      AND status        <> 'CANCELLED'
      AND booking_room_id <> COALESCE(p_exclude_booking_room_id, '00000000-0000-0000-0000-000000000000'::UUID)
      AND check_in_date  < p_check_out
      AND check_out_date > p_check_in;

    RETURN v_conflict_count = 0;
END;
$$;

COMMIT;
