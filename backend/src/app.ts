import express from 'express';
import path from 'node:path';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { errorHandler } from './middlewares/errorHandler.js';

import authRoutes from './modules/auth/auth.routes.js';

// modules (Modular Monolith — mount router ແຍກຕາມ domain)
import propertyRoutes from './modules/properties/property.routes.js';
import ownerRoutes from './modules/owners/owner.routes.js';
import mandateRoutes from './modules/mandates/mandate.routes.js';
import pipelineRoutes from './modules/pipeline/pipeline.routes.js';
import monetizationRoutes from './modules/monetization/monetization.routes.js';
import buyerRoutes from './modules/buyers/buyer.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';

// Rate limiters
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,        // 1 minute
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — please slow down' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts — try again in 15 minutes' },
});

const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,   // 10 minutes
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many OTP requests — try again in 10 minutes' },
});

export function createApp() {
  const app = express();
  app.use(helmet());

  // CORS locked to allowed origins only
  app.use(cors({
    origin: (origin, cb) => {
      // Allow server-to-server (no origin) and explicitly listed origins
      if (!origin || env.allowedOrigins.includes(origin)) {
        cb(null, true);
      } else {
        cb(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    credentials: true,
  }));

  app.use(express.json({ limit: '2mb' }));
  app.use(generalLimiter);

  app.get('/health', (_req, res) => res.json({ ok: true, service: 'laoland-api' }));

  // ໃຫ້ບໍລິການຮູບທີ່ upload (MVP local storage)
  app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

  // ===== Auth (public — no authenticate middleware) =====
  app.use('/api/auth/login/request-otp', otpLimiter);
  app.use('/api/auth', authLimiter, authRoutes);

  // ===== Showroom (public) + Workshop (auth ໃນ router) =====
  app.use('/api/properties', propertyRoutes);       // De-dup, search, detail
  app.use('/api/owners', ownerRoutes);              // Owner Gatekeeping + Single-Price
  app.use('/api/mandates', mandateRoutes);          // Mandate + Referral + Co-broke
  app.use('/api/pipeline', pipelineRoutes);         // CRM pipeline
  app.use('/api/monetization', monetizationRoutes); // Currency-Lock + Foreign Wizard
  app.use('/api/buyers', buyerRoutes);              // Buyer profile + viewing history
  app.use('/api/admin', adminRoutes);               // Admin portal

  // error handler ກາງ (ຕ້ອງຢູ່ສຸດທ້າຍ)
  app.use(errorHandler);
  return app;
}
