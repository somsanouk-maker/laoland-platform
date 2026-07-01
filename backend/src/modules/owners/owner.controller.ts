import { Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../../middlewares/errorHandler.js';
import * as svc from './otp.service.js';
import { syncGreenBadge } from '../properties/property.service.js';
import { sendWhatsAppText, buildMandateApprovedMessage } from '../../services/whatsapp.js';

// POST /api/owners/otp/request
export async function requestOtp(req: Request, res: Response) {
  const schema = z.object({
    propertyId: z.string().uuid(),
    purpose: z.enum(['activate_listing', 'confirm_price', 'revoke_broker']).default('activate_listing'),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'ຂໍ້ມູນບໍ່ຖືກຕ້ອງ', parsed.error.flatten());

  const result = await svc.requestOtp({ ownerId: req.user!.id, ...parsed.data });
  res.json(result);
}

// POST /api/owners/otp/verify — ຢືນຢັນ + ຕັ້ງລາຄາກາງ
export async function verify(req: Request, res: Response) {
  const schema = z.object({
    propertyId: z.string().uuid(),
    code: z.string().length(6),
    ownerSetPrice: z.number().nonnegative(),
    priceCurrency: z.enum(['LAK', 'USD', 'THB']),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'ຂໍ້ມູນບໍ່ຖືກຕ້ອງ', parsed.error.flatten());

  const result = await svc.verifyAndActivate({ ownerId: req.user!.id, ...parsed.data });
  res.json(result);
}

// GET /api/owners/mandates — ລາຍຊື່ mandate ທີ່ broker ຂໍຕໍ່ທີ່ດິນຂອງ owner ນີ້
export async function listOwnerMandates(req: Request, res: Response) {
  const { query } = await import('../../config/db.js');
  const rows = await query<any>(
    `SELECT m.id, m.mandate_type, m.status, m.commission_pct, m.is_exclusive,
            m.created_at, m.trackable_slug,
            p.province, p.district, p.land_type, p.owner_set_price, p.price_currency, p.id AS property_id,
            u.full_name AS broker_name, u.phone_e164 AS broker_phone
       FROM mandates m
       JOIN properties p ON p.id = m.property_id
       JOIN users u ON u.id = m.broker_id
      WHERE p.owner_id = $1
      ORDER BY m.created_at DESC`,
    [req.user!.id],
  );
  res.json(rows);
}

// POST /api/owners/mandates/:id/revoke
export async function revoke(req: Request, res: Response) {
  const result = await svc.revokeMandate(req.user!.id, req.params.id);
  res.json(result);
}

// POST /api/owners/mandates/:id/approve — ອະນຸມັດ mandate ຂອງນາຍໜ້າ
export async function approveMandate(req: Request, res: Response) {
  const { query } = await import('../../config/db.js');
  const rows = await query<any>(
    `UPDATE mandates m
        SET status = 'active', approved_at = now()
       FROM properties p, users u
      WHERE m.id = $1 AND m.property_id = p.id AND p.owner_id = $2
        AND m.status = 'requested' AND u.id = m.broker_id
    RETURNING m.id, m.status, m.approved_at, m.property_id,
              p.province, p.district,
              u.phone_e164 AS broker_phone, u.full_name AS broker_name`,
    [req.params.id, req.user!.id],
  );
  if (!rows.length) throw new AppError(403, 'ບໍ່ພົບ mandate ຫຼື ບໍ່ມີສິດ ຫຼື ສະຖານະບໍ່ຖືກຕ້ອງ');

  const r = rows[0];
  await syncGreenBadge(r.property_id);
  await sendWhatsAppText(r.broker_phone, buildMandateApprovedMessage(r.broker_name, `${r.province}, ${r.district}`));
  res.json({ approved: true, mandate: { id: r.id, status: r.status, approved_at: r.approved_at } });
}

// GET /api/owners/properties — ລາຍຊື່ທີ່ດິນຂອງ owner + stats
export async function listOwnerProperties(req: Request, res: Response) {
  const { query } = await import('../../config/db.js');
  const rows = await query<any>(
    `SELECT p.id, p.province, p.district, p.land_type, p.deed_type,
            p.owner_set_price, p.price_currency, p.price_locked,
            p.status, p.owner_verified, p.green_badge, p.created_at,
            (SELECT count(*) FROM mandates m WHERE m.property_id = p.id AND m.status = 'active') AS active_mandates,
            (SELECT count(*) FROM mandates m WHERE m.property_id = p.id AND m.status = 'requested') AS pending_mandates,
            (SELECT count(*) FROM sales_pipeline sp WHERE sp.property_id = p.id) AS inquiries
       FROM properties p
      WHERE p.owner_id = $1
      ORDER BY p.created_at DESC`,
    [req.user!.id],
  );
  res.json(rows);
}
