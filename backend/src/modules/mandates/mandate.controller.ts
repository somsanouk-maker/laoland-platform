import { Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../../middlewares/errorHandler.js';
import * as mandate from './mandate.service.js';
import { syncGreenBadge } from '../properties/property.service.js';
import * as referral from './referral.service.js';
import * as cobroke from './cobroke.service.js';
import { query } from '../../config/db.js';

// ===== Mandate =====
export async function requestMandate(req: Request, res: Response) {
  const schema = z.object({
    propertyId: z.string().uuid(),
    isExclusive: z.boolean().optional(),
    commissionPct: z.number().min(0).max(100).optional(),
  });
  const p = schema.safeParse(req.body);
  if (!p.success) throw new AppError(400, 'ຂໍ້ມູນບໍ່ຖືກຕ້ອງ', p.error.flatten());
  res.status(201).json(await mandate.requestMandate({ brokerId: req.user!.id, ...p.data }));
}

export async function resolveLink(req: Request, res: Response) {
  res.json(await mandate.resolveTrackableLink(req.params.slug));
}

export async function listMandates(req: Request, res: Response) {
  res.json(await mandate.getBrokerMandates(req.user!.id));
}

// ===== First-Referral Protection =====
export async function registerReferral(req: Request, res: Response) {
  const schema = z.object({
    propertyId: z.string().uuid(),
    buyerPhoneE164: z.string().regex(/^\+\d{8,15}$/, 'ເບີຕ້ອງເປັນ E.164'),
    buyerId: z.string().uuid().optional(),
  });
  const p = schema.safeParse(req.body);
  if (!p.success) throw new AppError(400, 'ຂໍ້ມູນບໍ່ຖືກຕ້ອງ', p.error.flatten());
  res.status(201).json(await referral.registerReferral({ brokerId: req.user!.id, ...p.data }));
}

export async function checkProtection(req: Request, res: Response) {
  const schema = z.object({ propertyId: z.string().uuid(), buyerPhoneE164: z.string() });
  const p = schema.safeParse(req.body);
  if (!p.success) throw new AppError(400, 'ຂໍ້ມູນບໍ່ຖືກຕ້ອງ', p.error.flatten());
  res.json(await referral.checkProtection(p.data.propertyId, p.data.buyerPhoneE164));
}

// List all brokers (excluding self) for co-broke partner selection
export async function listBrokers(req: Request, res: Response) {
  const rows = await query<any>(
    `SELECT id, full_name FROM users WHERE role = 'broker' AND id != $1 ORDER BY full_name`,
    [req.user!.id],
  );
  res.json(rows);
}

// ===== Co-broke =====
export async function listCobrokes(req: Request, res: Response) {
  res.json(await cobroke.listCobrokes(req.user!.id));
}

export async function proposeCoBroke(req: Request, res: Response) {
  const schema = z.object({
    propertyId: z.string().uuid(),
    cobrokeBrokerId: z.string().uuid(),
    buyerId: z.string().uuid().optional(),
    splitListingPct: z.number().min(0).max(100).optional(),
    splitCobrokePct: z.number().min(0).max(100).optional(),
  });
  const p = schema.safeParse(req.body);
  if (!p.success) throw new AppError(400, 'ຂໍ້ມູນບໍ່ຖືກຕ້ອງ', p.error.flatten());
  res.status(201).json(await cobroke.proposeCoBroke({ listingBrokerId: req.user!.id, ...p.data }));
}

export async function acceptCoBroke(req: Request, res: Response) {
  res.json(await cobroke.acceptCoBroke(req.params.id, req.user!.id));
}

export async function rejectCoBroke(req: Request, res: Response) {
  res.json(await cobroke.rejectCoBroke(req.params.id, req.user!.id));
}

export async function getBuyer(req: Request, res: Response) {
  res.json(await cobroke.getBuyerForBroker(req.params.id, req.user!.id));
}

// ===== Renounce mandate (broker-initiated) =====
export async function renounceMandate(req: Request, res: Response) {
  const result = await mandate.renounceMandate(req.user!.id, req.params.id);
  await syncGreenBadge(result.property_id);
  res.json({ renounced: true });
}
