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
 *   endDate?: string (YYYY-MM-DD, defaults to today)
 */
router.get('/', async (req: Request, res: Response) => {
  const branchId = typeof req.query.branchId === 'string' && req.query.branchId.trim()
    ? req.query.branchId.trim()
    : null;

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  const defaultStart = `${year}-${month}-01`;
  const defaultEnd = todayStr;

  let startDate = typeof req.query.startDate === 'string' && req.query.startDate.trim()
    ? req.query.startDate.trim()
    : defaultStart;

  let endDate = typeof req.query.endDate === 'string' && req.query.endDate.trim()
    ? req.query.endDate.trim()
    : defaultEnd;

  // Disallow future dates — clamp to today
  if (startDate > todayStr) startDate = todayStr;
  if (endDate > todayStr) endDate = todayStr;

  // Disallow inverted range — ensure startDate <= endDate
  if (startDate > endDate) {
    const temp = startDate;
    startDate = endDate;
    endDate = temp;
  }

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
