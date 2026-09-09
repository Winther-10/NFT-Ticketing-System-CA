-- Migration : 001_initial_schema.sql
-- ระบบฐานข้อมูล NFT Ticket สนามช้างอารีนา (PDPA Compliant)

-- 1. ตารางผู้ใช้งาน (Users Table - PDPA Compliant)
CREATE TABLE IF NOT EXISTS public.users (
    wallet_address VARCHAR(42) PRIMARY KEY,
    full_name VARCHAR(120) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    email VARCHAR(120),
    consent_pdpa BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. ตารางข้อมูลนัดการแข่งขัน (Matches Table)
CREATE TABLE IF NOT EXISTS public.matches (
    match_id VARCHAR(50) PRIMARY KEY, -- เช่น BRU-vs-MU-2026
    home_team VARCHAR(60) DEFAULT 'Buriram United' NOT NULL,
    away_team VARCHAR(60) NOT NULL,
    competition VARCHAR(60) NOT NULL, -- เช่น Thai League 1, AFC Champions League
    match_datetime TIMESTAMPTZ NOT NULL,
    stadium VARCHAR(60) DEFAULT 'Chang Arena' NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. ตารางโซนที่นั่งและราคาอ้างอิงสนามช้างอารีนา (Seat Tiers Table)
CREATE TABLE IF NOT EXISTS public.seat_tiers (
    tier_id VARCHAR(30) PRIMARY KEY, -- เช่น PLATINUM, EAST_A10, EAST_A5, WEST, NORTH_SOUTH
    name VARCHAR(80) NOT NULL,
    stand_location VARCHAR(30) NOT NULL, -- EAST, WEST, NORTH, SOUTH
    base_price_thb NUMERIC(10, 2) NOT NULL,
    is_season_pass_eligible BOOLEAN DEFAULT FALSE NOT NULL,
    total_capacity INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. ตารางประวัติตั๋ว Off-chain (Tickets Registry)
CREATE TABLE IF NOT EXISTS public.tickets (
    token_id BIGINT PRIMARY KEY,
    wallet_address VARCHAR(42) NOT NULL REFERENCES public.users(wallet_address) ON DELETE RESTRICT,
    ticket_type VARCHAR(20) NOT NULL, -- SINGLE_MATCH หรือ SEASON_PASS
    tier_id VARCHAR(30) NOT NULL REFERENCES public.seat_tiers(tier_id),
    target_match_id VARCHAR(50) REFERENCES public.matches(match_id),
    seat_zone VARCHAR(30) NOT NULL,
    seat_number VARCHAR(20) NOT NULL,
    season_year INTEGER DEFAULT 2026,
    metadata_uri TEXT NOT NULL,
    purchase_tx_hash VARCHAR(66),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_seat_single_match UNIQUE (target_match_id, seat_zone, seat_number)
);

-- 5. ตารางบันทึกการเข้าสนาม (Check-in Audit Logs)
CREATE TABLE IF NOT EXISTS public.checkin_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_id BIGINT NOT NULL REFERENCES public.tickets(token_id),
    match_id VARCHAR(50) NOT NULL REFERENCES public.matches(match_id),
    gate_staff_address VARCHAR(42) NOT NULL,
    entry_status VARCHAR(20) NOT NULL, -- SUCCESS, REJECTED, DUPLICATE
    rejection_reason TEXT,
    blockchain_tx_hash VARCHAR(66),
    signed_payload TEXT NOT NULL,
    checked_in_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ดัชนีเพื่อประสิทธิภาพการ Query
CREATE INDEX IF NOT EXISTS idx_tickets_wallet ON public.tickets(wallet_address);
CREATE INDEX IF NOT EXISTS idx_tickets_match ON public.tickets(target_match_id);
CREATE INDEX IF NOT EXISTS idx_checkin_token ON public.checkin_logs(token_id);
