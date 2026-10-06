export interface ServiceUsageQueryParams {
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
  first_used: Date;
  last_used: Date;
}

export interface ServiceUsageApiResponse {
  success: boolean;
  data: ServiceUsageReportRow[];
  message?: string;
}