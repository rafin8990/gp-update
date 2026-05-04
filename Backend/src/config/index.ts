import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

export default {
  env: process.env.NODE_ENV,
  port: process.env.PORT,
  database_url: process.env.DATABASE_URL,
  db: {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: Number(process.env.DB_PORT) || 5432,
  },
  bycrypt_salt_rounds: process.env.BCRYPT_SALT_ROUNDS,
  jwt_secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
  jwt_expires_in: process.env.JWT_EXPIRES_IN || '1d',
  jwt_refresh_secret: process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-change-this-in-production',
  jwt_refresh_expires_in: process.env.JWT_REFRESH_EXPIRES_IN || '365d',
  redis_url: '188.166.232.67:6089',
};
