'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';

export interface BranchOption {
  id: string;
  name: string;
}

interface BranchRow {
  branch_id: string;
  branch_name: string;
}

// Branch ids differ between databases (Railway, Neon, local Docker), so the
// booking flow loads them from the API instead of hardcoding UUIDs.
export function useBranches() {
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    apiFetch<{ data: BranchRow[] }>('/api/v1/branches')
      .then(res => {
        if (!cancelled) {
          setBranches((res.data ?? []).map(b => ({ id: b.branch_id, name: b.branch_name })));
        }
      })
      .catch(() => {
        if (!cancelled) setBranches([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { branches, loading };
}
