import { query, withTransaction } from '../../config/db.js';
import { env } from '../../config/env.js';
import { sha256, generateOtp } from '../../utils/hash.js';
import { sendWhatsAppText, buildOtpMessage } from '../../services/whatsapp.js';
import { AppError } from '../../middlewares/errorHandler.js';

// ---------------------------------------------------------------------
// Owner Gatekeeping & Single-Price
// Workflow:
//   1) requestOtp  → ສ້າງ OTP, ເກັບ hash, ສົ່ງໄປ WhatsApp ຂອງ Owner
//   2) verifyAndActivate → Owner ໃສ່ OTP + ລາຄາກາງ → activate listing + lock price
// ---------------------------------------------------------------------

// ຂັ້ນ 1: ສົ່ງ OTP ໄປ WhatsApp ຂອງເຈົ້າຂອງ ເພື່ອອະນຸມັດ listing
export async function requestOtp(params: {
  ownerId: string;
  propertyId: string;
  purpose: 'activate_listing' | 'confirm_price' | 'revoke_broker';
}) {
  const owners = await query<{ phone_e164: string }>(
    'SELECT phone_e164 FROM users WHERE id = $1 AND role = $2',
    [params.ownerId, 'owner'],
  );
  if (!owners.length) throw new AppError(404, 'ບໍ່ພົບເຈົ້າຂອງທີ່ດິນ');

  const code = generateOtp();
  const codeHash = sha256(code);
  const expiresAt = new Date(Date.now() + env.whatsapp.otpTtlMinutes * 60_000);

  await query(
    `INSERT INTO otp_verifications (user_id, property_id, channel, purpose, code_hash, expires_at)
     VALUES ($1, $2, 'whatsapp', $3, $4, $5)`,
    [params.ownerId, params.propertyId, params.purpose, codeHash, expiresAt],
  );

  await sendWhatsAppText(owners[0].phone_e164, buildOtpMessage(code));
  return { sent: true, channel: 'whatsapp', expiresAt };
}

// ຂັ້ນ 2: ຢືນຢັນ OTP + ບັນທຶກລາຄາກາງ (Single Price) + activate
export async function verifyAndActivate(params: {
  ownerId: string;
  propertyId: string;
  code: string;
  ownerSetPrice: number;
  priceCurrency: 'LAK' | 'USD' | 'THB';
}) {
  return withTransaction(async (client) => {
    // ດຶງ OTP ຫຼ້າສຸດທີ່ຍັງບໍ່ໃຊ້ ສຳລັບ activate_listing
    const { rows: otps } = await client.query(
      `SELECT id, code_hash, expires_at, attempts, consumed_at
         FROM otp_verifications
        WHERE user_id = $1 AND property_id = $2 AND purpose = 'activate_listing'
        ORDER BY created_at DESC LIMIT 1
        FOR UPDATE`,
      [params.ownerId, params.propertyId],
    );
    if (!otps.length) throw new AppError(400, 'ບໍ່ມີ OTP — ກະລຸນາຂໍລະຫັດໃໝ່');

    const otp = otps[0];
    if (otp.consumed_at) throw new AppError(400, 'OTP ນີ້ຖືກໃຊ້ແລ້ວ');
    if (new Date(otp.expires_at) < new Date()) throw new AppError(400, 'OTP ໝົດອາຍຸ');
    if (otp.attempts >= env.whatsapp.otpMaxAttempts)
      throw new AppError(429, 'ໃສ່ລະຫັດຜິດເກີນກຳນົດ');

    // ກວດ hash
    if (sha256(params.code) !== otp.code_hash) {
      await client.query('UPDATE otp_verifications SET attempts = attempts + 1 WHERE id = $1', [otp.id]);
      throw new AppError(400, 'ລະຫັດ OTP ບໍ່ຖືກຕ້ອງ');
    }

    // ✓ ຜ່ານ — mark consumed
    await client.query('UPDATE otp_verifications SET consumed_at = now() WHERE id = $1', [otp.id]);

    // ★ activate listing + ບັນທຶກລາຄາກາງ + lock ລາຄາ + ຜູກ owner
    const { rows } = await client.query(
      `UPDATE properties
          SET owner_id = $1,
              owner_verified = true,
              owner_set_price = $2,
              price_currency = $3,
              price_locked = true,          -- ★ Single-Price: lock ບໍ່ໃຫ້ນາຍໜ້າປ່ຽນ
              status = 'active'
        WHERE id = $4
      RETURNING id, status, owner_set_price, price_currency, price_locked`,
      [params.ownerId, params.ownerSetPrice, params.priceCurrency, params.propertyId],
    );
    if (!rows.length) throw new AppError(404, 'ບໍ່ພົບທີ່ດິນ');

    await client.query(
      `INSERT INTO audit_log (actor_id, action, entity, entity_id, meta)
       VALUES ($1, 'owner_activate', 'property', $2, $3)`,
      [params.ownerId, params.propertyId, JSON.stringify({ price: params.ownerSetPrice, currency: params.priceCurrency })],
    );
    return rows[0];
  });
}

// Owner ຍົກເລີກນາຍໜ້າທີ່ບໍ່ໄດ້ຮັບອະນຸຍາດ (ກວດສິດເຈົ້າຂອງ)
export async function revokeMandate(ownerId: string, mandateId: string) {
  const rows = await query(
    `UPDATE mandates m
        SET status = 'revoked', revoked_at = now()
       FROM properties p
      WHERE m.id = $1 AND m.property_id = p.id AND p.owner_id = $2
      RETURNING m.id`,
    [mandateId, ownerId],
  );
  if (!rows.length) throw new AppError(403, 'ບໍ່ມີສິດ ຫຼື ບໍ່ພົບ mandate');
  return { revoked: true };
}
