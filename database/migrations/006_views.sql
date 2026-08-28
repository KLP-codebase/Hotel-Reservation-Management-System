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

-- v_booking_summary removed — depends on bookings, guests, bills, loyalty_tier (Reservation & Billing modules).
