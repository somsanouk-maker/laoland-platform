-- =====================================================================
-- Seed data ສຳລັບທົດສອບ flow (dev only)
-- =====================================================================

-- ຜູ້ໃຊ້ຕົວຢ່າງ (id ຄົງທີ່)
INSERT INTO users (id, role, full_name, phone_e164, whatsapp_verified, preferred_lang, is_founding_broker)
VALUES
  ('00000000-0000-0000-0000-000000000000', 'admin',  'ຜູ້ດູແລລະບົບ',   '+8562055500000', true, 'lo', false),
  ('11111111-1111-1111-1111-111111111111', 'broker', 'ນາຍໜ້າ ສົມພອນ', '+8562055500001', true, 'lo', true),
  ('22222222-2222-2222-2222-222222222222', 'broker', 'ນາຍໜ້າ ຄຳແພງ',  '+8562055500002', true, 'lo', false),
  ('33333333-3333-3333-3333-333333333333', 'owner',  'ເຈົ້າຂອງ ບຸນມີ', '+8562055500003', true, 'lo', false),
  ('44444444-4444-4444-4444-444444444444', 'buyer',  'ຜູ້ຊື້ ວິໄລ',     '+8562055500004', false, 'en', false)
ON CONFLICT (id) DO NOTHING;

-- ທີ່ດິນຕົວຢ່າງ (ນະຄອນຫຼວງວຽງຈັນ, ໃກ້ແລວທາງລົດໄຟ)
-- ພິກັດ: ໃຊ້ ST_MakePoint(lng, lat)
INSERT INTO properties
  (id, title_deed_no, deed_type, land_type, lat, lng, area_sqm,
   province, district, village, owner_id, owner_set_price, price_currency,
   owner_verified, price_locked, green_badge, status, created_by)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'VTE-2024-00123', 'titled', 'residential',
   17.9757, 102.6331, 800.00,
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

-- deal ຕົວຢ່າງ (ສຳລັບທົດສອບ viewing log)
INSERT INTO sales_pipeline (id, property_id, mandate_id, broker_id, buyer_id, stage, amount, currency)
SELECT
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  m.id,
  '11111111-1111-1111-1111-111111111111',
  '44444444-4444-4444-4444-444444444444',
  'viewing',
  1500000000,
  'LAK'
FROM mandates m WHERE m.trackable_slug = 'm-demo-somphone'
ON CONFLICT (id) DO NOTHING;

-- viewing log ຕົວຢ່າງ (ບັນທຶກການເຂົ້າເບິ່ງທີ່ດິນ)
INSERT INTO viewing_logs (id, deal_id, property_id, broker_id, buyer_id, lat, lng, notes)
VALUES (
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-1111-1111-1111-111111111111',
  '44444444-4444-4444-4444-444444444444',
  17.9757, 102.6331,
  'ການເຂົ້າເບິ່ງຕອນດິນຄັ້ງທຳອິດ'
)
ON CONFLICT (id) DO NOTHING;

-- ອັດຕາແລກປ່ຽນ (ສຳລັບ Currency-Locked Quotes)
-- 1 USD = 21,500 LAK ; 1 THB = 600 LAK ; 1 USD = 35.8 THB (ຕົວຢ່າງ)
INSERT INTO fx_rates (base, quote, rate) VALUES
  ('USD', 'LAK', 21500.000000),
  ('THB', 'LAK', 600.000000),
  ('USD', 'THB', 35.800000),
  ('LAK', 'USD', 0.0000465),
  ('LAK', 'THB', 0.001667)
ON CONFLICT DO NOTHING;
