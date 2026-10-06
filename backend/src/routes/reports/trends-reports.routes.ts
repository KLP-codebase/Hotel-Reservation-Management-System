import { Router, Request, Response } from 'express';
import { db } from '../../config/db';
import { TrendsReportRepository } from '../../repositories/reports/trends-report.repository';

const router = Router();
const repo = new TrendsReportRepository(db);

/**
 * GET /api/v1/reports/trends
 * Query params:
 *   branchId?: string (UUID)
 *   startDate?: string (YYYY-MM-DD)
 *   endDate?: string (YYYY-MM-DD)
 *   limit?: number (defaults to 10)
 */
router.get('/', async (req: Request, res: Response) => {
  const branchId = typeof req.query.branchId === 'string' && req.query.branchId.trim()
    ? req.query.branchId.trim()
    : null;

  const startDate = typeof req.query.startDate === 'string' && req.query.startDate.trim()
    ? req.query.startDate.trim()
    : null;

  const endDate = typeof req.query.endDate === 'string' && req.query.endDate.trim()
    ? req.query.endDate.trim()
    : null;

  const limit = req.query.limit ? Math.max(1, Math.min(50, Number(req.query.limit))) : 10;

  const data = await repo.getCustomerTrendsReport({
    branchId,
    startDate,
    endDate,
    limit,
  });

  res.json({
    success: true,
    data,
  });
});

export default router;
