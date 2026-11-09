import "server-only";
import { neon, Pool, type PoolClient } from "@neondatabase/serverless";

function url() {
  const u = process.env.DATABASE_URL;
  if (!u) throw new Error("DATABASE_URL is not set");
  return u;
}

let _sql: ReturnType<typeof neon> | null = null;

/** Run a parameterised query over Neon's HTTP driver (fast, stateless). */
export async function query<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  if (!_sql) _sql = neon(url());
  const rows = await _sql.query(text, params);
  return rows as T[];
}

export async function queryOne<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

export type Tx = {
  query: <T = Record<string, unknown>>(text: string, params?: unknown[]) => Promise<T[]>;
};

/**
 * Run work inside a real Postgres transaction (WebSocket pool).
 * Used where atomicity matters: stock reservation, payment, releases.
 */
export async function withTransaction<R>(fn: (tx: Tx) => Promise<R>): Promise<R> {
  const pool = new Pool({ connectionString: url() });
  let client: PoolClient | null = null;
  try {
    client = await pool.connect();
    const c = client;
    await c.query("BEGIN");
    try {
      const tx: Tx = {
        query: async <T,>(text: string, params: unknown[] = []) => (await c.query(text, params)).rows as T[],
      };
      const result = await fn(tx);
      await c.query("COMMIT");
      return result;
    } catch (err) {
      await c.query("ROLLBACK").catch(() => {});
      throw err;
    }
  } finally {
    client?.release();
    await pool.end().catch(() => {});
  }
}
