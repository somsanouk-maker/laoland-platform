import { readFileSync } from 'fs';
import { resolve } from 'path';
import { pool } from '../config/db.js';

export async function runMigrations() {
  const client = await pool.connect();
  try {
    // Check if tables already exist — skip if already migrated
    const { rows } = await client.query(`
      SELECT COUNT(*) AS count FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'users'
    `);
    if (Number(rows[0].count) > 0) {
      console.log('✅ Database already migrated — skipping schema');
      return;
    }

    console.log('🔧 Running schema migration...');
    const sqlDir = resolve(process.cwd(), 'dist', 'db');
    const schema = readFileSync(resolve(sqlDir, 'schema.sql'), 'utf8');
    await client.query(schema);
    console.log('✅ Schema created');

    console.log('🌱 Running seed data...');
    const seed = readFileSync(resolve(sqlDir, 'seed.sql'), 'utf8');
    await client.query(seed);
    console.log('✅ Seed data inserted');

  } catch (err) {
    console.error('❌ Migration failed:', err);
    throw err;
  } finally {
    client.release();
  }
}
