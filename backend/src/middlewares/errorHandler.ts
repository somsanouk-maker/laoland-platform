import { Request, Response, NextFunction } from 'express';

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
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }
  console.error('[UNHANDLED]', err);
  return res.status(500).json({ error: 'Internal Server Error' });
}

// ຫໍ່ async handler ເພື່ອບໍ່ຕ້ອງຂຽນ try/catch ທຸກບ່ອນ
export const asyncH =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res, next).catch(next);
