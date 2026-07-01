import { existsSync } from 'fs';
import { readdir, readFile } from 'fs/promises';
import { resolve } from 'path';
import { pool } from '../config/db.js';

function sqlDir(): string {
  const srcPath = resolve(process.cwd(), 'src', 'db');
  return existsSync(resolve(srcPath, 'schema.sql')) ? srcPath : resolve(process.cwd(), 'dist', 'db');
}

export async function runMigrations() {
  const client = await pool.connect();
  try {
    // Always ensure the migration tracker exists before anything else
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id         serial PRIMARY KEY,
        filename   text NOT NULL UNIQUE,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    const { rows: tableCheck } = await client.query(`
      SELECT COUNT(*) AS count FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'users'
    `);
    const isExistingDb = Number(tableCheck[0].count) > 0;

    const base = sqlDir();

    if (!isExistingDb) {
      console.log('🔧 Fresh database — applying schema...');
      const schema = await readFile(resolve(base, 'schema.sql'), 'utf8');
      await client.query(schema);
      console.log('✅ Schema created');

      console.log('🌱 Seeding demo data...');
      const seed = await readFile(resolve(base, 'seed.sql'), 'utf8');
      await client.query(seed);
      console.log('✅ Seed data inserted');

      // Mark 001 as applied so the additive runner skips it
      await client.query(
        `INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING`,
        ['001_initial_schema.sql'],
      );
    } else {
      // Existing DB: record 001 as applied so runner won't attempt re-run
      await client.query(
        `INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING`,
        ['001_initial_schema.sql'],
      );
    }

    // Apply any pending additive migrations in filename order
    const migrationsPath = resolve(base, 'migrations');
    if (!existsSync(migrationsPath)) {
      console.log('ℹ️  No migrations directory — skipping additive migrations');
      return;
    }

    const files = (await readdir(migrationsPath))
      .filter((f) => f.endsWith('.sql'))
      .sort();

    const { rows: applied } = await client.query<{ filename: string }>(
      'SELECT filename FROM schema_migrations',
    );
    const appliedSet = new Set(applied.map((r) => r.filename));

    for (const file of files) {
      if (appliedSet.has(file)) continue;

      console.log(`🔧 Applying migration: ${file}`);
      const sql = await readFile(resolve(migrationsPath, file), 'utf8');
      const hasSQL = sql.split('\n').some((l) => l.trim() && !l.trim().startsWith('--'));
      if (hasSQL) await client.query(sql);

      await client.query(
        'INSERT INTO schema_migrations (filename) VALUES ($1)',
        [file],
      );
      console.log(`✅ Applied: ${file}`);
    }

    console.log('✅ Database migrations complete');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    throw err;
  } finally {
    client.release();
  }
}
