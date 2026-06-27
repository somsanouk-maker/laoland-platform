-- =====================================================================
-- Seed data ສຳລັບທົດສອບ flow (dev only)
-- =====================================================================

-- ຜູ້ໃຊ້ຕົວຢ່າງ (id ຄົງທີ່ ເພື່ອໃຊ້ໃນ X-User-Id header)
INSERT INTO users (id, role, full_name, phone_e164, whatsapp_verified, preferred_lang, is_founding_broker)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'broker', 'ນາຍໜ້າ ສົມພອນ', '+8562055500001', true, 'lo', true),
  ('22222222-2222-2222-2222-222222222222', 'broker', 'ນາຍໜ້າ ຄຳແພງ',  '+8562055500002', true, 'lo', false),
  ('33333333-3333-3333-3333-333333333333', 'owner',  'ເຈົ້າຂອງ ບຸນມີ', '+8562055500003', true, 'lo', false),
  ('44444444-4444-4444-4444-444444444444', 'buyer',  'ຜູ້ຊື້ ວິໄລ',     '+8562055500004', false, 'en', false)
ON CONFLICT (id) DO NOTHING;

-- ທີ່ດິນຕົວຢ່າງ (ນະຄອນຫຼວງວຽງຈັນ, ໃກ້ແລວທາງລົດໄຟ)
-- ພິກັດ: ໃຊ້ ST_MakePoint(lng, lat)
INSERT INTO properties
  (id, title_deed_no, deed_type, land_type, geom, area_sqm,
   province, district, village, owner_id, owner_set_price, price_currency,
   owner_verified, price_locked, green_badge, status, created_by)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'VTE-2024-00123', 'titled', 'residential',
   ST_SetSRID(ST_MakePoint(102.6331, 17.9757), 4326)::geography, 800.00,
   'ນະຄອນຫຼວງວຽງຈັນ', 'ໄຊເສດຖາ', 'ໂພນທັນ',
   '33333333-3333-3333-3333-333333333333', 1500000000, 'LAK',
   true, true, true, 'active', '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO NOTHING;

-- mandate ຂອງນາຍໜ້າ ສົມພອນ (exclusive → Green Badge)
INSERT INTO mandates (property_id, broker_id, mandate_type, status, trackable_slug, commission_pct, is_exclusive)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111',
   'exclusive', 'active', 'm-demo-somphone', 3.00, true)
ON CONFLICT (trackable_slug) DO NOTHING;

-- ອັດຕາແລກປ່ຽນ (ສຳລັບ Currency-Locked Quotes)
-- 1 USD = 21,500 LAK ; 1 THB = 600 LAK ; 1 USD = 35.8 THB (ຕົວຢ່າງ)
INSERT INTO fx_rates (base, quote, rate) VALUES
  ('USD', 'LAK', 21500.000000),
  ('THB', 'LAK', 600.000000),
  ('USD', 'THB', 35.800000),
  ('LAK', 'USD', 0.0000465),
  ('LAK', 'THB', 0.001667)
ON CONFLICT DO NOTHING;
