import jwt from 'jsonwebtoken';
import { query, withTransaction } from '../../config/db.js';
import { env } from '../../config/env.js';
import { sha256, generateOtp } from '../../utils/hash.js';
import { sendWhatsAppText, buildOtpMessage } from '../../services/whatsapp.js';
import { AppError } from '../../middlewares/errorHandler.js';

// Step 1: request login OTP via WhatsApp
export async function requestLoginOtp(phone: string) {
  const users = await query<{ id: string; full_name: string }>(
    `SELECT id, full_name FROM users WHERE phone_e164 = $1 AND is_active = true`,
    [phone],
  );
  if (!users.length) throw new AppError(404, 'ບໍ່ພົບໝາຍເລກນີ້ໃນລະບົບ — ຕິດຕໍ່ admin');

  // In dev, use DEV_OTP so callers can bypass WhatsApp
  const code = env.devOtp || generateOtp();
  const codeHash = sha256(code);
  const expiresAt = new Date(Date.now() + env.whatsapp.otpTtlMinutes * 60_000);

  await query(
    `INSERT INTO otp_verifications (user_id, channel, purpose, code_hash, expires_at)
     VALUES ($1, 'whatsapp', 'login', $2, $3)`,
    [users[0].id, codeHash, expiresAt],
  );

  if (env.devOtp) {
    console.log(`[DEV] Login OTP for ${phone}: ${code}`);
  } else {
    await sendWhatsAppText(phone, buildOtpMessage(code));
  }

  return { sent: true, expiresInMinutes: env.whatsapp.otpTtlMinutes };
}

// Step 2: verify OTP → return JWT
export async function verifyLoginOtp(phone: string, code: string) {
  const users = await query<{ id: string; role: string; full_name: string }>(
    `SELECT id, role, full_name FROM users WHERE phone_e164 = $1 AND is_active = true`,
    [phone],
  );
  if (!users.length) throw new AppError(401, 'ບໍ່ພົບຜູ້ໃຊ້');
  const user = users[0];

  return withTransaction(async (client) => {
    const { rows: otps } = await client.query(
      `SELECT id, code_hash, expires_at, attempts, consumed_at
         FROM otp_verifications
        WHERE user_id = $1 AND purpose = 'login'
        ORDER BY created_at DESC LIMIT 1
        FOR UPDATE`,
      [user.id],
    );
    if (!otps.length) throw new AppError(400, 'ບໍ່ມີ OTP — ກະລຸນາຂໍລະຫັດໃໝ່');

    const otp = otps[0];
    if (otp.consumed_at) throw new AppError(400, 'OTP ນີ້ຖືກໃຊ້ແລ້ວ — ຂໍໃໝ່');
    if (new Date(otp.expires_at) < new Date()) throw new AppError(400, 'OTP ໝົດອາຍຸ — ຂໍໃໝ່');
    if (otp.attempts >= env.whatsapp.otpMaxAttempts)
      throw new AppError(429, `ໃສ່ລະຫັດຜິດ ${env.whatsapp.otpMaxAttempts} ຄັ້ງ — ຂໍ OTP ໃໝ່`);

    if (sha256(code) !== otp.code_hash) {
      await client.query(
        'UPDATE otp_verifications SET attempts = attempts + 1 WHERE id = $1',
        [otp.id],
      );
      throw new AppError(400, 'ລະຫັດ OTP ບໍ່ຖືກຕ້ອງ');
    }

    await client.query(
      'UPDATE otp_verifications SET consumed_at = now() WHERE id = $1',
      [otp.id],
    );

    const token = jwt.sign(
      { sub: user.id, role: user.role, name: user.full_name },
      env.jwtSecret,
      { expiresIn: `${env.jwtTtlDays}d` },
    );

    return { token, user: { id: user.id, role: user.role, name: user.full_name } };
  });
}
