-- ── Seed: Rooms across 3 Sky Nest branches ───────────────────────────────────
-- Development seed data — realistic Sri Lankan hotel room setup
-- Run AFTER branches are seeded (migration 001)
-- ─────────────────────────────────────────────────────────────────────────────

-- Get branch IDs dynamically from branches table
DO $$
DECLARE
    branch1_id UUID;
    branch2_id UUID;
    branch3_id UUID;
BEGIN
    -- Fetch branch IDs by name (set in migration 001)
    SELECT branch_id INTO branch1_id FROM branches ORDER BY created_at ASC LIMIT 1 OFFSET 0;
    SELECT branch_id INTO branch2_id FROM branches ORDER BY created_at ASC LIMIT 1 OFFSET 1;
    SELECT branch_id INTO branch3_id FROM branches ORDER BY created_at ASC LIMIT 1 OFFSET 2;

    -- ── Branch 1 Rooms (Colombo) ─────────────────────────────────────────────
    INSERT INTO rooms (number, type, status, floor, price_per_night, max_guests, amenities, description, branch_id)
    VALUES
        ('101', 'STANDARD', 'AVAILABLE', 1, 120.00, 2,
         ARRAY['WiFi', 'AC', 'TV', 'Mini Fridge'],
         'Cozy standard room with city view', branch1_id),

        ('102', 'STANDARD', 'AVAILABLE', 1, 120.00, 2,
         ARRAY['WiFi', 'AC', 'TV', 'Mini Fridge'],
         'Cozy standard room with garden view', branch1_id),

        ('103', 'STANDARD', 'MAINTENANCE', 1, 120.00, 2,
         ARRAY['WiFi', 'AC', 'TV'],
         'Standard room currently under maintenance', branch1_id),

        ('201', 'DELUXE', 'AVAILABLE', 2, 180.00, 2,
         ARRAY['WiFi', 'AC', 'TV', 'Mini Bar', 'Bathtub', 'City View'],
         'Spacious deluxe room with panoramic city view', branch1_id),

        ('202', 'DELUXE', 'AVAILABLE', 2, 180.00, 3,
         ARRAY['WiFi', 'AC', 'TV', 'Mini Bar', 'Bathtub', 'Pool View'],
         'Deluxe room with pool view and extra bed option', branch1_id),

        ('301', 'SUITE', 'AVAILABLE', 3, 280.00, 4,
         ARRAY['WiFi', 'AC', 'Smart TV', 'Mini Bar', 'Jacuzzi', 'Living Room', 'City View'],
         'Luxury suite with separate living area and jacuzzi', branch1_id),

        ('302', 'SUITE', 'OCCUPIED', 3, 280.00, 4,
         ARRAY['WiFi', 'AC', 'Smart TV', 'Mini Bar', 'Jacuzzi', 'Balcony'],
         'Luxury suite with private balcony', branch1_id),

        ('401', 'PRESIDENTIAL', 'AVAILABLE', 4, 500.00, 6,
         ARRAY['WiFi', 'AC', 'Smart TV', 'Full Bar', 'Jacuzzi', 'Butler Service', 'Rooftop Access', 'Ocean View'],
         'Presidential suite — the pinnacle of luxury with rooftop terrace', branch1_id),

    -- ── Branch 2 Rooms (Kandy) ───────────────────────────────────────────────
        ('101', 'STANDARD', 'AVAILABLE', 1, 100.00, 2,
         ARRAY['WiFi', 'AC', 'TV', 'Mountain View'],
         'Standard room with stunning mountain view', branch2_id),

        ('102', 'STANDARD', 'AVAILABLE', 1, 100.00, 2,
         ARRAY['WiFi', 'AC', 'TV', 'Garden View'],
         'Standard room overlooking the tea estate garden', branch2_id),

        ('201', 'DELUXE', 'AVAILABLE', 2, 160.00, 2,
         ARRAY['WiFi', 'AC', 'TV', 'Mini Bar', 'Balcony', 'Lake View'],
         'Deluxe room with private balcony and Kandy Lake view', branch2_id),

        ('202', 'DELUXE', 'AVAILABLE', 2, 160.00, 3,
         ARRAY['WiFi', 'AC', 'TV', 'Mini Bar', 'Bathtub', 'Forest View'],
         'Deluxe room immersed in lush forest surroundings', branch2_id),

        ('301', 'SUITE', 'AVAILABLE', 3, 250.00, 4,
         ARRAY['WiFi', 'AC', 'Smart TV', 'Mini Bar', 'Fireplace', 'Mountain View', 'Living Room'],
         'Heritage suite with colonial-era fireplace and mountain panorama', branch2_id),

        ('401', 'PRESIDENTIAL', 'AVAILABLE', 4, 420.00, 6,
         ARRAY['WiFi', 'AC', 'Smart TV', 'Full Bar', 'Private Pool', 'Butler Service', 'Tea Estate View'],
         'Presidential villa with private plunge pool overlooking tea estates', branch2_id),

    -- ── Branch 3 Rooms (Galle) ───────────────────────────────────────────────
        ('101', 'STANDARD', 'AVAILABLE', 1, 110.00, 2,
         ARRAY['WiFi', 'AC', 'TV', 'Ocean View'],
         'Standard room with Indian Ocean view', branch3_id),

        ('102', 'STANDARD', 'AVAILABLE', 1, 110.00, 2,
         ARRAY['WiFi', 'AC', 'TV', 'Fort View'],
         'Standard room overlooking the historic Galle Fort', branch3_id),

        ('103', 'STANDARD', 'RESERVED', 1, 110.00, 2,
         ARRAY['WiFi', 'AC', 'TV', 'Pool View'],
         'Standard room with pool access', branch3_id),

        ('201', 'DELUXE', 'AVAILABLE', 2, 170.00, 2,
         ARRAY['WiFi', 'AC', 'TV', 'Mini Bar', 'Balcony', 'Ocean View'],
         'Deluxe room with private balcony facing the ocean', branch3_id),

        ('202', 'DELUXE', 'AVAILABLE', 2, 170.00, 3,
         ARRAY['WiFi', 'AC', 'TV', 'Mini Bar', 'Bathtub', 'Sunset View'],
         'Deluxe room with spectacular sunset views', branch3_id),

        ('301', 'SUITE', 'AVAILABLE', 3, 270.00, 4,
         ARRAY['WiFi', 'AC', 'Smart TV', 'Mini Bar', 'Jacuzzi', 'Ocean View', 'Living Room'],
         'Ocean suite with floor-to-ceiling windows and jacuzzi', branch3_id),

        ('401', 'PRESIDENTIAL', 'AVAILABLE', 4, 460.00, 6,
         ARRAY['WiFi', 'AC', 'Smart TV', 'Full Bar', 'Private Pool', 'Butler Service', 'Beachfront'],
         'Beachfront presidential suite with direct beach access and private pool', branch3_id)

    ON CONFLICT (number) DO NOTHING;

    RAISE NOTICE 'Rooms seeded successfully across all 3 branches.';
END $$;
