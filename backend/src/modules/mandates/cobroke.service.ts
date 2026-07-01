import { query, withTransaction } from '../../config/db.js';
import { AppError } from '../../middlewares/errorHandler.js';

// ---------------------------------------------------------------------
// Co-broke Masking Logic
// ນາຍໜ້າ 2 ຄົນຮ່ວມມືກັນ (listing broker + co-broke broker ທີ່ມີຜູ້ຊື້)
// - ແບ່ງສ່ວນຄ່ານາຍໜ້າຕາມຕົກລົງ (split ລວມ = 100%)
// - ★ ປິດບັງ Buyer Contact ຂອງແຕ່ລະຝ່າຍ ເພື່ອຄວາມປອດໄພຖານຂໍ້ມູນ
// ---------------------------------------------------------------------

export async function listCobrokes(brokerId: string) {
  return query<any>(
    `SELECT c.id, c.status, c.split_listing_pct, c.split_cobroke_pct, c.mask_contacts,
            c.created_at,
            p.province, p.district, p.land_type, p.owner_set_price, p.price_currency, p.id AS property_id,
            lb.full_name AS listing_broker_name,
            cb.full_name AS cobroke_broker_name
       FROM co_broke_agreements c
       JOIN properties p ON p.id = c.property_id
       JOIN users lb ON lb.id = c.listing_broker_id
       JOIN users cb ON cb.id = c.cobroke_broker_id
      WHERE c.listing_broker_id = $1 OR c.cobroke_broker_id = $1
      ORDER BY c.created_at DESC`,
    [brokerId],
  );
}

export async function proposeCoBroke(params: {
  propertyId: string;
  listingBrokerId: string;
  cobrokeBrokerId: string;
  buyerId?: string;
  splitListingPct?: number;
  splitCobrokePct?: number;
}) {
  const sl = params.splitListingPct ?? 50;
  const sc = params.splitCobrokePct ?? 50;
  if (sl + sc !== 100) throw new AppError(400, 'ສ່ວນແບ່ງຕ້ອງລວມເທົ່າກັບ 100%');

  const rows = await query(
    `INSERT INTO co_broke_agreements
       (property_id, listing_broker_id, cobroke_broker_id, buyer_id,
        split_listing_pct, split_cobroke_pct, mask_contacts, status)
     VALUES ($1, $2, $3, $4, $5, $6, true, 'proposed')
     RETURNING id, status, split_listing_pct, split_cobroke_pct`,
    [params.propertyId, params.listingBrokerId, params.cobrokeBrokerId, params.buyerId ?? null, sl, sc],
  );
  return rows[0];
}

export async function acceptCoBroke(agreementId: string, brokerId: string) {
  return withTransaction(async (client) => {
    // ສະເພາະ cobroke broker (ຝ່າຍທີ່ຖືກເຊີນ) ຍອມຮັບໄດ້
    const { rows } = await client.query(
      `UPDATE co_broke_agreements
          SET status = 'accepted'
        WHERE id = $1 AND cobroke_broker_id = $2 AND status = 'proposed'
      RETURNING id, property_id, cobroke_broker_id, buyer_id`,
      [agreementId, brokerId],
    );
    if (!rows.length) throw new AppError(403, 'ບໍ່ມີສິດ ຫຼື ສະຖານະບໍ່ຖືກຕ້ອງ');

    // ★ ສ້າງ pipeline entry ໂດຍ mark buyer_contact_masked = true
    const a = rows[0];
    await client.query(
      `INSERT INTO sales_pipeline (property_id, broker_id, buyer_id, buyer_contact_masked, stage)
       VALUES ($1, $2, $3, true, 'negotiation')`,
      [a.property_id, brokerId, a.buyer_id],
    );
    return { accepted: true };
  });
}

export async function rejectCoBroke(agreementId: string, brokerId: string) {
  const rows = await query(
    `UPDATE co_broke_agreements
        SET status = 'rejected'
      WHERE id = $1 AND cobroke_broker_id = $2 AND status = 'proposed'
     RETURNING id`,
    [agreementId, brokerId],
  );
  if (!rows.length) throw new AppError(403, 'ບໍ່ມີສິດ ຫຼື ສະຖານະບໍ່ຖືກຕ້ອງ');
  return { rejected: true };
}

// ---------------------------------------------------------------------
// ★ ຫົວໃຈ Masking: ດຶງຂໍ້ມູນ buyer ໂດຍປິດບັງ contact ຕາມສິດຜູ້ຮ້ອງຂໍ
// ກົດ: ສະເພາະນາຍໜ້າທີ່ "ເປັນເຈົ້າຂອງ buyer" (cobroke broker ທີ່ນຳ buyer ມາ)
//      ຈຶ່ງເຫັນ contact ຈິງ. ອີກຝ່າຍເຫັນສະເພາະຊື່ຫຍໍ້ + ປຸ່ມຕິດຕໍ່ຜ່ານລະບົບ.
// ---------------------------------------------------------------------
export async function getBuyerForBroker(agreementId: string, requestingBrokerId: string) {
  const rows = await query<any>(
    `SELECT c.cobroke_broker_id, c.mask_contacts,
            b.id AS buyer_id, b.full_name, b.phone_e164
       FROM co_broke_agreements c
       LEFT JOIN users b ON b.id = c.buyer_id
      WHERE c.id = $1`,
    [agreementId],
  );
  if (!rows.length) throw new AppError(404, 'ບໍ່ພົບຂໍ້ຕົກລົງ co-broke');
  const r = rows[0];

  // ນາຍໜ້າເຈົ້າຂອງ buyer → ເຫັນຂໍ້ມູນເຕັມ
  const isBuyerOwnerBroker = r.cobroke_broker_id === requestingBrokerId;
  if (isBuyerOwnerBroker || !r.mask_contacts) {
    return { masked: false, buyer: { id: r.buyer_id, fullName: r.full_name, phone: r.phone_e164 } };
  }

  // ★ ອີກຝ່າຍ → ປິດບັງ: ສະແດງສະເພາະຊື່ຫຍໍ້ + ເບີປິດບັງ, ຕິດຕໍ່ຜ່ານ relay ຂອງລະບົບ
  return {
    masked: true,
    buyer: {
      id: r.buyer_id,
      fullName: maskName(r.full_name),
      phone: maskPhone(r.phone_e164),
      contactVia: `/api/cobroke/${agreementId}/relay`, // ຕິດຕໍ່ຜ່ານລະບົບ (ບໍ່ເປີດເບີຈິງ)
    },
  };
}

// helper ປິດບັງຊື່: "ສົມສະໜຸກ ວົງສະຫວ່າງ" → "ສ*** ວ***"
function maskName(name: string | null): string {
  if (!name) return '***';
  return name
    .split(' ')
    .map((w) => (w ? w[0] + '***' : ''))
    .join(' ');
}
// ປິດບັງເບີ: "+8562055512345" → "+85620*****345"
function maskPhone(phone: string | null): string {
  if (!phone) return '***';
  return phone.slice(0, 6) + '*****' + phone.slice(-3);
}
