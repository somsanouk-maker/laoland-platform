import { createApp } from './app.js';
import { env } from './config/env.js';
import { pool } from './config/db.js';
import { runMigrations } from './db/migrate.js';
import { logger } from './services/logger.js';

async function main() {
  await runMigrations();

  const app = createApp();
  const server = app.listen(env.port, () => {
    logger.info('LaoLand API started', { port: env.port, env: env.nodeEnv });
  });

  // graceful shutdown — ປິດ pool ກ່ອນ exit
  async function shutdown() {
    logger.info('Shutting down server');
    server.close();
    await pool.end();
    process.exit(0);
  }
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  logger.error('Failed to start server', { err: String(err) });
  process.exit(1);
});
