-- ════════════════════════════════════════════════════════════════════════════
-- 015 — booking_rooms.primary_guest_id: UUID FK -> VARCHAR(36) holding guests.id
-- ════════════════════════════════════════════════════════════════════════════
-- Same convention as bookings.booked_by_guest_id (see 013): the backend resolves
-- every guest reference to guests.id and stores that, with no foreign key.
-- Existing values (guests.guest_id) are rewritten to the matching guests.id.
-- Idempotent, one transaction.
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

DO $$
DECLARE c TEXT;
BEGIN
    IF (SELECT data_type FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'booking_rooms'
           AND column_name = 'primary_guest_id') = 'uuid' THEN
        FOR c IN
            SELECT conname FROM pg_constraint
             WHERE conrelid = 'booking_rooms'::regclass AND contype = 'f'
               AND conkey = ARRAY[(SELECT attnum FROM pg_attribute
                                    WHERE attrelid = 'booking_rooms'::regclass
                                      AND attname = 'primary_guest_id')]
        LOOP
            EXECUTE format('ALTER TABLE booking_rooms DROP CONSTRAINT %I', c);
        END LOOP;
        ALTER TABLE booking_rooms ALTER COLUMN primary_guest_id TYPE VARCHAR(36)
            USING primary_guest_id::text;
        UPDATE booking_rooms br SET primary_guest_id = g.id
          FROM guests g WHERE g.guest_id::text = br.primary_guest_id;
    END IF;
END $$;

COMMIT;
