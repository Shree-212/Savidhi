import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME ?? 'savidhi',
  user: process.env.DB_USER ?? 'savidhi_user',
  password: process.env.DB_PASSWORD ?? 'savidhi_password',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export default pool;
