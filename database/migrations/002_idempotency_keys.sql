-- Migration : 002_idempotency_keys.sql
-- จัดการ Idempotent Requests ป้องกัน Race Condition และการกดย้ำซ้ำซ้อน

CREATE TABLE IF NOT EXISTS public.idempotency_keys (
    key VARCHAR(120) PRIMARY KEY,
    request_path VARCHAR(120) NOT NULL,
    wallet_address VARCHAR(42),
    response_payload JSONB,
    status VARCHAR(20) DEFAULT 'PROCESSING' NOT NULL, -- PROCESSING, COMPLETED, FAILED
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_idempotency_wallet ON public.idempotency_keys(wallet_address);
CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON public.idempotency_keys(expires_at);
