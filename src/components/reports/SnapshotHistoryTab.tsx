'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api-client';
import { Database, Calendar, Eye, RefreshCw, X } from 'lucide-react';

interface SnapshotRecord {
  snapshot_id: string;
  report_type: string;
  report_period_start: string;
  report_period_end: string;
  branch_id: string | null;
  branch_name: string | null;
  report_data: any;
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
    fetchSnapshots();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-stone-950/70 border border-white/10 p-4">
        <div>
          <h2 className="font-cinzel text-lg font-bold text-stone-100">Archived Audit Snapshots (Rule B17)</h2>
          <p className="text-xs text-stone-400">Cryptographically frozen audit snapshots stored in PostgreSQL JSONB</p>
        </div>
        <button
          onClick={fetchSnapshots}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 border border-white/10 text-stone-300 text-xs hover:text-white"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="bg-stone-950/70 border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-900/90 text-stone-400 border-b border-white/10 uppercase tracking-wider font-jakarta text-[11px]">
              <tr>
                <th className="py-3 px-4">Snapshot ID</th>
                <th className="py-3 px-4">Report Type</th>
                <th className="py-3 px-4">Period</th>
                <th className="py-3 px-4">Branch</th>
                <th className="py-3 px-4">Generated At</th>
                <th className="py-3 px-4 text-right">Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-jakarta">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-stone-500">Loading audit snapshots...</td>
                </tr>
              ) : snapshots.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-stone-500">No report snapshots archived yet.</td>
                </tr>
              ) : (
                snapshots.map((s) => (
                  <tr key={s.snapshot_id} className="hover:bg-white/[0.02] transition">
                    <td className="py-3 px-4 font-mono text-stone-400 text-[11px]">
                      {s.snapshot_id.substring(0, 13)}...
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 text-[10px] font-semibold uppercase bg-amber-500/10 text-amber-300 border border-amber-500/30">
                        {s.report_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-stone-300">
                      {s.report_period_start.split('T')[0]} → {s.report_period_end.split('T')[0]}
                    </td>
                    <td className="py-3 px-4 text-stone-300">
                      {s.branch_name || 'All Branches (Global)'}
                    </td>
                    <td className="py-3 px-4 font-mono text-stone-400 text-[11px]">
                      {new Date(s.generated_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedSnapshot(s)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-stone-900 hover:bg-stone-800 border border-white/10 text-stone-300 text-xs"
                      >
                        <Eye size={12} className="text-amber-400" />
                        <span>View JSON</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* JSON Viewer Modal */}
      {selectedSnapshot && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-950 border border-white/20 max-w-2xl w-full p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="font-cinzel text-base font-bold text-stone-100">
                  Snapshot Payload: {selectedSnapshot.report_type}
                </h3>
                <p className="text-xs text-stone-400 font-mono mt-0.5">{selectedSnapshot.snapshot_id}</p>
              </div>
              <button
                onClick={() => setSelectedSnapshot(null)}
                className="text-stone-400 hover:text-white p-1"
              >
                <X size={18} />
              </button>
            </div>
            <pre className="flex-1 overflow-auto bg-stone-900/90 p-4 font-mono text-xs text-amber-300/90 border border-white/5 rounded-none">
              {JSON.stringify(selectedSnapshot.report_data, null, 2)}
            </pre>
            <div className="flex justify-end pt-2 border-t border-white/10">
              <button
                onClick={() => setSelectedSnapshot(null)}
                className="px-4 py-1.5 bg-stone-900 hover:bg-stone-800 border border-white/10 text-stone-200 text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
