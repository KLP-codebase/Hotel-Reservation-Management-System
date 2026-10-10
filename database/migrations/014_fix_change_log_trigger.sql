-- ════════════════════════════════════════════════════════════════════════════
-- 014 — fn_log_table_changes(): stop failing on tables without every key column
-- ════════════════════════════════════════════════════════════════════════════
-- The previous body picked the record id with a CASE of NEW.booking_id /
-- NEW.guest_id / NEW.invoice_id ... . PL/pgSQL plans that CASE as ONE expression,
-- so every field must exist on the row being written. Inserting into guests
-- failed with: record "new" has no field "booking_id".
-- The key column is now looked up by name from the row's JSON form instead.
-- Idempotent.
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION fn_log_table_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_key    TEXT;
    v_rec_id TEXT;
BEGIN
    v_key := CASE TG_TABLE_NAME
        WHEN 'bookings'      THEN 'booking_id'
        WHEN 'booking_rooms' THEN 'booking_room_id'
        WHEN 'guests'        THEN 'guest_id'
        WHEN 'invoices'      THEN 'invoice_id'
        WHEN 'service_usage' THEN 'usage_id'
        ELSE 'booking_room_id'
    END;

    IF TG_OP = 'DELETE' THEN
        v_rec_id := COALESCE(to_jsonb(OLD) ->> v_key, 'UNKNOWN');

        INSERT INTO change_log (table_name, record_id, operation, old_data, new_data, db_user)
        VALUES (TG_TABLE_NAME, v_rec_id, 'DELETE', to_jsonb(OLD), NULL, CURRENT_USER);
        RETURN OLD;

    ELSIF TG_OP = 'UPDATE' THEN
        v_rec_id := COALESCE(to_jsonb(NEW) ->> v_key, 'UNKNOWN');

        INSERT INTO change_log (table_name, record_id, operation, old_data, new_data, db_user)
        VALUES (TG_TABLE_NAME, v_rec_id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), CURRENT_USER);
        RETURN NEW;

    ELSIF TG_OP = 'INSERT' THEN
        v_rec_id := COALESCE(to_jsonb(NEW) ->> v_key, 'UNKNOWN');

        INSERT INTO change_log (table_name, record_id, operation, old_data, new_data, db_user)
        VALUES (TG_TABLE_NAME, v_rec_id, 'INSERT', NULL, to_jsonb(NEW), CURRENT_USER);
        RETURN NEW;
    END IF;

    RETURN NULL;
END;
$$;
