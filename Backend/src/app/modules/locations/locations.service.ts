import pool from '../../../utils/dbClient';
import { ILocation, ICreateLocationRequest, IUpdateLocationRequest } from './locations.interface';

const createLocation = async (payload: ICreateLocationRequest): Promise<ILocation> => {
  const query = `
    INSERT INTO locations (name, location_code, created_at, updated_at)
    VALUES ($1, $2, NOW(), NOW())
    RETURNING *;
  `;

  const values = [
    payload.name,
    payload.location_code ?? null,
  ];

  const result = await pool.query<ILocation>(query, values);
  return result.rows[0];
};

const updateLocation = async (
  id: number,
  updates: IUpdateLocationRequest
): Promise<ILocation | null> => {
  const fields = Object.keys(updates);
  if (fields.length === 0) {
    const selectQuery = 'SELECT * FROM locations WHERE id = $1';
    const selectResult = await pool.query<ILocation>(selectQuery, [id]);
    return selectResult.rows[0] || null;
  }

  // Add updated_at automatically
  const allFields = Object.keys(updates);
  const setClauses = allFields.map((field, index) => `${field} = $${index + 2}`);
  setClauses.push('updated_at = NOW()');
  
  const values = [
    id,
    ...allFields.map(field => (updates as any)[field]),
  ];

  const query = `
    UPDATE locations
    SET ${setClauses.join(', ')}
    WHERE id = $1
    RETURNING *;
  `;

  const result = await pool.query<ILocation>(query, values);
  return result.rows[0] || null;
};

const getLocationById = async (id: number): Promise<ILocation | null> => {
  const query = 'SELECT * FROM locations WHERE id = $1';
  const result = await pool.query<ILocation>(query, [id]);
  return result.rows[0] || null;
};

const listLocations = async (filters: {
  name?: string;
  location_code?: string;
  limit?: number;
  offset?: number;
}): Promise<{ data: ILocation[]; total: number }> => {
  const {
    name,
    location_code,
    limit = 20,
    offset = 0,
  } = filters;

  const conditions: string[] = [];
  const values: any[] = [];

  if (name) {
    values.push(`%${name}%`);
    conditions.push(`name ILIKE $${values.length}`);
  }

  if (location_code) {
    values.push(location_code);
    conditions.push(`location_code = $${values.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const dataQuery = `
    SELECT *
    FROM locations
    ${whereClause}
    ORDER BY created_at DESC NULLS LAST, id DESC
    LIMIT $${values.length + 1}
    OFFSET $${values.length + 2};
  `;

  const countQuery = `
    SELECT COUNT(*)::int AS total
    FROM locations
    ${whereClause};
  `;

  const dataValues = [
    ...values,
    limit,
    offset,
  ];

  const [dataResult, countResult] = await Promise.all([
    pool.query<ILocation>(dataQuery, dataValues),
    pool.query<{ total: number }>(countQuery, values),
  ]);

  return {
    data: dataResult.rows,
    total: countResult.rows[0]?.total ?? 0,
  };
};

const deleteLocation = async (id: number): Promise<void> => {
  await pool.query('DELETE FROM locations WHERE id = $1', [id]);
};

export const LocationsService = {
  createLocation,
  updateLocation,
  getLocationById,
  listLocations,
  deleteLocation,
};
