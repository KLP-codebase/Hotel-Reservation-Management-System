import { useState, useEffect, useCallback, Dispatch, SetStateAction } from "react";
import { 
  fetchServiceUsageReport, 
  ServiceReportQueryParams, 
  ServiceUsageReportRow 
} from "../lib/api/reports/service-report.api";

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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load service usage report.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setError(null);
        const reportData = await fetchServiceUsageReport(filters);
        if (!cancelled) {
          setData(reportData);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Failed to load service usage report.";
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filters]);

  return {
    data,
    loading,
    error,
    filters,
    setFilters,
    refetch: loadData,
  };
}
