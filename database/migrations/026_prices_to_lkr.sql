-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 026: switch every stored price from USD to LKR (1 USD = 310 LKR)
-- ══════════════════════════════════════════════════════════════════════════════
-- Catalogue prices (what guests are quoted) are converted and rounded to the
-- nearest Rs 100. Recorded money (frozen booking rates, folio charges, invoices,
-- payments, archived totals, legacy bills) is converted exactly, so every paid
-- invoice still balances against its payments.
--
-- Columns are found by name in information_schema, so the same file works on the
-- Neon/init.sql schema and on the legacy Azure schema (bills, payments.amount_paid,
-- ...) without failing on a column one of them lacks. Generated columns are
-- skipped (they recompute from the converted inputs). Percentages
-- (tax_configurations.tax_percentage) are not prices and are left alone.
--
-- Triggers stay on (the change log records the conversion). They are safe here:
-- room-status sync and auto-billing only act when a row's status changes, which
-- this never does, and the payments legacy-sync only fills amount/amount_paid
-- when one is NULL, so converting the two columns one after the other is exact.
--
-- Not converted: JSON history (report_snapshots.report_data, audit/change logs,
-- guest_activity_archive.compressed_details). Those are point-in-time records.
-- ══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
    c          RECORD;
    v_catalogue TEXT[] := ARRAY[
        'room_types.base_daily_rate',
        'rooms.price_per_night',
        'meal_plans.price_per_night',
        'service_catalogue.base_price'
    ];
    v_recorded TEXT[] := ARRAY[
        'rate_at_booking', 'price_at_usage', 'total_price',
        'room_charges', 'service_charges', 'discount_amount', 'loyalty_discount',
        'service_charge_tax', 'sc_amount', 'tdl_amount', 'ssc_amount', 'sscl_amount',
        'vat_amount', 'tax_amount', 'subtotal', 'total', 'total_amount', 'net_amount',
        'total_room_charges', 'total_service_charges', 'amount', 'amount_paid', 'total_paid'
    ];
BEGIN
    FOR c IN
        SELECT col.table_name, col.column_name
        FROM information_schema.columns col
        JOIN information_schema.tables t
          ON t.table_schema = col.table_schema AND t.table_name = col.table_name
        WHERE col.table_schema = 'public'
          AND t.table_type = 'BASE TABLE'
          AND col.data_type IN ('numeric', 'double precision', 'real')
          AND col.is_generated = 'NEVER'
          AND (col.table_name || '.' || col.column_name = ANY (v_catalogue)
               OR col.column_name = ANY (v_recorded))
        ORDER BY 1, 2
    LOOP
        IF c.table_name || '.' || c.column_name = ANY (v_catalogue) THEN
            EXECUTE format('UPDATE %I SET %I = ROUND(%I * 310 / 100.0) * 100 WHERE %I IS NOT NULL',
                           c.table_name, c.column_name, c.column_name, c.column_name);
        ELSE
            EXECUTE format('UPDATE %I SET %I = ROUND(%I * 310, 2) WHERE %I IS NOT NULL',
                           c.table_name, c.column_name, c.column_name, c.column_name);
        END IF;
        RAISE NOTICE 'Converted %.% to LKR', c.table_name, c.column_name;
    END LOOP;

    -- New rooms default to the Standard rate in LKR (was 120.00 USD).
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'rooms'
                 AND column_name = 'price_per_night' AND column_default IS NOT NULL) THEN
        ALTER TABLE rooms ALTER COLUMN price_per_night SET DEFAULT 37200.00;
    END IF;
END;
$$;

-- Loyalty: 1 point per $10 becomes 1 point per Rs 3,100 so the earn rate is
-- unchanged. Same function as migration 024 apart from the divisor; points
-- already archived (earned in USD) are kept as they are.
CREATE OR REPLACE FUNCTION fn_archive_completed_booking(p_booking_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  v_booking     RECORD;
  v_services    JSONB;
  v_total_paid  NUMERIC(12, 2);
BEGIN
  -- Stay dates come from the room line; the legacy booking columns are only a
  -- fallback. Casting to DATE makes the subtraction an integer on every schema.
  SELECT
    b.booking_id,
    COALESCE(to_jsonb(b)->>'booking_ref', to_jsonb(b)->>'id', SUBSTRING(b.booking_id::text FROM 1 FOR 8)) AS booking_ref,
    COALESCE(b.booked_by_guest_id::text, b.guest_id::text)                 AS guest_id,
    COALESCE(br.check_in_date,  (to_jsonb(b)->>'check_in')::date)          AS check_in,
    COALESCE(br.check_out_date, (to_jsonb(b)->>'check_out')::date)         AS check_out,
    COALESCE(brh.branch_name, 'Sky Nest')                                  AS branch_name,
    COALESCE(rt.type_name, to_jsonb(r)->>'type', 'Room')                   AS room_type_name,
    COALESCE(to_jsonb(r)->>'room_number', to_jsonb(r)->>'number')          AS room_number,
    br.booking_room_id,
    br.rate_at_booking,
    COALESCE(inv.total_amount, 0.00)                                       AS invoice_total
  INTO v_booking
  FROM bookings b
  LEFT JOIN branches brh     ON brh.branch_id = b.branch_id
  LEFT JOIN booking_rooms br ON br.booking_id = b.booking_id AND br.status <> 'CANCELLED'
  LEFT JOIN rooms r          ON r.id::text = br.room_id::text
  LEFT JOIN room_types rt    ON rt.room_type_id = COALESCE(br.room_type_id, NULLIF(to_jsonb(r)->>'room_type_id', '')::int)
  LEFT JOIN invoices inv     ON inv.booking_room_id::text = br.booking_room_id::text
  WHERE b.booking_id = p_booking_id
  ORDER BY br.created_at, br.booking_room_id
  LIMIT 1;

  IF NOT FOUND OR v_booking.guest_id IS NULL
     OR v_booking.check_in IS NULL OR v_booking.check_out IS NULL THEN
    RETURN;
  END IF;

  v_total_paid := CASE
    WHEN v_booking.invoice_total > 0 THEN v_booking.invoice_total
    ELSE GREATEST(1, v_booking.check_out - v_booking.check_in) * COALESCE(v_booking.rate_at_booking, 0)
  END;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'service_name', COALESCE(sc.service_name, su.notes, 'Hotel service'),
           'category',     sc.category,
           'quantity',     su.quantity,
           'unit_price',   su.price_at_usage,
           'total_price',  su.quantity * su.price_at_usage,
           'used_at',      su.used_at
         )), '[]'::jsonb)
    INTO v_services
    FROM service_usage su
    LEFT JOIN service_catalogue sc ON sc.service_id::text = su.service_id::text
   WHERE su.booking_room_id::text = v_booking.booking_room_id::text;

  INSERT INTO guest_activity_archive (
    guest_id, booking_id, booking_ref, branch_name, room_type_name, room_number,
    check_in, check_out, nights, total_paid, loyalty_points, status, compressed_details
  ) VALUES (
    v_booking.guest_id,
    v_booking.booking_id,
    v_booking.booking_ref,
    v_booking.branch_name,
    v_booking.room_type_name,
    v_booking.room_number,
    v_booking.check_in,
    v_booking.check_out,
    GREATEST(1, v_booking.check_out - v_booking.check_in),
    v_total_paid,
    FLOOR(v_total_paid / 3100),  -- 1 point per Rs 3,100 (was 1 per $10)
    'CHECKED_OUT',
    jsonb_build_object(
      'services',       v_services,
      'rate_per_night', v_booking.rate_at_booking,
      'archived_at',    CURRENT_TIMESTAMP
    )
  )
  ON CONFLICT (booking_id) DO UPDATE SET
    total_paid         = EXCLUDED.total_paid,
    loyalty_points     = EXCLUDED.loyalty_points,
    compressed_details = EXCLUDED.compressed_details,
    archived_at        = CURRENT_TIMESTAMP;
END;
$$;
