import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { env } from './env';

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
        connectionTimeoutMillis: 5_000,
      });

      DatabasePool.instance.on('error', (err) => {
        console.error('[pg] Unexpected pool error:', err.message);
      });
    }
    return DatabasePool.instance;
  }
}

// ── GoF: Adapter (concrete) ────────────────────────────────────────────────────
class PgAdapter implements DbAdapter {
  query<T extends QueryResultRow = QueryResultRow>(sql: string, params?: unknown[]): Promise<QueryResult<T>> {
    return DatabasePool.getInstance().query<T>(sql, params ?? []);
  }

  async transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await DatabasePool.getInstance().connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

export const db: DbAdapter = new PgAdapter();
