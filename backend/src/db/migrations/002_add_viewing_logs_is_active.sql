-- Migration 002: Add viewing_logs table and users.is_active column
-- Safe to run on existing databases (uses IF NOT EXISTS / IF NOT EXISTS guards).

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS viewing_logs (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id            uuid NOT NULL REFERENCES sales_pipeline(id) ON DELETE CASCADE,
  property_id        uuid NOT NULL REFERENCES properties(id),
  broker_id          uuid NOT NULL REFERENCES users(id),
  buyer_id           uuid REFERENCES users(id),
  lat                numeric(10,7),
  lng                numeric(10,7),
  notes              text,
  lock_expires_at    timestamptz NOT NULL DEFAULT (now() + interval '90 days'),
  buyer_confirmed    boolean NOT NULL DEFAULT false,
  buyer_confirmed_at timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_viewing_logs_deal   ON viewing_logs (deal_id);
CREATE INDEX IF NOT EXISTS idx_viewing_logs_broker ON viewing_logs (broker_id);
CREATE INDEX IF NOT EXISTS idx_viewing_logs_buyer  ON viewing_logs (buyer_id);
