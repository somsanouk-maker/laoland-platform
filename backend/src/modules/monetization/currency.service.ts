import { query } from '../../config/db.js';
import { env } from '../../config/env.js';
import { AppError } from '../../middlewares/errorHandler.js';

// ---------------------------------------------------------------------
// Currency-Locked Quotes
// ປ້ອງກັນຄວາມສ່ຽງເງິນກີບຜັນຜວນ: lock ອັດຕາແລກປ່ຽນ + ລາຄາ ໃນໄລຍະໜຶ່ງ
// flow: ດຶງ rate ຫຼ້າສຸດ → ຄຳນວນ → ບັນທຶກ quote ພ້ອມ expires_at
// ---------------------------------------------------------------------

// ດຶງ rate ຫຼ້າສຸດ (base→quote). ຖ້າ pair ກົງ rate=1
async function getLatestRate(base: string, quote: string): Promise<number> {
  if (base === quote) return 1;
  const rows = await query<{ rate: string }>(
    `SELECT rate FROM fx_rates WHERE base = $1 AND quote = $2 ORDER BY as_of DESC LIMIT 1`,
    [base, quote],
  );
  if (rows.length) return Number(rows[0].rate);

  // ລອງທິດກັບກັນ (quote→base) ແລ້ວ inverse
  const inv = await query<{ rate: string }>(
    `SELECT rate FROM fx_rates WHERE base = $1 AND quote = $2 ORDER BY as_of DESC LIMIT 1`,
    [quote, base],
  );
  if (inv.length) return 1 / Number(inv[0].rate);

  throw new AppError(400, `ບໍ່ມີອັດຕາແລກປ່ຽນ ${base}→${quote}`);
}

// ★ ສ້າງ quote ທີ່ lock ລາຄາ + ກຳນົດເວລາໝົດອາຍຸ
export async function createLockedQuote(params: {
  propertyId: string;
  baseCurrency: 'LAK' | 'USD' | 'THB';
  quoteCurrency: 'LAK' | 'USD' | 'THB';
  baseAmount: number;
}) {
  const rate = await getLatestRate(params.baseCurrency, params.quoteCurrency);
  const lockedAmount = Number((params.baseAmount * rate).toFixed(2));
  const expiresAt = new Date(Date.now() + env.quote.ttlHours * 3_600_000);

  const rows = await query(
    `INSERT INTO currency_quotes
       (property_id, base_currency, quote_currency, rate, base_amount, locked_amount, expires_at, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'locked')
     RETURNING id, rate, locked_amount, quoted_at, expires_at, status`,
    [params.propertyId, params.baseCurrency, params.quoteCurrency, rate,
     params.baseAmount, lockedAmount, expiresAt],
  );
  return rows[0];
}

// ກວດ quote: ຖ້າເລີຍ expires_at → mark expired + ແຈ້ງໃຫ້ quote ໃໝ່
export async function getQuote(quoteId: string) {
  const rows = await query<any>(`SELECT * FROM currency_quotes WHERE id = $1`, [quoteId]);
  if (!rows.length) throw new AppError(404, 'ບໍ່ພົບ quote');
  const q = rows[0];

  if (q.status === 'locked' && new Date(q.expires_at) < new Date()) {
    await query(`UPDATE currency_quotes SET status = 'expired' WHERE id = $1`, [quoteId]);
    q.status = 'expired';
  }
  return {
    ...q,
    isExpired: q.status === 'expired',
    message: q.status === 'expired' ? 'ລາຄາ lock ໝົດອາຍຸ — ກະລຸນາ quote ໃໝ່' : 'ລາຄາ lock ຍັງໃຊ້ໄດ້',
  };
}
