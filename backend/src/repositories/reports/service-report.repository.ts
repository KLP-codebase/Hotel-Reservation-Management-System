import { db } from '../../config/db';
import { GET_SERVICE_USAGE_BREAKDOWN_QUERY } from './queries/service-report.queries';
import { ServiceUsageQueryParams, ServiceUsageReportRow } from './service-report.types';

export class ServiceReportRepository {
  async getServiceUsageBreakdown(params: ServiceUsageQueryParams): Promise<ServiceUsageReportRow[]> {
    const values = [
      params.branchId || null,
      params.startDate || null,
      params.endDate || null,
      params.category || 'ALL',
    ];

    const result = await db.query<ServiceUsageReportRow>(
      GET_SERVICE_USAGE_BREAKDOWN_QUERY,
      values
    );

    return result.rows;
  }
}

export const serviceReportRepository = new ServiceReportRepository();