import { Pool } from 'pg';
import config from '../config';
import { errorlogger, logger } from '../shared/logger';

const useSsl = (process.env.DB_SSL || '').toLowerCase() === 'true';

const pool = new Pool({
  user: config.db.user,
  host: config.db.host,
  database: config.db.database,
  password: config.db.password,
  port: Number(config.db.port)||5432,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
  // Connection timeout settings
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT_MS || '30000'), // 30 seconds
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT_MS || '30000'),
  max: parseInt(process.env.DB_POOL_MAX || '10'),
});

pool.on('connect', () => {
  logger.info('✅ Connected to PostgreSQL database');
});

type PoolErrorEventHandler = {
    (err: Error): void;
}

pool.on('error', ((err: Error) => {
    errorlogger.error('❌ Unexpected PostgreSQL error', err);
    process.exit(-1);
}) as PoolErrorEventHandler);

export default pool;
