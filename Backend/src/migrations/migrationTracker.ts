import pool from '../utils/dbClient';

export const createMigrationTrackingTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      run_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
};