import fs from 'fs';
import path from 'path';
import pool from '../utils/dbClient';

const MIGRATIONS_DIR = path.join(__dirname, '../migrations');
const TRACKER_FILE = path.join(MIGRATIONS_DIR, 'migrationTracker.ts');

const ensureMigrationFolderAndTracker = async () => {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    fs.mkdirSync(MIGRATIONS_DIR);
    console.log('📁 Created migrations/ folder');
  }

  if (!fs.existsSync(TRACKER_FILE)) {
    fs.writeFileSync(
      TRACKER_FILE,
      `
import pool from '../utils/dbClient';

export const createMigrationTrackingTable = async () => {
  await pool.query(\`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      run_at TIMESTAMPTZ DEFAULT NOW()
    );
  \`);
};
`.trim()
    );
    console.log('📄 Created migrationTracker.ts');
  }

  const { createMigrationTrackingTable } = await import('../migrations/migrationTracker');
  await createMigrationTrackingTable();
};

const runMigrations = async () => {
  await ensureMigrationFolderAndTracker();

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter(file => /^[0-9]+_.*\.ts$/.test(file))
    .sort();

  for (const file of files) {
    const { name, run } = await import(`../migrations/${file}`);
    const exists = await pool.query(
      'SELECT COUNT(*) FROM migrations WHERE name = $1',
      [name]
    );

    if (parseInt(exists.rows[0].count) === 0) {
      console.log(`🚀 Running: ${name}`);
      await run();
      await pool.query('INSERT INTO migrations (name) VALUES ($1)', [name]);
      console.log(`✅ Completed: ${name}`);
    } else {
      console.log(`⏭️ Skipped (already ran): ${name}`);
    }
  }

  await pool.end();
  console.log('🔌 Connection closed');
};

runMigrations();
