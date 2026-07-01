import 'dotenv/config';

// ໂຫຼດ ແລະ ກວດ ENV ແບບ typed — ຮວບໄວ້ບ່ອນດຽວ ເພື່ອ scalability
function required(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing required env: ${key}`);
  return v;
}
function num(key: string, fallback: number): number {
  const v = process.env[key];
  return v ? Number(v) : fallback;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: num('PORT', 4000),
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: process.env.JWT_SECRET ?? 'dev_secret_change_me_in_production',
  jwtTtlDays: num('JWT_TOKEN_TTL_DAYS', 7),
  // Dev-only OTP bypass: set DEV_OTP=123456 in .env.local — must NOT be set in production
  devOtp: process.env.DEV_OTP ?? '',
  // Comma-separated allowed CORS origins
  allowedOrigins: (process.env.ALLOWED_ORIGINS ?? 'http://localhost:3000').split(',').map((s) => s.trim()),

  dedup: {
    radiusMeters: num('DEDUP_RADIUS_METERS', 30),
    phashMaxHamming: num('DEDUP_PHASH_MAX_HAMMING', 10),
  },
  referral: {
    protectDays: num('REFERRAL_PROTECT_DAYS', 90),
  },
  whatsapp: {
    apiUrl: process.env.WHATSAPP_API_URL ?? '',
    phoneId: process.env.WHATSAPP_PHONE_ID ?? '',
    token: process.env.WHATSAPP_TOKEN ?? '',
    otpTtlMinutes: num('OTP_TTL_MINUTES', 5),
    otpMaxAttempts: num('OTP_MAX_ATTEMPTS', 3),
  },
  quote: {
    ttlHours: num('QUOTE_TTL_HOURS', 24),
  },
} as const;
