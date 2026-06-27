import { query } from '../../config/db.js';
import { AppError } from '../../middlewares/errorHandler.js';

// ---------------------------------------------------------------------
// Sales Pipeline (CRM) — Inquiry → Viewing → Negotiation → Deposit → Closed
// (Workshop feature ສຳລັບນາຍໜ້າ)
// ---------------------------------------------------------------------

const STAGES = ['inquiry', 'viewing', 'negotiation', 'deposit', 'closed', 'lost'] as const;
type Stage = (typeof STAGES)[number];

export async function createDeal(params: {
  propertyId: string;
  brokerId: string;
  mandateId?: string;
  buyerId?: string;
  amount?: number;
  currency?: string;
  notes?: string;
}) {
  const rows = await query(
    `INSERT INTO sales_pipeline (property_id, mandate_id, broker_id, buyer_id, amount, currency, stage, notes)
     VALUES ($1, $2, $3, $4, $5, $6, 'inquiry', $7)
     RETURNING id, stage, created_at`,
    [params.propertyId, params.mandateId ?? null, params.brokerId, params.buyerId ?? null,
     params.amount ?? null, params.currency ?? 'LAK', params.notes ?? null],
  );
  return rows[0];
}

// ປ່ຽນ stage (ບັນທຶກເວລາ stage_changed_at)
export async function moveStage(dealId: string, brokerId: string, stage: Stage) {
  if (!STAGES.includes(stage)) throw new AppError(400, 'stage ບໍ່ຖືກຕ້ອງ');
  const rows = await query(
    `UPDATE sales_pipeline
        SET stage = $1, stage_changed_at = now()
      WHERE id = $2 AND broker_id = $3
    RETURNING id, stage, stage_changed_at`,
    [stage, dealId, brokerId],
  );
  if (!rows.length) throw new AppError(403, 'ບໍ່ມີສິດ ຫຼື ບໍ່ພົບ deal');
  return rows[0];
}

// Kanban board ຂອງນາຍໜ້າ (ຈັດກຸ່ມຕາມ stage)
export async function getBoard(brokerId: string) {
  const rows = await query<any>(
    `SELECT sp.id, sp.stage, sp.amount, sp.currency, sp.buyer_contact_masked,
            sp.property_id, sp.notes,
            p.province, p.district, p.land_type, p.id AS pid,
            u.full_name AS buyer_name, u.phone_e164 AS buyer_phone,
            (SELECT count(*) FROM viewing_logs vl WHERE vl.deal_id = sp.id) AS viewing_count
       FROM sales_pipeline sp
       JOIN properties p ON p.id = sp.property_id
       LEFT JOIN users u ON u.id = sp.buyer_id
      WHERE sp.broker_id = $1
      ORDER BY sp.stage_changed_at DESC`,
    [brokerId],
  );
  const board: Record<string, any[]> = Object.fromEntries(STAGES.map((s) => [s, []]));
  for (const r of rows) board[r.stage].push(r);
  return board;
}

// Log GPS viewing — ສ້າງ viewing log + ລັອກ buyer 90 ມື້ (referral protection)
export async function logViewing(params: {
  dealId: string;
  brokerId: string;
  lat: number;
  lng: number;
  notes?: string;
}) {
  const { withTransaction } = await import('../../config/db.js');
  return withTransaction(async (client) => {
    // ກວດ deal ເປັນຂອງ broker ນີ້
    const { rows: deals } = await client.query(
      `SELECT sp.id, sp.property_id, sp.buyer_id FROM sales_pipeline sp
        WHERE sp.id = $1 AND sp.broker_id = $2`,
      [params.dealId, params.brokerId],
    );
    if (!deals.length) throw new AppError(403, 'ບໍ່ພົບ deal ຫຼື ບໍ່ມີສິດ');
    const deal = deals[0];

    // ສ້າງ viewing log
    const { rows: logs } = await client.query(
      `INSERT INTO viewing_logs (deal_id, property_id, broker_id, buyer_id, lat, lng, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, lock_expires_at, created_at`,
      [params.dealId, deal.property_id, params.brokerId, deal.buyer_id ?? null,
       params.lat, params.lng, params.notes ?? null],
    );

    // Auto-advance deal to 'viewing' stage
    await client.query(
      `UPDATE sales_pipeline SET stage = 'viewing', stage_changed_at = now()
        WHERE id = $1 AND stage = 'inquiry'`,
      [params.dealId],
    );

    return { viewingLog: logs[0], lockDays: 90 };
  });
}

// Confirm viewing attendance (buyer side)
export async function confirmViewing(viewingLogId: string, buyerId: string) {
  const rows = await query(
    `UPDATE viewing_logs
        SET buyer_confirmed = true, buyer_confirmed_at = now()
      WHERE id = $1 AND buyer_id = $2
    RETURNING id, buyer_confirmed_at`,
    [viewingLogId, buyerId],
  );
  if (!rows.length) throw new AppError(403, 'ບໍ່ພົບ ຫຼື ບໍ່ມີສິດ');
  return rows[0];
}

// Viewing logs for a buyer
export async function getBuyerViewings(buyerId: string) {
  return query<any>(
    `SELECT vl.id, vl.lat, vl.lng, vl.buyer_confirmed, vl.buyer_confirmed_at,
            vl.lock_expires_at, vl.created_at, vl.notes,
            p.province, p.district, p.land_type, p.id AS property_id,
            u.full_name AS broker_name, u.phone_e164 AS broker_phone
       FROM viewing_logs vl
       JOIN properties p ON p.id = vl.property_id
       JOIN users u ON u.id = vl.broker_id
      WHERE vl.buyer_id = $1
      ORDER BY vl.created_at DESC`,
    [buyerId],
  );
}

// Broker stats summary
export async function getBrokerStats(brokerId: string) {
  const rows = await query<any>(
    `SELECT
       (SELECT count(*) FROM mandates WHERE broker_id = $1 AND status = 'active') AS active_mandates,
       (SELECT count(*) FROM sales_pipeline WHERE broker_id = $1 AND stage NOT IN ('closed','lost')) AS open_deals,
       (SELECT count(*) FROM sales_pipeline WHERE broker_id = $1 AND stage = 'closed') AS closed_deals,
       (SELECT count(*) FROM viewing_logs WHERE broker_id = $1) AS total_viewings`,
    [brokerId],
  );
  return rows[0];
}
