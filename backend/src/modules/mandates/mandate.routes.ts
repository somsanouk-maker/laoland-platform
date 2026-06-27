import { Router } from 'express';
import { asyncH } from '../../middlewares/errorHandler.js';
import { authenticate, requireRole } from '../../middlewares/auth.js';
import * as ctrl from './mandate.controller.js';

const router = Router();

// public: ແປງ trackable link (buyer ກົດ link ນາຍໜ້າ)
router.get('/link/:slug', asyncH(ctrl.resolveLink));

// broker-only
router.use(authenticate, requireRole('broker', 'admin'));

router.get('/', asyncH(ctrl.listMandates));
router.post('/', asyncH(ctrl.requestMandate));

// First-Referral Protection
router.post('/referrals', asyncH(ctrl.registerReferral));
router.post('/referrals/check', asyncH(ctrl.checkProtection));

// Co-broke + Masking
router.get('/brokers', asyncH(ctrl.listBrokers));
router.get('/cobroke', asyncH(ctrl.listCobrokes));
router.post('/cobroke', asyncH(ctrl.proposeCoBroke));
router.post('/cobroke/:id/accept', asyncH(ctrl.acceptCoBroke));
router.get('/cobroke/:id/buyer', asyncH(ctrl.getBuyer)); // ★ ສົ່ງຄືນ buyer ແບບ masked

export default router;
