-- ════════════════════════════════════════════════════════════════════════════
-- 016 — service_usage: folio detail columns used by the receptionist UI
-- ════════════════════════════════════════════════════════════════════════════
-- POST /services/folio writes, and the folio / spa-slot endpoints read, three
-- columns that never existed on service_usage, so every in-room dining and spa
-- charge failed to save. All three are optional details of a charge:
--   notes            free-text instructions ("no chilli", "spa session at 14:00")
--   appointment_time spa slot as HH:MM; the slot's date is used_at::date
--   meal_time        BREAKFAST / LUNCH / DINNER / ALL_DAY for dining orders
-- Additive and nullable, so existing rows and queries are unaffected.
-- Idempotent, one transaction.
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE service_usage ADD COLUMN IF NOT EXISTS notes            TEXT;
ALTER TABLE service_usage ADD COLUMN IF NOT EXISTS appointment_time VARCHAR(5);
ALTER TABLE service_usage ADD COLUMN IF NOT EXISTS meal_time        VARCHAR(20);

COMMIT;
