import pool from '../utils/dbClient';

export const generateTransferNumber = async (prefix = 'ST'): Promise<string> => {
  const result = await pool.query(
    'SELECT COUNT(*) FROM stock_transfers WHERE DATE(created_at) = CURRENT_DATE'
  );
  const count = parseInt(result.rows[0].count, 10);
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `${prefix}-${date}-${String(count + 1).padStart(3, '0')}`;
};
