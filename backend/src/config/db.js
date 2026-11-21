import mysql from "mysql2/promise";
import { config } from "./index.js";

export const pool = mysql.createPool({
  uri: config.database,
  connectionLimit: 10,
  charset: "utf8mb4",
  timezone: "Z",
  dateStrings: true,
});

export async function q(sql, params = [], connection = pool) {
  const [rows] = await connection.execute(sql, params);
  return rows;
}

export async function one(sql, params = [], connection = pool) {
  const rows = await q(sql, params, connection);
  return rows[0] || null;
}

export async function tx(callback) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export function parseJson(value, fallback = {}) {
  if (value == null) return fallback;
  if (typeof value === "string") return JSON.parse(value);
  return value;
}
