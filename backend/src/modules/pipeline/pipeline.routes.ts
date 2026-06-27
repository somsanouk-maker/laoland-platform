import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asyncH, AppError } from '../../middlewares/errorHandler.js';
import { authenticate, requireRole } from '../../middlewares/auth.js';
import * as svc from './pipeline.service.js';

const router = Router();
router.use(authenticate, requireRole('broker', 'admin'));

// GET /api/pipeline/board — Kanban ຂອງນາຍໜ້າ
router.get('/board', asyncH(async (req: Request, res: Response) => {
  res.json(await svc.getBoard(req.user!.id));
}));

// POST /api/pipeline — ສ້າງ deal ໃໝ່
router.post('/', asyncH(async (req: Request, res: Response) => {
  const schema = z.object({
    propertyId: z.string().uuid(),
    mandateId: z.string().uuid().optional(),
    buyerId: z.string().uuid().optional(),
    amount: z.number().nonnegative().optional(),
    currency: z.enum(['LAK', 'USD', 'THB']).optional(),
  });
  const p = schema.safeParse(req.body);
  if (!p.success) throw new AppError(400, 'ຂໍ້ມູນບໍ່ຖືກຕ້ອງ', p.error.flatten());
  res.status(201).json(await svc.createDeal({ brokerId: req.user!.id, ...p.data }));
}));

// PATCH /api/pipeline/:id/stage — ປ່ຽນ stage
router.patch('/:id/stage', asyncH(async (req: Request, res: Response) => {
  const schema = z.object({
    stage: z.enum(['inquiry', 'viewing', 'negotiation', 'deposit', 'closed', 'lost']),
  });
  const p = schema.safeParse(req.body);
  if (!p.success) throw new AppError(400, 'ຂໍ້ມູນບໍ່ຖືກຕ້ອງ', p.error.flatten());
  res.json(await svc.moveStage(req.params.id, req.user!.id, p.data.stage));
}));

// POST /api/pipeline/:id/log-viewing — GPS viewing log (ລັອກ buyer 90 ມື້)
router.post('/:id/log-viewing', asyncH(async (req: Request, res: Response) => {
  const schema = z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    notes: z.string().optional(),
  });
  const p = schema.safeParse(req.body);
  if (!p.success) throw new AppError(400, 'ຂໍ້ມູນບໍ່ຖືກຕ້ອງ', p.error.flatten());
  res.json(await svc.logViewing({ dealId: req.params.id, brokerId: req.user!.id, ...p.data }));
}));

// GET /api/pipeline/stats — broker stats
router.get('/stats', asyncH(async (req: Request, res: Response) => {
  res.json(await svc.getBrokerStats(req.user!.id));
}));

export default router;
