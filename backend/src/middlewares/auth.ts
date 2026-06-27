import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler.js';
import { query } from '../config/db.js';

// ໂຄງສ້າງ user ໃນ request (ຫຼັງ auth)
export interface AuthUser {
  id: string;
  role: 'buyer' | 'owner' | 'broker' | 'admin';
}
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// MVP: ໃຊ້ header X-User-Id ແທນ JWT ເຕັມຮູບແບບ (ປ່ຽນເປັນ JWT ໃນ production)
// ໝາຍເຫດ: Showroom ສ່ວນຫຼາຍ public — middleware ນີ້ໃຊ້ສະເພາະ Workshop
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const userId = req.header('X-User-Id');
  if (!userId) return next(new AppError(401, 'ບໍ່ໄດ້ເຂົ້າສູ່ລະບົບ (missing X-User-Id)'));

  const rows = await query<{ id: string; role: AuthUser['role'] }>(
    'SELECT id, role FROM users WHERE id = $1',
    [userId],
  );
  if (!rows.length) return next(new AppError(401, 'ບໍ່ພົບຜູ້ໃຊ້'));

  req.user = rows[0];
  next();
}

// ຈຳກັດສິດຕາມ role (ເຊັ່ນ Workshop = broker ເທົ່ານັ້ນ)
export function requireRole(...roles: AuthUser['role'][]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError(403, 'ບໍ່ມີສິດເຂົ້າເຖິງ'));
    }
    next();
  };
}
