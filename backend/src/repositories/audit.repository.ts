import { DbAdapter } from '../config/db';

// ── GoF: Repository Pattern ───────────────────────────────────────────────────
// AuditRepository encapsulates raw SQL access to the two audit streams:
//   1. audit_logs     — application-level events (Node.js auditEmitter)
//   2. change_log     — database-level mutations (PostgreSQL triggers)
// Queries project via the v_admin_audit_activity Facade view (GoF Facade).

export interface AuditLogEntry {
  audit_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  old_value: unknown;
  new_value: unknown;
  ip_address: string | null;
  created_at: string;
  actor_id: string | null;
  actor_username: string | null;
  actor_first_name: string | null;
  actor_last_name: string | null;
  actor_role: string | null;
}

export interface ChangeLogEntry {
  change_id: string;
  table_name: string;
  record_id: string;
  operation: string;
  old_data: unknown;
  new_data: unknown;
  db_user: string;
  created_at: string;
}

export interface AuditFilter {
  entityType?: string;
  action?: string;
  actorId?: string;
  from?: string;   // ISO date string
  to?: string;     // ISO date string
}

export class AuditRepository {
  constructor(private readonly db: DbAdapter) {}

  /**
   * Returns paginated application-level audit events from v_admin_audit_activity.
   * @param limit  - Max rows (default 50)
   * @param offset - Pagination offset (default 0)
   * @param filter - Optional filters
   */
  async getAuditLogs(
    limit  = 50,
    offset = 0,
    filter: AuditFilter = {},
  ): Promise<{ rows: AuditLogEntry[]; total: number }> {
    const conditions: string[] = [];
    const params: unknown[]   = [];
    let i = 1;

    if (filter.entityType) {
      conditions.push(`entity_type = $${i++}`);
      params.push(filter.entityType);
    }
    if (filter.action) {
      conditions.push(`action = $${i++}`);
      params.push(filter.action);
    }
    if (filter.actorId) {
      conditions.push(`actor_id = $${i++}`);
      params.push(filter.actorId);
    }
    if (filter.from) {
      conditions.push(`created_at >= $${i++}`);
      params.push(filter.from);
    }
    if (filter.to) {
      conditions.push(`created_at <= $${i++}`);
      params.push(filter.to);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Total count for pagination
    const countResult = await this.db.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM v_admin_audit_activity ${where}`,
      params,
    );
    const total = parseInt(countResult.rows[0]?.count ?? '0', 10);

    // Data rows
    const dataParams = [...params, limit, offset];
    const dataResult = await this.db.query<AuditLogEntry>(
      `SELECT * FROM v_admin_audit_activity
       ${where}
       LIMIT $${i++} OFFSET $${i}`,
      dataParams,
    );

    return { rows: dataResult.rows, total };
  }

  /**
   * Returns paginated database-level change records from change_log.
   * @param limit     - Max rows (default 50)
   * @param offset    - Pagination offset (default 0)
   * @param tableName - Optional filter by table
   */
  async getChangeLogs(
    limit     = 50,
    offset    = 0,
    tableName?: string,
  ): Promise<{ rows: ChangeLogEntry[]; total: number }> {
    const conditions: string[] = [];
    const params: unknown[]   = [];
    let i = 1;

    if (tableName) {
      conditions.push(`table_name = $${i++}`);
      params.push(tableName);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await this.db.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM change_log ${where}`,
      params,
    );
    const total = parseInt(countResult.rows[0]?.count ?? '0', 10);

    const dataParams = [...params, limit, offset];
    const dataResult = await this.db.query<ChangeLogEntry>(
      `SELECT *
       FROM change_log
       ${where}
       ORDER BY created_at DESC
       LIMIT $${i++} OFFSET $${i}`,
      dataParams,
    );

    return { rows: dataResult.rows, total };
  }

  /**
   * Returns the full mutation history for a specific record across both streams.
   * Used by the JSONB diff modal in the admin dashboard.
   */
  async getEntityHistory(tableName: string, recordId: string): Promise<{
    auditLogs: AuditLogEntry[];
    changeLogs: ChangeLogEntry[];
  }> {
    const [auditResult, changeResult] = await Promise.all([
      this.db.query<AuditLogEntry>(
        `SELECT * FROM v_admin_audit_activity
         WHERE entity_id::text = $1
         ORDER BY created_at DESC`,
        [recordId],
      ),
      this.db.query<ChangeLogEntry>(
        `SELECT * FROM change_log
         WHERE table_name = $1 AND record_id = $2
         ORDER BY created_at DESC`,
        [tableName, recordId],
      ),
    ]);

    return {
      auditLogs:  auditResult.rows,
      changeLogs: changeResult.rows,
    };
  }
}
