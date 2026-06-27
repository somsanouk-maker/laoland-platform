import crypto from 'node:crypto';

// hash ເບີໂທ/OTP — ໃຊ້ SHA-256 ເພື່ອບໍ່ເກັບຄ່າດິບ (privacy: buyer_phone_hash, code_hash)
export function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

// ສ້າງ OTP 6 ຫຼັກ (cryptographically random)
export function generateOtp(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
}

// ສ້າງ slug ສະເພາະຕົວ ສຳລັບ Trackable Source Link
export function generateSlug(prefix = ''): string {
  const rand = crypto.randomBytes(6).toString('base64url');
  return prefix ? `${prefix}-${rand}` : rand;
}
