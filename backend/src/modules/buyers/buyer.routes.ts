import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asyncH, AppError } from '../../middlewares/errorHandler.js';
import { authenticate, requireRole } from '../../middlewares/auth.js';
import { query } from '../../config/db.js';
import { getBuyerViewings, confirmViewing } from '../pipeline/pipeline.service.js';

const router = Router();
router.use(authenticate, requireRole('buyer', 'admin'));

// GET /api/buyers/profile
router.get('/profile', asyncH(async (req: Request, res: Response) => {
  const rows = await query<any>(
    'SELECT * FROM buyer_profiles WHERE buyer_id = $1',
    [req.user!.id],
  );
  res.json(rows[0] ?? null);
}));

// PUT /api/buyers/profile — upsert profile + preferences
router.put('/profile', asyncH(async (req: Request, res: Response) => {
  const schema = z.object({
    preferredProvinces: z.array(z.string()).optional(),
    preferredDistricts: z.array(z.string()).optional(),
    preferredLandTypes: z.array(z.string()).optional(),
    budgetMinLak: z.number().nonnegative().optional(),
    budgetMaxLak: z.number().nonnegative().optional(),
    notes: z.string().optional(),
  });
  const p = schema.safeParse(req.body);
  if (!p.success) throw new AppError(400, 'ຂໍ້ມູນບໍ່ຖືກຕ້ອງ', p.error.flatten());

  const rows = await query<any>(
    `INSERT INTO buyer_profiles
       (buyer_id, preferred_provinces, preferred_districts, preferred_land_types,
        budget_min_lak, budget_max_lak, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (buyer_id) DO UPDATE SET
       preferred_provinces  = EXCLUDED.preferred_provinces,
       preferred_districts  = EXCLUDED.preferred_districts,
       preferred_land_types = EXCLUDED.preferred_land_types,
       budget_min_lak       = EXCLUDED.budget_min_lak,
       budget_max_lak       = EXCLUDED.budget_max_lak,
       notes                = EXCLUDED.notes,
       updated_at           = now()
     RETURNING *`,
    [req.user!.id,
     p.data.preferredProvinces ?? null,
     p.data.preferredDistricts ?? null,
     p.data.preferredLandTypes ?? null,
     p.data.budgetMinLak ?? null,
     p.data.budgetMaxLak ?? null,
     p.data.notes ?? null],
  );
  res.json(rows[0]);
}));

// GET /api/buyers/saved — list saved properties with broker info
router.get('/saved', asyncH(async (req: Request, res: Response) => {
  const rows = await query<any>(
    `SELECT sp.id AS saved_id, sp.saved_at, sp.broker_id,
            p.id, p.province, p.district, p.village, p.land_type,
            p.owner_set_price, p.price_currency, p.area_sqm,
            p.green_badge, p.status,
            p.lat, p.lng,
            b.full_name AS broker_name
       FROM saved_properties sp
       JOIN properties p ON p.id = sp.property_id
       LEFT JOIN users b ON b.id = sp.broker_id
      WHERE sp.buyer_id = $1
      ORDER BY sp.saved_at DESC`,
    [req.user!.id],
  );
  res.json(rows);
}));

// POST /api/buyers/saved — save a property (with optional broker selection)
router.post('/saved', asyncH(async (req: Request, res: Response) => {
  const schema = z.object({
    propertyId: z.string().uuid(),
    brokerId: z.string().uuid().optional(),
  });
  const p = schema.safeParse(req.body);
  if (!p.success) throw new AppError(400, 'ຂໍ້ມູນບໍ່ຖືກຕ້ອງ', p.error.flatten());

  const rows = await query<any>(
    `INSERT INTO saved_properties (buyer_id, property_id, broker_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (buyer_id, property_id) DO UPDATE SET broker_id = EXCLUDED.broker_id, saved_at = now()
     RETURNING id, saved_at`,
    [req.user!.id, p.data.propertyId, p.data.brokerId ?? null],
  );
  res.status(201).json(rows[0]);
}));

// DELETE /api/buyers/saved/:propertyId — unsave
router.delete('/saved/:propertyId', asyncH(async (req: Request, res: Response) => {
  await query(
    'DELETE FROM saved_properties WHERE buyer_id = $1 AND property_id = $2',
    [req.user!.id, req.params.propertyId],
  );
  res.json({ removed: true });
}));

// GET /api/buyers/viewings — GPS-verified viewing history
router.get('/viewings', asyncH(async (req: Request, res: Response) => {
  res.json(await getBuyerViewings(req.user!.id));
}));

// POST /api/buyers/viewings/:id/confirm — buyer confirms attendance
router.post('/viewings/:id/confirm', asyncH(async (req: Request, res: Response) => {
  res.json(await confirmViewing(req.params.id, req.user!.id));
}));

export default router;
