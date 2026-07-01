import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from './errorHandler.js';

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

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.header('Authorization');
  if (!header?.startsWith('Bearer ')) {
    return next(new AppError(401, 'ຕ້ອງເຂົ້າສູ່ລະບົບ (missing Bearer token)'));
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, env.jwtSecret) as { sub: string; role: AuthUser['role'] };
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    next(new AppError(401, 'Token ໝົດອາຍຸ ຫຼື ບໍ່ຖືກຕ້ອງ — ກະລຸນາ login ໃໝ່'));
  }
}

export function requireRole(...roles: AuthUser['role'][]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError(403, 'ບໍ່ມີສິດເຂົ້າເຖິງ'));
    }
    next();
  };
}
