import fs from 'fs';
import path from 'path';

const migrationName = process.argv[2];

if (!migrationName) {
  console.error('❌ Please provide a migration name. Example: npm run make:migration add_column');
  process.exit(1);
}

const timestamp = Date.now();
const fileName = `${timestamp}_${migrationName}.ts`;
const filePath = path.join(__dirname, '../migrations', fileName);

const template = `
import pool from '../utils/dbClient';

export const name = '${fileName.replace('.ts', '')}';

export const run = async () => {
  // Write your SQL query here
  await pool.query(\`
    -- Example: ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true;
  \`);
};
`.trim();

fs.writeFileSync(filePath, template);
console.log(`✅ Created migration file: migrations/${fileName}`);
