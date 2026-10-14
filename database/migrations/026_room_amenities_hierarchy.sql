-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 026: Hierarchical Room Amenities & Luxury Features
-- ══════════════════════════════════════════════════════════════════════════════
-- Establishes a strictly hierarchical amenities model across all room tiers:
-- Presidential Suite (15 items) > Suite (11 items) > Deluxe (8 items) > Standard (5 items)
-- Includes requested luxury features: Jacuzzi, Bathtub, Two Bathrooms, Butler Service, etc.
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Ensure rooms.amenities column exists and set default
ALTER TABLE rooms 
  ADD COLUMN IF NOT EXISTS amenities TEXT[] DEFAULT ARRAY['High-Speed WiFi', 'Climate Control AC', 'Smart HD TV', 'Rain Shower', 'Mini Fridge & Tea Station'];

ALTER TABLE rooms 
  ALTER COLUMN amenities SET DEFAULT ARRAY['High-Speed WiFi', 'Climate Control AC', 'Smart HD TV', 'Rain Shower', 'Mini Fridge & Tea Station'];

-- 2. Update STANDARD Rooms (5 amenities)
UPDATE rooms
SET amenities = ARRAY[
  'High-Speed WiFi',
  'Climate Control AC',
  'Smart HD TV',
  'Rain Shower',
  'Mini Fridge & Tea Station'
]
WHERE type::text ILIKE '%standard%';

-- 3. Update DELUXE Rooms (8 amenities)
UPDATE rooms
SET amenities = ARRAY[
  'High-Speed WiFi',
  'Climate Control AC',
  'Smart HD TV',
  'Rain Shower',
  'Deep Soaking Bathtub',
  'Private Balcony',
  'Mini Bar & Espresso Machine',
  'Plush Bathrobes & Slippers'
]
WHERE type::text ILIKE '%deluxe%';

-- 4. Update SUITE Rooms (11 amenities)
UPDATE rooms
SET amenities = ARRAY[
  'High-Speed WiFi',
  'Climate Control AC',
  '55-inch 4K Smart TV',
  'Rain Shower',
  'Deep Soaking Bathtub',
  'Private Heated Jacuzzi',
  'Dual Vanity Bathroom',
  'Separate Living Lounge',
  'Panoramic Balcony & Daybed',
  'Mini Bar & Wine Chiller',
  'Plush Bathrobes & Slippers'
]
WHERE type::text ILIKE '%suite%' AND type::text NOT ILIKE '%presidential%';

-- 5. Update PRESIDENTIAL Suite Rooms (15 amenities)
UPDATE rooms
SET amenities = ARRAY[
  'High-Speed WiFi',
  'Climate Control AC',
  '65-inch 4K OLED Cinema Display',
  'Two Bathrooms',
  'Private Heated Jacuzzi',
  'Deep Soaking Marble Bathtub',
  'Dual Rain Showers & Spa Bench',
  'Private Oceanfront Terrace & Sundeck',
  '24/7 Dedicated Butler Service',
  'Separate Dining & Executive Living Hall',
  'Full Premium Bar & Wine Cellar',
  'Chef''s Prep Pantry & Nespresso',
  'Walk-in Master Wardrobe',
  'Luxury Aromatherapy Toiletries',
  'Plush Silk-Cotton Robes & Slippers'
]
WHERE type::text ILIKE '%presidential%';

