import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asyncH, AppError } from '../../middlewares/errorHandler.js';
import { authenticate, requireRole } from '../../middlewares/auth.js';
import { query, withTransaction } from '../../config/db.js';

const router = Router();

// ທຸກ endpoint ໃນ admin ຕ້ອງເປັນ admin role
router.use(authenticate, requireRole('admin'));

// ===== Users =====

// GET /api/admin/users
router.get('/users', asyncH(async (_req: Request, res: Response) => {
  const rows = await query<any>(
    `SELECT id, full_name, phone_e164, role, is_active, created_at
       FROM users
      ORDER BY created_at DESC`,
  );
  res.json(rows);
}));

// PATCH /api/admin/users/:id/deactivate — soft-delete
router.patch('/users/:id/deactivate', asyncH(async (req: Request, res: Response) => {
  await withTransaction(async (client) => {
    const { rows } = await client.query(
      `UPDATE users SET is_active = false WHERE id = $1 AND role != 'admin' RETURNING id`,
      [req.params.id],
    );
    if (!rows.length) throw new AppError(404, 'ບໍ່ພົບ user ຫຼື ບໍ່ສາມາດປິດ admin account ໄດ້');
    await client.query(
      `INSERT INTO audit_log (actor_id, action, entity, entity_id) VALUES ($1, 'user_deactivate', 'user', $2)`,
      [req.user!.id, req.params.id],
    );
  });
  res.json({ deactivated: true });
}));

// PATCH /api/admin/users/:id/activate — re-activate
router.patch('/users/:id/activate', asyncH(async (req: Request, res: Response) => {
  await withTransaction(async (client) => {
    const { rows } = await client.query(
      `UPDATE users SET is_active = true WHERE id = $1 RETURNING id`,
      [req.params.id],
    );
    if (!rows.length) throw new AppError(404, 'ບໍ່ພົບ user');
    await client.query(
      `INSERT INTO audit_log (actor_id, action, entity, entity_id) VALUES ($1, 'user_activate', 'user', $2)`,
      [req.user!.id, req.params.id],
    );
  });
  res.json({ activated: true });
}));

// ===== Properties =====

// GET /api/admin/properties?limit=&offset=
router.get('/properties', asyncH(async (req: Request, res: Response) => {
  const schema = z.object({
    limit: z.coerce.number().int().min(1).max(200).default(50),
    offset: z.coerce.number().int().min(0).default(0),
  });
  const { limit, offset } = schema.parse(req.query);
  const rows = await query<any>(
    `SELECT p.id, p.province, p.district, p.land_type, p.deed_type,
            p.owner_set_price, p.price_currency, p.status, p.green_badge,
            p.owner_verified, p.created_at,
            u.full_name AS created_by_name
       FROM properties p
       LEFT JOIN users u ON u.id = p.created_by
      ORDER BY p.created_at DESC
      LIMIT $1 OFFSET $2`,
    [limit, offset],
  );
  res.json(rows);
}));

// ===== Mandates =====

// GET /api/admin/mandates?limit=&offset=
router.get('/mandates', asyncH(async (req: Request, res: Response) => {
  const schema = z.object({
    limit: z.coerce.number().int().min(1).max(200).default(50),
    offset: z.coerce.number().int().min(0).default(0),
  });
  const { limit, offset } = schema.parse(req.query);
  const rows = await query<any>(
    `SELECT m.id, m.mandate_type, m.status, m.is_exclusive, m.commission_pct,
            m.created_at, m.approved_at, m.revoked_at,
            p.province, p.district, p.land_type, p.id AS property_id,
            u.full_name AS broker_name, u.phone_e164 AS broker_phone
       FROM mandates m
       JOIN properties p ON p.id = m.property_id
       JOIN users u ON u.id = m.broker_id
      ORDER BY m.created_at DESC
      LIMIT $1 OFFSET $2`,
    [limit, offset],
  );
  res.json(rows);
}));

// ===== Audit Log =====

// GET /api/admin/audit-log?limit=&offset=
router.get('/audit-log', asyncH(async (req: Request, res: Response) => {
  const schema = z.object({
    limit: z.coerce.number().int().min(1).max(200).default(50),
    offset: z.coerce.number().int().min(0).default(0),
  });
  const { limit, offset } = schema.parse(req.query);
  const rows = await query<any>(
    `SELECT a.id, a.action, a.entity, a.entity_id, a.meta, a.created_at,
            u.full_name AS actor_name, u.role AS actor_role
       FROM audit_log a
       LEFT JOIN users u ON u.id = a.actor_id
      ORDER BY a.created_at DESC
      LIMIT $1 OFFSET $2`,
    [limit, offset],
  );
  res.json(rows);
}));

export default router;
