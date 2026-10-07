import { Request, Response, NextFunction } from 'express';
import { serviceReportRepository } from '../../repositories/reports/service-report.repository';
import { ServiceUsageQueryParams } from '../../repositories/reports/service-report.types';

export class ServiceReportController {
  async getServiceUsageBreakdown(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const queryParams: ServiceUsageQueryParams = {
        branchId: req.query.branchId as string | undefined,
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
        category: req.query.category as string | undefined,
      };

      const reportData = await serviceReportRepository.getServiceUsageBreakdown(queryParams);

      res.status(200).json({
        success: true,
        data: reportData,
        message: 'Service usage report retrieved successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const serviceReportController = new ServiceReportController();