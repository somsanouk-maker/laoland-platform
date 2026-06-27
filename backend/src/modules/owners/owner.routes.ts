import { Router } from 'express';
import { asyncH } from '../../middlewares/errorHandler.js';
import { authenticate, requireRole } from '../../middlewares/auth.js';
import * as ctrl from './owner.controller.js';

const router = Router();

// ທຸກ endpoint ໃນນີ້ສະເພາະ Owner (ກວດ role)
router.use(authenticate, requireRole('owner'));

router.post('/otp/request', asyncH(ctrl.requestOtp));
router.post('/otp/verify', asyncH(ctrl.verify));
router.get('/properties', asyncH(ctrl.listOwnerProperties));
router.get('/mandates', asyncH(ctrl.listOwnerMandates));
router.post('/mandates/:id/approve', asyncH(ctrl.approveMandate));
router.post('/mandates/:id/revoke', asyncH(ctrl.revoke));

export default router;
