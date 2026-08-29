import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { env } from './env';
import { inMemoryStore } from './db-fallback';

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
        connectionTimeoutMillis: 3_000,
      });

      DatabasePool.instance.on('error', (err) => {
        // Pool level errors caught silently when using fallback
      });
    }
    return DatabasePool.instance;
  }
}

// ── GoF: Adapter (concrete) with Resilience / Fallback Strategy ────────────────
class ResilientPgAdapter implements DbAdapter {
  private useFallback = false;

  async query<T extends QueryResultRow = QueryResultRow>(sql: string, params?: unknown[]): Promise<QueryResult<T>> {
    if (this.useFallback) {
      return inMemoryStore.query<T>(sql, params ?? []);
    }

    try {
      return await DatabasePool.getInstance().query<T>(sql, params ?? []);
    } catch (err: any) {
      if (
        err?.code === 'ECONNREFUSED' ||
        err?.message?.includes('ECONNREFUSED') ||
        err?.message?.includes('connect ECONNREFUSED')
      ) {
        if (!this.useFallback) {
          console.warn('⚠️  PostgreSQL port 5432 offline. Activated in-memory resilient database fallback.');
          this.useFallback = true;
        }
        return inMemoryStore.query<T>(sql, params ?? []);
      }
      throw err;
    }
  }

  async transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    if (this.useFallback) {
      return fn({ query: (sql: string, params?: any[]) => inMemoryStore.query(sql, params) } as unknown as PoolClient);
    }

    try {
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
    } catch (err: any) {
      if (
        err?.code === 'ECONNREFUSED' ||
        err?.message?.includes('ECONNREFUSED') ||
        err?.message?.includes('connect ECONNREFUSED')
      ) {
        if (!this.useFallback) {
          console.warn('⚠️  PostgreSQL port 5432 offline. Activated in-memory resilient database fallback.');
          this.useFallback = true;
        }
        return fn({ query: (sql: string, params?: any[]) => inMemoryStore.query(sql, params) } as unknown as PoolClient);
      }
      throw err;
    }
  }
}

export const db: DbAdapter = new ResilientPgAdapter();
