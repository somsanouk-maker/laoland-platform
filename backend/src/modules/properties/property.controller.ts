import { Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../../middlewares/errorHandler.js';
import * as svc from './property.service.js';
import * as images from './image.service.js';

const createSchema = z.object({
  titleDeedNo: z.string().trim().min(1).optional().nullable(),
  deedType: z.enum(['titled', 'survey', 'tax_receipt', 'white_paper']),
  landType: z.enum(['residential', 'agricultural', 'industrial', 'commercial']),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  areaSqm: z.number().positive().optional(),
  province: z.string().min(1),
  district: z.string().min(1),
  village: z.string().optional(),
  addressText: z.string().optional(),
  ownerSetPrice: z.number().nonnegative().optional(),
  priceCurrency: z.enum(['LAK', 'USD', 'THB']).optional(),
  // phash ສົ່ງມາເປັນ string (bigint) → ແປງເປັນ BigInt
  imagePhashes: z.array(z.string()).optional(),
});

// POST /api/properties — broker ປ້ອນທີ່ດິນໃໝ່ (ຜ່ານ De-dup)
export async function create(req: Request, res: Response) {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'ຂໍ້ມູນບໍ່ຖືກຕ້ອງ', parsed.error.flatten());

  const result = await svc.createProperty({
    ...parsed.data,
    imagePhashes: parsed.data.imagePhashes?.map((s) => BigInt(s)),
    createdBy: req.user!.id,
  });
  res.status(201).json(result);
}

// POST /api/properties/check-duplicate — ກວດກ່ອນ (live ໃນ form)
export async function checkDuplicate(req: Request, res: Response) {
  const schema = createSchema.pick({ titleDeedNo: true, lat: true, lng: true, imagePhashes: true });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'ຂໍ້ມູນບໍ່ຖືກຕ້ອງ', parsed.error.flatten());

  const dup = await svc.findDuplicate({
    ...parsed.data,
    imagePhashes: parsed.data.imagePhashes?.map((s) => BigInt(s)),
  });
  res.json({
    isDuplicate: !!dup,
    match: dup,
    redirectTo: dup ? `/workshop/properties/${dup.propertyId}/request-mandate` : null,
  });
}

// GET /api/properties/market-stats — public dashboard stats
export async function marketStats(_req: Request, res: Response) {
  res.json(await svc.getMarketStats());
}

// GET /api/properties — ຄົ້ນຫາ (Showroom public)
export async function search(req: Request, res: Response) {
  const schema = z.object({
    province: z.string().optional(),
    district: z.string().optional(),
    landType: z.enum(['residential', 'agricultural', 'industrial', 'commercial']).optional(),
    minPrice: z.coerce.number().positive().optional(),
    maxPrice: z.coerce.number().positive().optional(),
    greenBadge: z.coerce.boolean().optional(),
    limit: z.coerce.number().int().min(1).max(200).optional(),
    offset: z.coerce.number().int().min(0).optional(),
  });
  const parsed = schema.safeParse(req.query);
  if (!parsed.success) throw new AppError(400, 'query ບໍ່ຖືກຕ້ອງ', parsed.error.flatten());
  res.json(await svc.searchProperties(parsed.data));
}

// GET /api/properties/:id
export async function getOne(req: Request, res: Response) {
  const p = await svc.getProperty(req.params.id);
  if (!p) throw new AppError(404, 'ບໍ່ພົບທີ່ດິນ');
  res.json(p);
}

// POST /api/properties/images/hash — ຄຳນວນ pHash ຂອງຮູບ (ໃຊ້ກວດຊໍ້າກ່ອນສ້າງ)
export async function hashImages(req: Request, res: Response) {
  const files = (req.files as Express.Multer.File[]) ?? [];
  if (!files.length) throw new AppError(400, 'ບໍ່ມີໄຟລ໌ຮູບ');
  const phashes = await images.hashOnly(files);
  res.json({ phashes }); // ສົ່ງໄປໃສ່ imagePhashes ໃນ check-duplicate / create
}

// POST /api/properties/:id/images — upload + ບັນທຶກ phash ໃສ່ທີ່ດິນ
export async function uploadImages(req: Request, res: Response) {
  const files = (req.files as Express.Multer.File[]) ?? [];
  if (!files.length) throw new AppError(400, 'ບໍ່ມີໄຟລ໌ຮູບ');
  const isDrone = req.body?.isDrone === 'true';
  const saved = await images.attachImages(req.params.id, files, { isDrone });
  res.status(201).json(saved);
}

// DELETE /api/properties/:id/images/:imageId
export async function deleteImage(req: Request, res: Response) {
  await images.deleteImage(req.params.imageId, req.params.id);
  res.json({ deleted: true });
}

// PATCH /api/properties/:id — edit non-locked fields; admin can also change price
export async function editProperty(req: Request, res: Response) {
  const schema = z.object({
    province: z.string().min(1).optional(),
    district: z.string().min(1).optional(),
    village: z.string().optional(),
    addressText: z.string().optional(),
    landType: z.enum(['residential', 'agricultural', 'industrial', 'commercial']).optional(),
    deedType: z.enum(['titled', 'survey', 'tax_receipt', 'white_paper']).optional(),
    areaSqm: z.number().positive().optional(),
    ownerSetPrice: z.number().nonnegative().optional(),
    priceCurrency: z.enum(['LAK', 'USD', 'THB']).optional(),
    priceChangeReason: z.string().optional(),
  });
  const p = schema.safeParse(req.body);
  if (!p.success) throw new AppError(400, 'ຂໍ້ມູນບໍ່ຖືກຕ້ອງ', p.error.flatten());
  res.json(await svc.editProperty(req.params.id, req.user!.id, req.user!.role, p.data));
}

// POST /api/properties/:id/sold
export async function markSold(req: Request, res: Response) {
  res.json(await svc.markSold(req.params.id, req.user!.id, req.user!.role));
}

// POST /api/properties/:id/archive
export async function archiveProperty(req: Request, res: Response) {
  res.json(await svc.archiveProperty(req.params.id, req.user!.id, req.user!.role));
}
