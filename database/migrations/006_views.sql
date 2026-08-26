-- ── Migration 006: Views (GoF Facade at PostgreSQL level) ────────────────────
-- Views hide complex multi-table JOINs behind simple virtual table names.
-- Repositories query view names — JOIN logic is never duplicated.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── View 1: staff with branch (Facade over staff + branches) ─────────────────
CREATE OR REPLACE VIEW v_staff_details AS
    SELECT
        s.staff_id,
        s.first_name,
        s.last_name,
        s.email,
        s.phone,
        s.role,
        s.is_active,
        s.created_at,
        s.updated_at,
        b.branch_id,
        b.branch_name,
        b.city AS branch_city
    FROM staff s
    LEFT JOIN branches b ON s.branch_id = b.branch_id;

-- ── View 2: active accounts with staff + branch (Facade) ─────────────────────
CREATE OR REPLACE VIEW v_active_accounts AS
    SELECT
        ua.user_account_id,
        ua.username,
        ua.account_type,
        ua.is_active,
        ua.last_login_at,
        ua.created_at,
        s.staff_id,
        s.first_name,
        s.last_name,
        s.email,
        s.phone,
        s.role        AS staff_role,
        b.branch_id,
        b.branch_name,
        b.city        AS branch_city
    FROM user_accounts ua
    JOIN  staff    s ON ua.staff_id  = s.staff_id
    LEFT JOIN branches b ON s.branch_id = b.branch_id
    WHERE ua.is_active = true
      AND s.is_active  = true;

-- ── View 3: booking summary (Facade over bookings + guests + rooms + bills) ───
CREATE OR REPLACE VIEW v_booking_summary AS
    SELECT
        bk.id              AS booking_id,
        bk.booking_ref,
        bk.status          AS booking_status,
        bk.payment_status,
        bk.check_in,
        bk.check_out,
        bk.total_amount,
        bk.source,
        bk.adults,
        bk.children,
        bk.special_requests,
        bk.created_at      AS booked_at,
        g.id               AS guest_id,
        g.first_name || ' ' || g.last_name AS guest_name,
        g.email            AS guest_email,
        g.phone            AS guest_phone,
        g.loyalty_tier,
        r.id               AS room_id,
        r.number           AS room_number,
        r.type             AS room_type,
        r.floor,
        r.price_per_night,
        bl.total           AS billed_total,
        bl.tax_amount,
        bl.discount_amount,
        bl.issued_at
    FROM bookings bk
    JOIN  guests g  ON bk.guest_id  = g.id
    JOIN  rooms  r  ON bk.room_id   = r.id
    LEFT JOIN bills bl ON bk.id     = bl.booking_id;
