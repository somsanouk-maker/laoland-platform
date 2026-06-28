import { createApp } from './app.js';
import { env } from './config/env.js';
import { pool } from './config/db.js';
import { runMigrations } from './db/migrate.js';

async function main() {
  await runMigrations();

  const app = createApp();
  const server = app.listen(env.port, () => {
    console.log(`🏯 LaoLand API ກຳລັງເຮັດວຽກຢູ່ http://localhost:${env.port} (${env.nodeEnv})`);
  });

  // graceful shutdown — ປິດ pool ກ່ອນ exit
  async function shutdown() {
    console.log('\nກຳລັງປິດ server...');
    server.close();
    await pool.end();
    process.exit(0);
  }
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
