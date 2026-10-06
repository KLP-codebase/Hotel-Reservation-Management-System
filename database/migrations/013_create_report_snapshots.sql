-- Migration 013: Create report_snapshots table for Business Rule B17 (Audit Snapshot Persistence)
CREATE TABLE IF NOT EXISTS report_snapshots (
    snapshot_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_type          VARCHAR(50) NOT NULL,
    report_period_start  DATE NOT NULL,
    report_period_end    DATE NOT NULL,
    branch_id            UUID REFERENCES branches(branch_id) ON DELETE SET NULL,
    report_data          JSONB NOT NULL,
    generated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_report_snapshots_type_dates ON report_snapshots(report_type, report_period_start, report_period_end);
CREATE INDEX IF NOT EXISTS idx_report_snapshots_branch ON report_snapshots(branch_id);
