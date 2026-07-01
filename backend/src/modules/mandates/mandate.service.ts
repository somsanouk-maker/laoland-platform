import { query } from '../../config/db.js';
import { generateSlug } from '../../utils/hash.js';
import { AppError } from '../../middlewares/errorHandler.js';

// ---------------------------------------------------------------------
// Mandate = ສິດການຂາຍຂອງນາຍໜ້າ (ແຍກຈາກ properties)
// ນາຍໜ້າຂໍ mandate ຕໍ່ຕອນດິນທີ່ມີຢູ່ແລ້ວ → ໄດ້ Trackable Source Link
// ---------------------------------------------------------------------

export async function requestMandate(params: {
  propertyId: string;
  brokerId: string;
  isExclusive?: boolean;
  commissionPct?: number;
}) {
  // ກວດວ່າທີ່ດິນມີຢູ່
  const prop = await query<{ id: string }>('SELECT id FROM properties WHERE id = $1', [params.propertyId]);
  if (!prop.length) throw new AppError(404, 'ບໍ່ພົບທີ່ດິນ');

  // ★ Trackable Source Link: slug ສະເພາະຕົວ ຜູກ broker+property
  const slug = generateSlug('m');

  try {
    const rows = await query(
      `INSERT INTO mandates (property_id, broker_id, mandate_type, status,
                             trackable_slug, commission_pct, is_exclusive)
       VALUES ($1, $2, $3, 'requested', $4, $5, $6)
       RETURNING id, trackable_slug, mandate_type, status, is_exclusive`,
      [
        params.propertyId,
        params.brokerId,
        params.isExclusive ? 'exclusive' : 'open',
        slug,
        params.commissionPct ?? 3.0,
        params.isExclusive ?? false,
      ],
    );
    await query(
      `INSERT INTO audit_log (actor_id, action, entity, entity_id, meta) VALUES ($1, 'mandate_request', 'mandate', $2, $3)`,
      [params.brokerId, rows[0].id, JSON.stringify({ propertyId: params.propertyId, isExclusive: params.isExclusive ?? false })],
    );
    return rows[0];
  } catch (e: any) {
    // unique violation: ນາຍໜ້າຄົນນີ້ມີ mandate ແລ້ວ ຫຼື ມີ exclusive ຢູ່ແລ້ວ
    if (e.code === '23505') throw new AppError(409, 'ມີ mandate ຢູ່ແລ້ວ ຫຼື ຕອນດິນນີ້ມີ Exclusive ແລ້ວ');
    throw e;
  }
}

// ດຶງ mandate ທັງໝົດຂອງ broker ຄົນນີ້
export async function getBrokerMandates(brokerId: string) {
  return query<any>(
    `SELECT m.id, m.mandate_type, m.status, m.commission_pct, m.is_exclusive,
            m.trackable_slug, m.created_at,
            p.province, p.district, p.land_type, p.owner_set_price, p.price_currency,
            p.green_badge, p.id AS property_id
       FROM mandates m JOIN properties p ON p.id = m.property_id
      WHERE m.broker_id = $1
      ORDER BY m.created_at DESC`,
    [brokerId],
  );
}

// ນາຍໜ້າຖອນ mandate ຂອງຕົນເອງ (renounce) — broker-initiated withdrawal
export async function renounceMandate(brokerId: string, mandateId: string) {
  const rows = await query<{ id: string; property_id: string }>(
    `UPDATE mandates
        SET status = 'renounced', revoked_at = now()
      WHERE id = $1 AND broker_id = $2 AND status IN ('requested', 'active')
     RETURNING id, property_id`,
    [mandateId, brokerId],
  );
  if (!rows.length) throw new AppError(403, 'ບໍ່ມີສິດ ຫຼື ສະຖານະບໍ່ຖືກຕ້ອງ');
  await query(
    `INSERT INTO audit_log (actor_id, action, entity, entity_id) VALUES ($1, 'mandate_renounce', 'mandate', $2)`,
    [brokerId, rows[0].id],
  );
  return rows[0];
}

// ແປງ Trackable Link → ຫາ mandate/broker ປາຍທາງ (ໃຊ້ຕອນ buyer ກົດ link)
export async function resolveTrackableLink(slug: string) {
  const rows = await query(
    `SELECT m.id AS mandate_id, m.broker_id, m.property_id, u.full_name AS broker_name
       FROM mandates m JOIN users u ON u.id = m.broker_id
      WHERE m.trackable_slug = $1 AND m.status = 'active'`,
    [slug],
  );
  if (!rows.length) throw new AppError(404, 'ລິ້ງບໍ່ຖືກຕ້ອງ ຫຼື ໝົດອາຍຸ');
  return rows[0];
}
