import { Pool, PoolClient } from 'pg';
import { env } from './env.js';

// Connection pool ດຽວ ໃຊ້ຮ່ວມກັນທັງ app (scalable, ບໍ່ເປີດ connection ໃໝ່ທຸກ request)
export const pool = new Pool({
  connectionString: env.databaseUrl,
  max: 20,
  idleTimeoutMillis: 30_000,
});

// helper query ສັ້ນ
export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const res = await pool.query(text, params);
  return res.rows as T[];
}

// ໃຊ້ transaction ກັບ logic ທີ່ຕ້ອງ atomic (ເຊັ່ນ ການລັອກ referral)
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
