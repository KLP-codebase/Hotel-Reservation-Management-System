-- ── Migration 007: Stored Functions (GoF Template Method at PostgreSQL level) ──
-- Functions define a fixed multi-step algorithm skeleton.
-- Steps: validate → mutate → return — handled atomically inside PostgreSQL.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Function 1: create staff + user_account atomically ───────────────────────
DROP FUNCTION IF EXISTS fn_create_staff_account;
CREATE OR REPLACE FUNCTION fn_create_staff_account(
    p_branch_id      UUID,
    p_first_name     VARCHAR,
    p_last_name      VARCHAR,
    p_email          VARCHAR,
    p_phone          VARCHAR,
    p_role           account_type,
    p_username       VARCHAR,
    p_password_hash  VARCHAR
) RETURNS TABLE(out_staff_id UUID, out_user_account_id UUID)
LANGUAGE plpgsql AS $$
DECLARE
    v_staff_id        UUID;
    v_user_account_id UUID;
BEGIN
    -- Step 0: GoF Singleton Pattern Check for Administrator
    IF p_role = 'ADMINISTRATOR' AND EXISTS (
        SELECT 1 FROM user_accounts WHERE account_type = 'ADMINISTRATOR'
    ) THEN
        RAISE EXCEPTION 'Singleton Violation: An Administrator account already exists. Only one Administrator instance is permitted.'
            USING ERRCODE = '23505';
    END IF;

    -- Step 1: validate branch (if provided)
    IF p_branch_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM branches WHERE branch_id = p_branch_id AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Branch % not found or inactive', p_branch_id
            USING ERRCODE = 'P0001';
    END IF;

    -- Step 2: create staff record
    INSERT INTO staff (branch_id, first_name, last_name, email, phone, role)
    VALUES (p_branch_id, p_first_name, p_last_name, p_email, p_phone, p_role)
    RETURNING staff_id INTO v_staff_id;

    -- Step 3: create linked user account
    INSERT INTO user_accounts (staff_id, username, password_hash, account_type)
    VALUES (v_staff_id, p_username, p_password_hash, p_role)
    RETURNING user_account_id INTO v_user_account_id;

    -- Step 4: return both generated IDs
    RETURN QUERY SELECT v_staff_id, v_user_account_id;
END;
$$;

-- ── Function 2: soft-deactivate staff + account atomically ───────────────────
DROP FUNCTION IF EXISTS fn_deactivate_staff(UUID);
CREATE OR REPLACE FUNCTION fn_deactivate_staff(p_staff_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    -- Step 1: validate staff exists
    IF NOT EXISTS (SELECT 1 FROM staff WHERE staff_id = p_staff_id) THEN
        RAISE EXCEPTION 'Staff % not found', p_staff_id
            USING ERRCODE = 'P0002';
    END IF;

    -- Step 2: deactivate staff record (triggers fire: updated_at + audit)
    UPDATE staff
    SET is_active = false
    WHERE staff_id = p_staff_id;

    -- Step 3: deactivate linked user account
    UPDATE user_accounts
    SET is_active = false
    WHERE staff_id = p_staff_id;
END;
$$;

-- ── Function 3: update staff + optionally reassign branch ─────────────────────
DROP FUNCTION IF EXISTS fn_update_staff;
CREATE OR REPLACE FUNCTION fn_update_staff(
    p_staff_id   UUID,
    p_first_name VARCHAR DEFAULT NULL,
    p_last_name  VARCHAR DEFAULT NULL,
    p_phone      VARCHAR DEFAULT NULL,
    p_role       account_type DEFAULT NULL,
    p_branch_id  UUID DEFAULT NULL
) RETURNS SETOF v_staff_details
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE staff SET
        first_name = COALESCE(p_first_name, first_name),
        last_name  = COALESCE(p_last_name,  last_name),
        phone      = COALESCE(p_phone,      phone),
        role       = COALESCE(p_role,       role),
        branch_id  = COALESCE(p_branch_id,  branch_id)
    WHERE staff_id = p_staff_id;

    RETURN QUERY SELECT * FROM v_staff_details WHERE staff_id = p_staff_id;
END;
$$;
