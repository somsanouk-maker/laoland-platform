import { Router } from 'express';
import { requestLoginOtp, verifyLoginOtp } from './auth.service.js';
import { AppError } from '../../middlewares/errorHandler.js';

const router = Router();

// POST /api/auth/login/request-otp — send WhatsApp OTP
router.post('/login/request-otp', async (req, res, next) => {
  try {
    const { phone } = req.body;
    if (!phone || typeof phone !== 'string') throw new AppError(400, 'phone required');
    const result = await requestLoginOtp(phone.trim());
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login/verify — verify OTP → return JWT
router.post('/login/verify', async (req, res, next) => {
  try {
    const { phone, code } = req.body;
    if (!phone || !code) throw new AppError(400, 'phone and code required');
    const result = await verifyLoginOtp(phone.trim(), String(code).trim());
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
