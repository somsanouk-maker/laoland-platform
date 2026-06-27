import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asyncH, AppError } from '../../middlewares/errorHandler.js';
import * as currency from './currency.service.js';
import { runForeignBuyerWizard } from './foreignWizard.service.js';

const router = Router();

// POST /api/monetization/quotes — ★ Currency-Locked Quote
router.post('/quotes', asyncH(async (req: Request, res: Response) => {
  const schema = z.object({
    propertyId: z.string().uuid(),
    baseCurrency: z.enum(['LAK', 'USD', 'THB']),
    quoteCurrency: z.enum(['LAK', 'USD', 'THB']),
    baseAmount: z.number().positive(),
  });
  const p = schema.safeParse(req.body);
  if (!p.success) throw new AppError(400, 'ຂໍ້ມູນບໍ່ຖືກຕ້ອງ', p.error.flatten());
  res.status(201).json(await currency.createLockedQuote(p.data));
}));

// GET /api/monetization/quotes/:id — ກວດ quote (ໝົດອາຍຸ?)
router.get('/quotes/:id', asyncH(async (req: Request, res: Response) => {
  res.json(await currency.getQuote(req.params.id));
}));

// POST /api/monetization/foreign-wizard — ★ Foreign Buyer Land Wizard (3 ພາສາ)
router.post('/foreign-wizard', asyncH(async (req: Request, res: Response) => {
  const schema = z.object({
    buyerNationality: z.enum(['lao', 'foreign']),
    hasLaoRegisteredEntity: z.boolean().optional(),
    intent: z.enum(['buy_land', 'lease_land', 'buy_condo']).optional(),
    leaseYears: z.number().int().positive().optional(),
    lang: z.enum(['lo', 'en', 'zh']).optional(),
  });
  const p = schema.safeParse(req.body);
  if (!p.success) throw new AppError(400, 'ຂໍ້ມູນບໍ່ຖືກຕ້ອງ', p.error.flatten());
  res.json(runForeignBuyerWizard(p.data));
}));

export default router;
