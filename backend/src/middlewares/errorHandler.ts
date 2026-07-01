import { Request, Response, NextFunction } from 'express';
import { logger } from '../services/logger.js';

// Error ປະເພດທຸລະກິດ ທີ່ມີ HTTP status + ຂໍ້ມູນເພີ່ມ
export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

// middleware ກາງ ຈັບ error ທັງໝົດ — ຕອບ JSON ຮູບແບບດຽວກັນ
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    if (err.status >= 500) {
      logger.error(err.message, { path: req.path, status: err.status });
    }
    return res.status(err.status).json({ error: err.message, details: err.details });
  }
  logger.error('Unhandled error', { path: req.path, err: String(err) });
  return res.status(500).json({ error: 'Internal Server Error' });
}

// ຫໍ່ async handler ເພື່ອບໍ່ຕ້ອງຂຽນ try/catch ທຸກບ່ອນ
export const asyncH =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res, next).catch(next);
