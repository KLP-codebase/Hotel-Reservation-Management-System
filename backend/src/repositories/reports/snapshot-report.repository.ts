import { DbAdapter } from '../../config/db';

export interface ReportSnapshot {
  snapshot_id: string;
  report_type: string;
  report_period_start: string;
  report_period_end: string;
  branch_id: string | null;
  branch_name?: string | null;
  report_data: any;
  generated_at: string;
}

export class SnapshotReportRepository {
  constructor(private readonly db: DbAdapter) {}

  async saveSnapshot(dto: {
    reportType: string;
    reportPeriodStart: string;
    reportPeriodEnd: string;
    branchId?: string | null;
    reportData: any;
  }): Promise<ReportSnapshot> {
    const sql = `
      INSERT INTO report_snapshots (
        report_type,
        report_period_start,
        report_period_end,
        branch_id,
        report_data
      ) VALUES ($1, $2, $3, $4, $5::jsonb)
      RETURNING *;
    `;

    const { rows } = await this.db.query<ReportSnapshot>(sql, [
      dto.reportType,
      dto.reportPeriodStart,
      dto.reportPeriodEnd,
      dto.branchId || null,
      JSON.stringify(dto.reportData),
    ]);

    return rows[0];
  }

  async getSnapshots(params: {
    reportType?: string | null;
    branchId?: string | null;
    limit?: number;
  }): Promise<ReportSnapshot[]> {
    const { reportType, branchId, limit = 50 } = params;

    const sql = `
      SELECT
        rs.snapshot_id,
        rs.report_type,
        rs.report_period_start::text AS report_period_start,
        rs.report_period_end::text AS report_period_end,
        rs.branch_id,
        br.branch_name,
        rs.report_data,
        rs.generated_at::text AS generated_at
      FROM report_snapshots rs
      LEFT JOIN branches br ON br.branch_id = rs.branch_id
      WHERE ($1::text IS NULL OR rs.report_type = $1)
        AND ($2::uuid IS NULL OR rs.branch_id = $2::uuid)
      ORDER BY rs.generated_at DESC
      LIMIT $3::int;
    `;

    const { rows } = await this.db.query<ReportSnapshot>(sql, [
      reportType ?? null,
      branchId ?? null,
      limit,
    ]);

    return rows;
  }

  async getSnapshotById(id: string): Promise<ReportSnapshot | null> {
    const sql = `
      SELECT
        rs.snapshot_id,
        rs.report_type,
        rs.report_period_start::text AS report_period_start,
        rs.report_period_end::text AS report_period_end,
        rs.branch_id,
        br.branch_name,
        rs.report_data,
        rs.generated_at::text AS generated_at
      FROM report_snapshots rs
      LEFT JOIN branches br ON br.branch_id = rs.branch_id
      WHERE rs.snapshot_id = $1::uuid;
    `;

    const { rows } = await this.db.query<ReportSnapshot>(sql, [id]);
    return rows[0] ?? null;
  }
}
