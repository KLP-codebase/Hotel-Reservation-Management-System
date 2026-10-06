import { Router, Request, Response } from 'express';
import { db } from '../../config/db';
import { OccupancyReportRepository } from '../../repositories/reports/occupancy-report.repository';

const router = Router();
const repo = new OccupancyReportRepository(db);

/**
 * GET /api/v1/reports/occupancy
 * Query params:
 *   branchId?: string (UUID)
 *   startDate?: string (YYYY-MM-DD, defaults to first day of current month)
 *   endDate?: string (YYYY-MM-DD, defaults to last day of current month)
 */
router.get('/', async (req: Request, res: Response) => {
  const branchId = typeof req.query.branchId === 'string' && req.query.branchId.trim()
    ? req.query.branchId.trim()
    : null;

  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  const startDate = typeof req.query.startDate === 'string' && req.query.startDate.trim()
    ? req.query.startDate.trim()
    : defaultStart;

  const endDate = typeof req.query.endDate === 'string' && req.query.endDate.trim()
    ? req.query.endDate.trim()
    : defaultEnd;

  const data = await repo.getOccupancyReport({
    branchId,
    startDate,
    endDate,
  });

  res.json({
    success: true,
    data,
  });
});

export default router;
