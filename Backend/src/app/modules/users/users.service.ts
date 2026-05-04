import pool from '../../../utils/dbClient';
import bcrypt from 'bcryptjs';
import config from '../../../config';
import { IUser, IUpdateUserPayload } from './users.interface';

export const UsersService = {
  async getAll(search?: string, limit = 50, page = 1): Promise<IUser[]> {
    const client = await pool.connect();
    try {
      const offset = (page - 1) * limit;
      const params: any[] = [];
      let where = '';
      if (search) {
        params.push(`%${search}%`);
        where = `WHERE name ILIKE $${params.length} OR username ILIKE $${params.length} OR email ILIKE $${params.length}`;
      }
      params.push(limit);
      params.push(offset);
      const query = `
        SELECT id, name, username, email, mobile_no, role, created_at, updated_at
        FROM users
        ${where}
        ORDER BY id ASC
        LIMIT $${params.length - 1} OFFSET $${params.length}
      `;
      const res = await client.query(query, params);
      return res.rows as IUser[];
    } finally {
      client.release();
    }
  },

  async update(id: number, payload: IUpdateUserPayload): Promise<IUser> {
    const client = await pool.connect();
    try {
      const fields: string[] = [];
      const values: any[] = [];
      let idx = 1;

      if (payload.name !== undefined) { fields.push(`name = $${idx++}`); values.push(payload.name); }
      if (payload.email !== undefined) { fields.push(`email = $${idx++}`); values.push(payload.email); }
      if (payload.mobile_no !== undefined) { fields.push(`mobile_no = $${idx++}`); values.push(payload.mobile_no); }
      if (payload.role !== undefined) { fields.push(`role = $${idx++}`); values.push(payload.role); }
      if (payload.password !== undefined) {
        const saltRounds = Number(config.bycrypt_salt_rounds) || 10;
        const hashed = await bcrypt.hash(payload.password, saltRounds);
        fields.push(`password = $${idx++}`);
        values.push(hashed);
      }

      if (fields.length === 0) {
        throw new Error('No fields to update');
      }

      values.push(id);
      const query = `
        UPDATE users
        SET ${fields.join(', ')}, updated_at = NOW()
        WHERE id = $${idx}
        RETURNING id, name, username, email, mobile_no, role, created_at, updated_at
      `;
      const res = await client.query(query, values);
      if (res.rows.length === 0) {
        throw new Error('User not found');
      }
      return res.rows[0] as IUser;
    } finally {
      client.release();
    }
  },
};

export default UsersService;

