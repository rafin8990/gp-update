import pool from '../utils/dbClient';

export const name = '1760352858795_create_users_table';

export const run = async () => {
  // Write your SQL query here
  await pool.query(`
    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      username VARCHAR(50) UNIQUE NOT NULL,
      email VARCHAR(100),
      mobile_no VARCHAR(20),
      password VARCHAR(255) NOT NULL,
      role VARCHAR(50),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
};