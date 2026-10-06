import { useState, useEffect, useCallback, Dispatch, SetStateAction } from 'react';
import { 
  fetchServiceUsageReport, 
  ServiceReportQueryParams, 
  ServiceUsageReportRow 
} from '../lib/api/reports/service-report.api';

export interface UseServiceReportReturn {
  data: ServiceUsageReportRow[];
  loading: boolean;
  error: string | null;
  filters: ServiceReportQueryParams;
  setFilters: Dispatch<SetStateAction<ServiceReportQueryParams>>;
  refetch: () => Promise<void>;
}

export function useServiceReport(
  initialFilters: ServiceReportQueryParams = {}
): UseServiceReportReturn {
  const [data, setData] = useState<ServiceUsageReportRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ServiceReportQueryParams>(initialFilters);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const reportData = await fetchServiceUsageReport(filters);
      setData(reportData);
    } catch (err: any) {
      setError(err?.message || 'Failed to load service usage report.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    data,
    loading,
    error,
    filters,
    setFilters,
    refetch: loadData,
  };
}