import { Pool } from 'pg';

const pool = (process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    })
  : new Pool({
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME ?? 'savidhi',
      user: process.env.DB_USER ?? 'savidhi_user',
      password: process.env.DB_PASSWORD ?? 'savidhi_password',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    }));

pool.on('error', (err) => {
  console.error('[db] Unexpected pool error', err);
});

export { pool };
export default pool;
