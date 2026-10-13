import { db } from '../../config/db';
import { GET_SERVICE_USAGE_BREAKDOWN_QUERY } from './queries/service-report.queries';
import { ServiceUsageQueryParams, ServiceUsageReportRow } from './service-report.types';

export class ServiceReportRepository {
  async getServiceUsageBreakdown(params: ServiceUsageQueryParams): Promise<ServiceUsageReportRow[]> {
    const isUuid = (val?: string) =>
      Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

    const isDate = (val?: string) =>
      Boolean(val && /^\d{4}-\d{2}-\d{2}$/.test(val));

    const values = [
      isUuid(params.branchId) ? params.branchId : null,
      isDate(params.startDate) ? params.startDate : null,
      isDate(params.endDate) ? params.endDate : null,
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
