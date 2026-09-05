import { QueryResultRow } from 'pg';
import { DbAdapter } from '../config/db';

// ── GoF: Template Method ──────────────────────────────────────────────────────
// BaseRepository owns the CRUD algorithm skeleton.
// Concrete subclasses implement abstract hooks that supply raw SQL strings.
// No ORM. No query builder. Pure parameterised pg queries.
//
// Algorithm:
//   findAll()    → getFindAllSql()    → db.query() → return typed rows
//   findById()   → getFindByIdSql()   → db.query() → return row | null
//   create()     → buildInsertParams() + getInsertSql() → db.query() → row
//   update()     → buildUpdateParams() + getUpdateSql() → db.query() → row | null
//   softDelete() → getSoftDeleteSql() → db.query()

export abstract class BaseRepository<T extends QueryResultRow, CreateDto, UpdateDto> {
  constructor(protected readonly db: DbAdapter) {}

  // ── Template methods (the algorithm) ────────────────────────────────────────

  async findAll(): Promise<T[]> {
    const { rows } = await this.db.query<T>(this.getFindAllSql());
    return rows;
  }

  async findById(id: string): Promise<T | null> {
    const { rows } = await this.db.query<T>(this.getFindByIdSql(), [id]);
    return rows[0] ?? null;
  }

  async create(dto: CreateDto): Promise<T> {
    const { values, sql } = this.buildInsertParams(dto);
    const { rows } = await this.db.query<T>(sql, values);
    return rows[0];
  }

  async update(id: string, dto: UpdateDto): Promise<T | null> {
    const { values, sql } = this.buildUpdateParams(id, dto);
    const { rows } = await this.db.query<T>(sql, values);
    return rows[0] ?? null;
  }

  async softDelete(id: string): Promise<void> {
    await this.db.query(this.getSoftDeleteSql(), [id]);
  }

  // ── Abstract hooks — subclasses supply the raw SQL ──────────────────────────

  protected abstract getFindAllSql(): string;
  protected abstract getFindByIdSql(): string;
  protected abstract getSoftDeleteSql(): string;
  protected abstract buildInsertParams(dto: CreateDto): { values: unknown[]; sql: string };
  protected abstract buildUpdateParams(id: string, dto: UpdateDto): { values: unknown[]; sql: string };
}
