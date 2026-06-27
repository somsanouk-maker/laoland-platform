import express from 'express';
import path from 'node:path';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from './middlewares/errorHandler.js';

// modules (Modular Monolith — mount router ແຍກຕາມ domain)
import propertyRoutes from './modules/properties/property.routes.js';
import ownerRoutes from './modules/owners/owner.routes.js';
import mandateRoutes from './modules/mandates/mandate.routes.js';
import pipelineRoutes from './modules/pipeline/pipeline.routes.js';
import monetizationRoutes from './modules/monetization/monetization.routes.js';
import buyerRoutes from './modules/buyers/buyer.routes.js';

export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '2mb' }));

  app.get('/health', (_req, res) => res.json({ ok: true, service: 'laoland-api' }));

  // ໃຫ້ບໍລິການຮູບທີ່ upload (MVP local storage)
  app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

  // ===== Showroom (public) + Workshop (auth ໃນ router) =====
  app.use('/api/properties', propertyRoutes);     // De-dup, search, detail
  app.use('/api/owners', ownerRoutes);            // Owner Gatekeeping + Single-Price
  app.use('/api/mandates', mandateRoutes);        // Mandate + Referral + Co-broke
  app.use('/api/pipeline', pipelineRoutes);       // CRM pipeline
  app.use('/api/monetization', monetizationRoutes); // Currency-Lock + Foreign Wizard
  app.use('/api/buyers', buyerRoutes);              // Buyer profile + viewing history

  // error handler ກາງ (ຕ້ອງຢູ່ສຸດທ້າຍ)
  app.use(errorHandler);
  return app;
}
