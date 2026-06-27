import { withTransaction, query } from '../../config/db.js';
import { env } from '../../config/env.js';
import { sha256 } from '../../utils/hash.js';
import { AppError } from '../../middlewares/errorHandler.js';

// ---------------------------------------------------------------------
// First-Referral Protection (ປ້ອງກັນ 90 ມື້)
// ນາຍໜ້າຄົນທຳອິດທີ່ນຳສະເໜີ (ຕອນດິນ + ຜູ້ຊື້) ຈະຖືກລັອກສິດ 90 ມື້
// - ບັນທຶກເປັນ Immutable Log (trigger ໃນ DB ກັນການແກ້ໄຂ)
// - ຖ້າມີນາຍໜ້າອື່ນພະຍາຍາມລົງທະບຽນ buyer ດຽວກັນ → ຖືກບລັອກ (ກັນຕັດໜ້າ)
// ---------------------------------------------------------------------

export interface RegisterReferralInput {
  propertyId: string;
  brokerId: string;
  buyerPhoneE164: string; // ໃຊ້ hash ເກັບ (privacy)
  buyerId?: string;
}

export async function registerReferral(input: RegisterReferralInput) {
  const buyerHash = sha256(input.buyerPhoneE164);

  return withTransaction(async (client) => {
    // ກວດວ່າມີນາຍໜ້າຄົນທຳອິດ ສຳລັບ (ຕອນດິນ+ຜູ້ຊື້) ນີ້ ທີ່ຍັງຢູ່ໃນໄລຍະປ້ອງກັນບໍ່
    const { rows: existing } = await client.query(
      `SELECT id, broker_id, protected_until, status
         FROM referrals
        WHERE property_id = $1 AND buyer_phone_hash = $2
        ORDER BY referred_at ASC LIMIT 1
        FOR UPDATE`,
      [input.propertyId, buyerHash],
    );

    if (existing.length) {
      const r = existing[0];
      const stillProtected = r.status === 'active' && new Date(r.protected_until) > new Date();
      if (stillProtected) {
        if (r.broker_id === input.brokerId) {
          // ນາຍໜ້າຄົນເກົ່າເອງ → ບໍ່ເປັນຫຍັງ, ສົ່ງຄືນບັນທຶກເກົ່າ
          return { ...r, alreadyOwner: true };
        }
        // ★ ນາຍໜ້າຄົນອື່ນ → ບລັອກ (ກັນຕັດໜ້າ)
        throw new AppError(409, 'ລູກຄ້ານີ້ຖືກປ້ອງກັນໂດຍນາຍໜ້າຄົນທຳອິດ', {
          protectedUntil: r.protected_until,
          firstBrokerId: r.broker_id,
        });
      }
      // ໝົດໄລຍະປ້ອງກັນແລ້ວ → ອະນຸຍາດໃຫ້ບັນທຶກໃໝ່ໄດ້ (ຂ້າງລຸ່ມ)
    }

    // ★ ສ້າງ Immutable referral log + ກຳນົດ protected_until = now + 90 ມື້
    const { rows } = await client.query(
      `INSERT INTO referrals (property_id, broker_id, buyer_id, buyer_phone_hash, protected_until, status)
       VALUES ($1, $2, $3, $4, now() + ($5 || ' days')::interval, 'active')
       RETURNING id, broker_id, referred_at, protected_until, status`,
      [input.propertyId, input.brokerId, input.buyerId ?? null, buyerHash, String(env.referral.protectDays)],
    );
    return rows[0];
  });
}

// ກວດສະຖານະການປ້ອງກັນ (ໃຊ້ໃນ UI ກ່ອນນາຍໜ້າຮັບລູກຄ້າ)
export async function checkProtection(propertyId: string, buyerPhoneE164: string) {
  const buyerHash = sha256(buyerPhoneE164);
  const rows = await query<{ broker_id: string; protected_until: string; status: string }>(
    `SELECT broker_id, protected_until, status
       FROM referrals
      WHERE property_id = $1 AND buyer_phone_hash = $2 AND status = 'active'
        AND protected_until > now()
      LIMIT 1`,
    [propertyId, buyerHash],
  );
  if (!rows.length) return { protected: false };
  return { protected: true, firstBrokerId: rows[0].broker_id, protectedUntil: rows[0].protected_until };
}
