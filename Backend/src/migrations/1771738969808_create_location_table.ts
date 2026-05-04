import pool from '../utils/dbClient';

export const name = '1771738969808_create_location_table';

export const run = async () => {
  await pool.query(`
    CREATE TABLE locations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      location_code VARCHAR(100),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Create index on location_code for faster lookups
    CREATE INDEX idx_location_code ON locations (location_code);
    
    -- Create index on name for faster searches
    CREATE INDEX idx_location_name ON locations (name);
  `);
};