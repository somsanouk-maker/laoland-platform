import { Router, Request, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { asyncH, AppError } from '../../middlewares/errorHandler.js';
import { authenticate, requireRole } from '../../middlewares/auth.js';
import * as ctrl from './property.controller.js';
import { query } from '../../config/db.js';
import { createDeal } from '../pipeline/pipeline.service.js';

const router = Router();

// multer: ເກັບໃນ memory (buffer) ເພື່ອສົ່ງໃຫ້ sharp ຄຳນວນ pHash, ຈຳກັດ 8MB/ໄຟລ໌
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 10 },
  fileFilter: (_req, file, cb) => cb(null, file.mimetype.startsWith('image/')),
});

// Showroom (public): ສະຖິຕິ, ຄົ້ນຫາ, ລາຍລະອຽດ
router.get('/market-stats', asyncH(ctrl.marketStats));
router.get('/', asyncH(ctrl.search));
router.get('/:id', asyncH(ctrl.getOne));

// Public: list active mandate brokers for a property (for buyer broker selection)
router.get('/:id/brokers', asyncH(async (req: Request, res: Response) => {
  const rows = await query<any>(
    `SELECT m.id AS mandate_id, m.mandate_type, m.is_exclusive,
            u.id AS broker_id, u.full_name AS broker_name
       FROM mandates m JOIN users u ON u.id = m.broker_id
      WHERE m.property_id = $1 AND m.status = 'active'
      ORDER BY m.is_exclusive DESC, m.created_at ASC`,
    [req.params.id],
  );
  res.json(rows);
}));

// Public: buyer requests info or visit — routed through mandate broker (Buffer Layer)
router.post('/:id/inquire', asyncH(async (req: Request, res: Response) => {
  const schema = z.object({
    type: z.enum(['info', 'viewing']),
    buyerName: z.string().min(1),
    buyerPhone: z.string().min(6),
    message: z.string().optional(),
    buyerId: z.string().uuid().optional(),
  });
  const p = schema.safeParse(req.body);
  if (!p.success) throw new AppError(400, 'ຂໍ້ມູນບໍ່ຖືກຕ້ອງ', p.error.flatten());

  // Find the active mandate broker for this property (Buffer Layer)
  const mandates = await query<any>(
    `SELECT m.broker_id, u.full_name AS broker_name, u.phone_e164 AS broker_phone
       FROM mandates m JOIN users u ON u.id = m.broker_id
      WHERE m.property_id = $1 AND m.status = 'active'
      ORDER BY m.is_exclusive DESC, m.created_at ASC
      LIMIT 1`,
    [req.params.id],
  );
  if (!mandates.length) throw new AppError(404, 'ບໍ່ພົບນາຍໜ້າທີ່ຮັບຜິດຊອບ — ທີ່ດິນນີ້ຍັງບໍ່ມີ mandate');

  const broker = mandates[0];

  // Create a pipeline deal at inquiry stage
  const deal = await createDeal({
    brokerId: broker.broker_id,
    propertyId: req.params.id,
    buyerId: p.data.buyerId,
    notes: `[${p.data.type === 'viewing' ? 'ຂໍນັດຊົມ' : 'ຂໍຂໍ້ມູນ'}] ${p.data.buyerName} · ${p.data.buyerPhone}${p.data.message ? ' · ' + p.data.message : ''}`,
  });

  res.status(201).json({
    success: true,
    dealId: deal.id,
    brokerName: broker.broker_name,
    type: p.data.type,
  });
}));

// Workshop (broker): ກວດຊໍ້າ + ສ້າງທີ່ດິນ + ຈັດການຮູບ
router.post('/check-duplicate', authenticate, requireRole('broker', 'admin'), asyncH(ctrl.checkDuplicate));
router.post('/', authenticate, requireRole('broker', 'admin'), asyncH(ctrl.create));

// ★ Image pipeline (De-dup ກົດທີ 3)
router.post('/images/hash', authenticate, requireRole('broker', 'admin'),
  upload.array('images', 10), asyncH(ctrl.hashImages));
router.post('/:id/images', authenticate, requireRole('broker', 'admin'),
  upload.array('images', 10), asyncH(ctrl.uploadImages));

export default router;
