import { apiFetch } from '../../api-client';

export interface ServiceReportQueryParams {
  branchId?: string;
  startDate?: string;
  endDate?: string;
  category?: string;
}

export interface ServiceUsageReportRow {
  category: string;
  service_name: string;
  room_number: string;
  branch_name: string;
  orders_count: number;
  total_quantity: number;
  avg_unit_price: number;
  total_service_revenue: number;
  first_used: string;
  last_used: string;
}

export interface ServiceReportApiResponse {
  success: boolean;
  data: ServiceUsageReportRow[];
  message: string;
}

export async function fetchServiceUsageReport(
  params: ServiceReportQueryParams = {}
): Promise<ServiceUsageReportRow[]> {
  const queryParams = new URLSearchParams();

  if (params.branchId) queryParams.append('branchId', params.branchId);
  if (params.startDate) queryParams.append('startDate', params.startDate);
  if (params.endDate) queryParams.append('endDate', params.endDate);
  if (params.category && params.category !== 'ALL') queryParams.append('category', params.category);

  const queryString = queryParams.toString();
  const path = `/api/v1/reports/services/usage-breakdown${queryString ? `?${queryString}` : ''}`;

  const response = await apiFetch<ServiceReportApiResponse>(path);
  return response.data;
}