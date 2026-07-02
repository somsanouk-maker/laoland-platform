-- =====================================================================
-- LaoLand Platform — Database Schema (PostgreSQL + PostGIS)
-- ນະວັດຕະກຳຫຼັກ: "ແຍກໂຄງສ້າງບັນທຶກທີ່ດິນ ອອກຈາກສິດທິການເປັນຕົວແທນ"
--   - properties  = ບັນທຶກກາຍະພາບຂອງຕອນດິນ (1 ຕອນ = 1 record ດຽວ)
--   - mandates    = ສິດການຂາຍຂອງນາຍໜ້າ (ນາຍໜ້າຫຼາຍຄົນ/1 ຕອນດິນ)
-- =====================================================================

-- ເປີດໃຊ້ extension ທີ່ຈຳເປັນ
CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; -- uuid_generate_v4()

-- ---------------------------------------------------------------------
-- ENUM types (ກຳນົດຄ່າຄົງທີ່ ເພື່ອຄວາມສອດຄ່ອງ)
-- ---------------------------------------------------------------------
CREATE TYPE user_role         AS ENUM ('buyer', 'owner', 'broker', 'admin');
CREATE TYPE lang_code         AS ENUM ('lo', 'en', 'zh');
CREATE TYPE currency_code     AS ENUM ('LAK', 'USD', 'THB');
CREATE TYPE land_type         AS ENUM ('residential', 'agricultural', 'industrial', 'commercial');
-- ປະເພດໃບຕາດິນ (ຕາມບໍລິບົດລາວ: ຕອງແດງ=titled, ໃບສຳຫຼວດ, ໃບເສຍພາສີ, ໃບນາໃຊ້ເຈ້ຍຂາວ)
CREATE TYPE deed_type         AS ENUM ('titled', 'survey', 'tax_receipt', 'white_paper');
CREATE TYPE property_status    AS ENUM ('draft', 'pending_owner', 'active', 'sold', 'archived');
CREATE TYPE mandate_type       AS ENUM ('exclusive', 'open');
CREATE TYPE mandate_status     AS ENUM ('requested', 'active', 'revoked', 'renounced', 'expired');
CREATE TYPE otp_channel        AS ENUM ('whatsapp', 'sms');
CREATE TYPE otp_purpose        AS ENUM ('activate_listing', 'confirm_price', 'revoke_broker', 'login');
CREATE TYPE referral_status    AS ENUM ('active', 'expired', 'converted');
CREATE TYPE cobroke_status     AS ENUM ('proposed', 'accepted', 'rejected', 'closed');
CREATE TYPE pipeline_stage     AS ENUM ('inquiry', 'viewing', 'negotiation', 'deposit', 'closed', 'lost');
CREATE TYPE quote_status       AS ENUM ('locked', 'expired', 'honored');

-- ---------------------------------------------------------------------
-- ຟັງຊັນຊ່ວຍ: ອັບເດດ updated_at ອັດຕະໂນມັດ
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- 1) users — ແຍກ Role: buyer / owner / broker / admin
-- =====================================================================
CREATE TABLE users (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  role               user_role   NOT NULL,
  full_name          text        NOT NULL,
  -- ເບີໂທຮູບແບບ E.164 (ເຊັ່ນ +85620xxxxxxx) ໃຊ້ເປັນ key ການຢືນຢັນ WhatsApp
  phone_e164         text        NOT NULL UNIQUE,
  whatsapp_verified  boolean     NOT NULL DEFAULT false,
  email              text,
  preferred_lang     lang_code   NOT NULL DEFAULT 'lo',
  -- ສະເພາະ broker
  broker_license_no  text,
  is_founding_broker boolean     NOT NULL DEFAULT false,  -- ນາຍໜ້າຜູ້ກໍ່ຕັ້ງ (Founding Cohort)
  is_active          boolean     NOT NULL DEFAULT true,   -- soft-delete flag (admin can deactivate)
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================================
-- 2) properties — ບັນທຶກກາຍະພາບຂອງຕອນດິນ (Single Source of Truth)
--    ★ ບ່ອນຈັດເກັບ "ລາຄາກາງ" (Single Price) ທີ່ກຳນົດໂດຍເຈົ້າຂອງ
-- =====================================================================
CREATE TABLE properties (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- ★ ໃບຕາດິນ: ໃຊ້ກວດ De-dup ກົດທີ 1 (ເລກກົງກັນ)
  title_deed_no   text,
  deed_type       deed_type   NOT NULL DEFAULT 'white_paper',
  land_type       land_type   NOT NULL,

  -- ★ ພິກັດ GPS — lat/lng ສຳລັບສະແດງແຜນທີ່ ແລະ De-dup ກົດທີ 2 (≤30m)
  lat             numeric(10,7) NOT NULL,
  lng             numeric(10,7) NOT NULL,
  area_sqm        numeric(12,2),

  -- ທີ່ຕັ້ງ
  province        text NOT NULL,
  district        text NOT NULL,
  village         text,
  address_text    text,

  -- ★ Single-Price: ລາຄາກາງທີ່ນາຍໜ້າທຸກຄົນຕ້ອງໃຊ້ຮ່ວມກັນ
  owner_set_price numeric(16,2),
  price_currency  currency_code NOT NULL DEFAULT 'LAK',
  price_locked    boolean NOT NULL DEFAULT false,  -- lock ຫຼັງ Owner ຢືນຢັນ

  -- ★ Owner Gatekeeping: ເປີດໃຊ້ໄດ້ກໍ່ຕໍ່ເມື່ອເຈົ້າຂອງຢືນຢັນ OTP
  owner_id        uuid REFERENCES users(id),
  owner_verified  boolean NOT NULL DEFAULT false,
  green_badge     boolean NOT NULL DEFAULT false,  -- ຜ່ານກວດໃບຕາດິນ + Exclusive

  status          property_status NOT NULL DEFAULT 'draft',
  created_by      uuid REFERENCES users(id),       -- broker ຜູ້ປ້ອນຂໍ້ມູນ
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- index ສຳລັບ De-dup ແລະ ການຄົ້ນຫາ
CREATE UNIQUE INDEX uq_properties_deed_no
  ON properties (title_deed_no) WHERE title_deed_no IS NOT NULL;
CREATE INDEX idx_properties_latng ON properties (lat, lng);
CREATE INDEX idx_properties_status ON properties (status);
CREATE INDEX idx_properties_loc ON properties (province, district);

CREATE TRIGGER trg_properties_updated BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================================
-- 3) property_images — ໃຊ້ phash ກວດ De-dup ກົດທີ 3 (ຮູບຄ້າຍຄືກັນ)
-- =====================================================================
CREATE TABLE property_images (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id  uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  url          text NOT NULL,
  -- perceptual hash (64-bit) ເກັບເປັນ bigint → ປຽບທຽບ Hamming distance
  phash        bigint,
  is_drone     boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_images_property ON property_images (property_id);
CREATE INDEX idx_images_phash ON property_images (phash);

-- =====================================================================
-- 4) mandates — ສິດການຂາຍຂອງນາຍໜ້າ (ແຍກອອກຈາກ properties)
--    ນາຍໜ້າຫຼາຍຄົນ ສາມາດມີ mandate ຕໍ່ 1 ຕອນດິນ (open) ຫຼື 1 ຄົນ (exclusive)
-- =====================================================================
CREATE TABLE mandates (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id     uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  broker_id       uuid NOT NULL REFERENCES users(id),
  mandate_type    mandate_type NOT NULL DEFAULT 'open',
  status          mandate_status NOT NULL DEFAULT 'requested',

  -- ★ Trackable Source Link: ລິ້ງສະເພາະຕົວ ຜູກກັບນາຍໜ້າ+ຕອນດິນ
  trackable_slug  text NOT NULL UNIQUE,
  commission_pct  numeric(5,2) NOT NULL DEFAULT 3.00,  -- Smart Default 3%
  is_exclusive    boolean NOT NULL DEFAULT false,       -- → Green Badge

  requested_at    timestamptz NOT NULL DEFAULT now(),
  approved_at     timestamptz,
  revoked_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);
-- ຫ້າມ 1 ນາຍໜ້າ ມີ mandate ຊໍ້າຕໍ່ 1 ຕອນດິນ
CREATE UNIQUE INDEX uq_mandate_broker_property ON mandates (property_id, broker_id);
-- ຮັບປະກັນ: 1 ຕອນດິນ ມີ exclusive ໄດ້ພຽງ 1 mandate ທີ່ active
CREATE UNIQUE INDEX uq_mandate_exclusive ON mandates (property_id)
  WHERE is_exclusive = true AND status = 'active';
CREATE INDEX idx_mandates_broker ON mandates (broker_id);

-- =====================================================================
-- 5) otp_verifications — Owner Gatekeeping (WhatsApp/SMS OTP)
-- =====================================================================
CREATE TABLE otp_verifications (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      uuid NOT NULL REFERENCES users(id),
  property_id  uuid REFERENCES properties(id),
  channel      otp_channel NOT NULL DEFAULT 'whatsapp',
  purpose      otp_purpose NOT NULL,
  code_hash    text NOT NULL,            -- ເກັບ hash ບໍ່ເກັບ OTP ດິບ
  expires_at   timestamptz NOT NULL,
  consumed_at  timestamptz,
  attempts     int NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_otp_user ON otp_verifications (user_id, purpose);

-- =====================================================================
-- 6) referrals — First-Referral Protection (Immutable Log, ລັອກ 90 ມື້)
--    ★ ບໍ່ອະນຸຍາດໃຫ້ UPDATE/DELETE (immutable) — ບັງຄັບໂດຍ trigger
-- =====================================================================
CREATE TABLE referrals (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id     uuid NOT NULL REFERENCES properties(id),
  broker_id       uuid NOT NULL REFERENCES users(id),  -- ນາຍໜ້າຄົນທຳອິດທີ່ນຳສະເໜີ
  buyer_id        uuid REFERENCES users(id),
  buyer_phone_hash text NOT NULL,                       -- hash ເບີຜູ້ຊື້ (ກວດຊໍ້າໂດຍບໍ່ເປີດເຜີຍ)
  referred_at     timestamptz NOT NULL DEFAULT now(),
  -- ★ ປ້ອງກັນ 90 ມື້ນັບຈາກວັນນຳສະເໜີ
  protected_until timestamptz NOT NULL DEFAULT (now() + interval '90 days'),
  status          referral_status NOT NULL DEFAULT 'active',
  created_at      timestamptz NOT NULL DEFAULT now()
);
-- 1 (ຕອນດິນ + ຜູ້ຊື້) ມີນາຍໜ້າຄົນທຳອິດໄດ້ພຽງ 1 — ນີ້ຄືຫົວໃຈການລັອກສິດ
CREATE UNIQUE INDEX uq_referral_property_buyer
  ON referrals (property_id, buyer_phone_hash);
CREATE INDEX idx_referrals_protect ON referrals (property_id, protected_until);

-- Trigger ບັງຄັບ Immutability: ຫ້າມແກ້ໄຂ/ລຶບ ບັນທຶກການນຳສະເໜີ
CREATE OR REPLACE FUNCTION forbid_referral_mutation() RETURNS trigger AS $$
BEGIN
  -- ອະນຸຍາດສະເພາະປ່ຽນ status (active→converted/expired) ຜ່ານ admin function ເທົ່ານັ້ນ
  IF (TG_OP = 'DELETE') THEN
    RAISE EXCEPTION 'referrals ເປັນ immutable log — ຫ້າມລຶບ';
  END IF;
  IF (TG_OP = 'UPDATE') THEN
    IF NEW.property_id     <> OLD.property_id
    OR NEW.broker_id       <> OLD.broker_id
    OR NEW.buyer_phone_hash<> OLD.buyer_phone_hash
    OR NEW.referred_at     <> OLD.referred_at
    OR NEW.protected_until <> OLD.protected_until THEN
      RAISE EXCEPTION 'referrals ເປັນ immutable — ແກ້ໄຂໄດ້ສະເພາະ status';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_referral_immutable
  BEFORE UPDATE OR DELETE ON referrals
  FOR EACH ROW EXECUTE FUNCTION forbid_referral_mutation();

-- =====================================================================
-- 7) co_broke_agreements — Co-broke + Masking ຂໍ້ມູນຕິດຕໍ່ Buyer
-- =====================================================================
CREATE TABLE co_broke_agreements (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id       uuid NOT NULL REFERENCES properties(id),
  listing_broker_id uuid NOT NULL REFERENCES users(id),   -- ນາຍໜ້າເຈົ້າຂອງ listing
  cobroke_broker_id uuid NOT NULL REFERENCES users(id),   -- ນາຍໜ້າທີ່ມາຮ່ວມ (ມີຜູ້ຊື້)
  buyer_id          uuid REFERENCES users(id),
  split_listing_pct numeric(5,2) NOT NULL DEFAULT 50.00,  -- ສ່ວນແບ່ງ %
  split_cobroke_pct numeric(5,2) NOT NULL DEFAULT 50.00,
  -- ★ Masking: true = ປິດບັງ Buyer Contact ຈາກ listing broker
  mask_contacts     boolean NOT NULL DEFAULT true,
  status            cobroke_status NOT NULL DEFAULT 'proposed',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_split_100 CHECK (split_listing_pct + split_cobroke_pct = 100.00)
);
CREATE TRIGGER trg_cobroke_updated BEFORE UPDATE ON co_broke_agreements
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================================
-- 8) sales_pipeline — CRM Pipeline (Inquiry→Viewing→Negotiation→Deposit→Closed)
-- =====================================================================
CREATE TABLE sales_pipeline (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id         uuid NOT NULL REFERENCES properties(id),
  mandate_id          uuid REFERENCES mandates(id),
  broker_id           uuid NOT NULL REFERENCES users(id),
  buyer_id            uuid REFERENCES users(id),
  -- ຖ້າ deal ນີ້ມາຈາກ co-broke → ປິດບັງ buyer contact
  buyer_contact_masked boolean NOT NULL DEFAULT false,
  stage               pipeline_stage NOT NULL DEFAULT 'inquiry',
  amount              numeric(16,2),
  currency            currency_code NOT NULL DEFAULT 'LAK',
  notes               text,
  stage_changed_at    timestamptz NOT NULL DEFAULT now(),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pipeline_broker_stage ON sales_pipeline (broker_id, stage);
CREATE INDEX idx_pipeline_property ON sales_pipeline (property_id);
CREATE TRIGGER trg_pipeline_updated BEFORE UPDATE ON sales_pipeline
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================================
-- 9) viewing_logs — ບັນທຶກການເຂົ້າເບິ່ງທີ່ດິນ + First-Referral Protection Window
--    ★ lock_expires_at = created_at + 90 days (ປ້ອງກັນ buyer ຂ້າມນາຍໜ້າ)
-- =====================================================================
CREATE TABLE viewing_logs (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id            uuid NOT NULL REFERENCES sales_pipeline(id) ON DELETE CASCADE,
  property_id        uuid NOT NULL REFERENCES properties(id),
  broker_id          uuid NOT NULL REFERENCES users(id),
  buyer_id           uuid REFERENCES users(id),
  lat                numeric(10,7),
  lng                numeric(10,7),
  notes              text,
  -- ★ lock_expires_at ຕົກລົງ 90 ມື້ນັບຈາກວັນ viewing (Referral Protection Window)
  lock_expires_at    timestamptz NOT NULL DEFAULT (now() + interval '90 days'),
  buyer_confirmed    boolean NOT NULL DEFAULT false,
  buyer_confirmed_at timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_viewing_logs_deal   ON viewing_logs (deal_id);
CREATE INDEX idx_viewing_logs_broker ON viewing_logs (broker_id);
CREATE INDEX idx_viewing_logs_buyer  ON viewing_logs (buyer_id);

-- =====================================================================
-- 11) fx_rates + currency_quotes — Currency-Locked Quotes
-- =====================================================================
CREATE TABLE fx_rates (
  id        uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  base      currency_code NOT NULL,
  quote     currency_code NOT NULL,
  rate      numeric(18,6) NOT NULL,     -- 1 base = rate * quote
  as_of     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (base, quote, as_of)
);
CREATE INDEX idx_fx_pair ON fx_rates (base, quote, as_of DESC);

CREATE TABLE currency_quotes (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id    uuid NOT NULL REFERENCES properties(id),
  base_currency  currency_code NOT NULL,
  quote_currency currency_code NOT NULL,
  rate           numeric(18,6) NOT NULL,
  base_amount    numeric(16,2) NOT NULL,
  locked_amount  numeric(16,2) NOT NULL,   -- ລາຄາທີ່ lock ໄວ້
  quoted_at      timestamptz NOT NULL DEFAULT now(),
  expires_at     timestamptz NOT NULL,     -- ໝົດອາຍຸ → ຕ້ອງ quote ໃໝ່
  status         quote_status NOT NULL DEFAULT 'locked',
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_quotes_property ON currency_quotes (property_id);

-- =====================================================================
-- 12) audit_log — ບັນທຶກເຫດການສຳຄັນ (immutable, append-only)
-- =====================================================================
CREATE TABLE audit_log (
  id          bigserial PRIMARY KEY,
  actor_id    uuid,
  action      text NOT NULL,
  entity      text NOT NULL,
  entity_id   uuid,
  meta        jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_entity ON audit_log (entity, entity_id);

-- =====================================================================
-- 13) saved_properties — Buyer ບັນທຶກທີ່ດິນ + ເລືອກນາຍໜ້າ
-- =====================================================================
CREATE TABLE saved_properties (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_id  uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  broker_id    uuid REFERENCES users(id) ON DELETE SET NULL,
  saved_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE(buyer_id, property_id)
);
CREATE INDEX idx_saved_buyer ON saved_properties (buyer_id);

-- =====================================================================
-- 14) buyer_profiles — Buyer ຕັ້ງຄ່າຄວາມຕ້ອງການ
-- =====================================================================
CREATE TABLE buyer_profiles (
  buyer_id              uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  preferred_provinces   text[],
  preferred_districts   text[],
  preferred_land_types  text[],
  budget_min_lak        numeric(16,2),
  budget_max_lak        numeric(16,2),
  notes                 text,
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- =====================================================================
-- 15) schema_migrations — Additive migration tracker
-- =====================================================================
CREATE TABLE IF NOT EXISTS schema_migrations (
  id         serial PRIMARY KEY,
  filename   text NOT NULL UNIQUE,
  applied_at timestamptz NOT NULL DEFAULT now()
);
