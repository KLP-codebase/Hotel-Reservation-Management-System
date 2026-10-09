import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { env } from './env';
import { Errors } from '../lib/errors';

// ── GoF: Adapter interface ─────────────────────────────────────────────────────
// All repositories depend on DbAdapter — never on pg directly.
// Swapping pg for another driver only requires a new concrete Adapter class.
export interface DbAdapter {
  query<T extends QueryResultRow = QueryResultRow>(sql: string, params?: unknown[]): Promise<QueryResult<T>>;
  transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T>;
}

// ── GoF: Singleton ─────────────────────────────────────────────────────────────
// One pg.Pool for the entire process lifetime.
// Prevents connection pool exhaustion from multiple instantiations.
class DatabasePool {
  private static instance: Pool | null = null;

  static getInstance(): Pool {
    if (!DatabasePool.instance) {
      DatabasePool.instance = new Pool({
        connectionString: env.DATABASE_URL,
        max: 20,
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 10_000, // Neon free tier cold-starts after idle suspend
      });

      // An idle client losing its connection must not crash the process;
      // the next query on a fresh client surfaces the outage as 503.
      DatabasePool.instance.on('error', (err) => {
        console.error('[db] idle client error:', err.message);
      });
    }
    return DatabasePool.instance;
  }
}

// Errors that mean "the database is not reachable right now" (as opposed to a bad query).
const CONNECTION_ERROR_CODES = new Set(['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EPIPE']);

function isConnectionError(err: unknown): boolean {
  const e = err as { code?: string; message?: string } | null;
  return (
    CONNECTION_ERROR_CODES.has(e?.code ?? '') ||
    /ECONNREFUSED|ECONNRESET|ETIMEDOUT|Connection terminated|timeout exceeded when trying to connect/i.test(e?.message ?? '')
  );
}

// ── GoF: Adapter (concrete) ────────────────────────────────────────────────────
// An unreachable database surfaces as 503 DB_UNAVAILABLE. There is deliberately
// no in-memory fallback: a write must either reach PostgreSQL or fail visibly.
class PgAdapter implements DbAdapter {
  async query<T extends QueryResultRow = QueryResultRow>(sql: string, params?: unknown[]): Promise<QueryResult<T>> {
    try {
      return await DatabasePool.getInstance().query<T>(sql, params ?? []);
    } catch (err) {
      if (isConnectionError(err)) throw Errors.dbUnavailable();
      throw err;
    }
  }

  async transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    let client: PoolClient;
    try {
      client = await DatabasePool.getInstance().connect();
    } catch (err) {
      if (isConnectionError(err)) throw Errors.dbUnavailable();
      throw err;
    }

    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      // ROLLBACK itself fails if the connection dropped mid-transaction; the original error matters more.
      await client.query('ROLLBACK').catch(() => {});
      if (isConnectionError(err)) throw Errors.dbUnavailable();
      throw err;
    } finally {
      client.release();
    }
  }
}

export const db: DbAdapter = new PgAdapter();
