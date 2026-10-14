'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api-client';
import { Eye, RefreshCw } from 'lucide-react';
import { Btn, Empty, IconBtn, Loading, Modal, fmtDay, tbl, titleCase } from '@/components/dashboard/ui';
import { ReportPanel } from './report-ui';

interface SnapshotRecord {
  snapshot_id: string;
  report_type: string;
  report_period_start: string;
  report_period_end: string;
  branch_id: string | null;
  branch_name: string | null;
  report_data: Record<string, unknown>;
  generated_at: string;
}

export function SnapshotHistoryTab() {
  const [snapshots, setSnapshots] = useState<SnapshotRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSnapshot, setSelectedSnapshot] = useState<SnapshotRecord | null>(null);

  const fetchSnapshots = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ success: boolean; data: SnapshotRecord[] }>('/api/v1/reports/snapshots');
      if (res && res.data) {
        setSnapshots(res.data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await apiFetch<{ success: boolean; data: SnapshotRecord[] }>("/api/v1/reports/snapshots");
        if (active && res?.data) {
          setSnapshots(res.data);
        }
      } catch {
        // ignore
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-8">
      <ReportPanel
        title="Archived snapshots"
        sub="Frozen copies of report data, saved with Save snapshot on each report"
        aside={
          <IconBtn label="Refresh" variant="outline" onClick={fetchSnapshots} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </IconBtn>
        }
      >
        {loading ? (
          <Loading label="Loading snapshots" />
        ) : snapshots.length === 0 ? (
          <Empty>No report snapshots archived yet.</Empty>
        ) : (
          <div className={tbl.wrap}>
            <table className={`${tbl.table} min-w-[880px]`}>
              <thead>
                <tr className={tbl.headRow}>
                  <th className={tbl.th}>Report</th>
                  <th className={tbl.th}>Period</th>
                  <th className={tbl.th}>Branch</th>
                  <th className={tbl.th}>Saved</th>
                  <th className={tbl.th}>Snapshot</th>
                  <th className={tbl.th}><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className={tbl.body}>
                {snapshots.map((s) => (
                  <tr key={s.snapshot_id} className={tbl.row}>
                    <td className={`${tbl.td} font-medium whitespace-nowrap`}>{titleCase(s.report_type)}</td>
                    <td className={`${tbl.td} whitespace-nowrap tabular-nums`}>
                      {fmtDay(s.report_period_start)} → {fmtDay(s.report_period_end)}
                    </td>
                    <td className={tbl.td}>{s.branch_name || 'All branches'}</td>
                    <td className={`${tbl.td} whitespace-nowrap tabular-nums text-ink/70`}>
                      {new Date(s.generated_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
                    </td>
                    <td className={`${tbl.td} tabular-nums text-ink/70`}>{s.snapshot_id.substring(0, 8)}</td>
                    <td className={`${tbl.td} text-right`}>
                      <Btn variant="ghost" onClick={() => setSelectedSnapshot(s)}>
                        <Eye className="w-4 h-4" />
                        View data
                      </Btn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ReportPanel>

      {selectedSnapshot && (
        <Modal
          eyebrow={`Snapshot ${selectedSnapshot.snapshot_id.substring(0, 8)}`}
          title={titleCase(selectedSnapshot.report_type)}
          onClose={() => setSelectedSnapshot(null)}
          size="lg"
          footer={<Btn onClick={() => setSelectedSnapshot(null)}>Close</Btn>}
        >
          <pre className="max-h-[60vh] overflow-auto p-4 rounded-[4px] bg-ink/[0.03] border border-skynest-hairline text-[12px] leading-relaxed text-ink">
            {JSON.stringify(selectedSnapshot.report_data, null, 2)}
          </pre>
        </Modal>
      )}
    </div>
  );
}
