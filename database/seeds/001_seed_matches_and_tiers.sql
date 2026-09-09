-- Seed Data : 001_seed_matches_and_tiers.sql
-- ข้อมูลระดับโซนที่นั่งและแมตช์การแข่งขันสนามช้างอารีนา

-- เพิ่มข้อมูลระดับโซนที่นั่ง (Seat Tiers)
INSERT INTO public.seat_tiers (tier_id, name, stand_location, base_price_thb, is_season_pass_eligible, total_capacity)
VALUES
    ('PLATINUM_VIP', 'Platinum VIP Lounge (A10) + Fast Lane', 'EAST', 17000.00, true, 200),
    ('SEASON_GOLD', 'Season Pass Gold Tier (West Stand)', 'WEST', 7500.00, true, 500),
    ('SEASON_SILVER', 'Season Pass Silver Tier (North/South)', 'NORTH', 4500.00, true, 800),
    ('EAST_A10', 'East Stand Premium A10', 'EAST', 1600.00, false, 350),
    ('EAST_A5', 'East Stand Upper A5', 'EAST', 800.00, false, 600),
    ('EAST_A4_A6', 'East Stand Wing A4 & A6', 'EAST', 600.00, false, 1200),
    ('EAST_REGULAR', 'East Stand Regular A1-A3, A7-A9', 'EAST', 250.00, false, 2500),
    ('WEST_MAIN', 'West Stand Main Grandstand', 'WEST', 200.00, false, 5000),
    ('NORTH_CURVA', 'North Stand Curva Cheering Zone', 'NORTH', 160.00, false, 6000),
    ('SOUTH_GOAL', 'South Stand Goal Area', 'SOUTH', 160.00, false, 6000),
    ('AWAY_ZONE', 'Away Fan Zone Stand-E Wing', 'EAST', 250.00, false, 1500)
ON CONFLICT (tier_id) DO UPDATE SET
    name = EXCLUDED.name,
    base_price_thb = EXCLUDED.base_price_thb;

-- เพิ่มข้อมูลแมตช์การแข่งขันตัวอย่าง
INSERT INTO public.matches (match_id, home_team, away_team, competition, match_datetime, stadium, is_active)
VALUES
    ('BRU-vs-MU-2026', 'Buriram United', 'Muangthong United', 'Thai League 1', NOW() + INTERVAL '7 days', 'Chang Arena', true),
    ('BRU-vs-BG-2026', 'Buriram United', 'BG Pathum United', 'Thai League 1', NOW() + INTERVAL '14 days', 'Chang Arena', true),
    ('BRU-vs-JDT-2026', 'Buriram United', 'Johor Darul Ta''zim', 'AFC Champions League Elite', NOW() + INTERVAL '21 days', 'Chang Arena', true)
ON CONFLICT (match_id) DO NOTHING;
