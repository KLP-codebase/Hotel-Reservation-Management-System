import { Router, Request, Response } from 'express';
import { db } from '../../config/db';
import { SnapshotReportRepository } from '../../repositories/reports/snapshot-report.repository';
import { Errors } from '../../lib/errors';

const router = Router();
const repo = new SnapshotReportRepository(db);

/**
 * GET /api/v1/reports/snapshots
 * Query params:
 *   reportType?: string
 *   branchId?: string
 *   limit?: number
 */
router.get('/', async (req: Request, res: Response) => {
  const reportType = typeof req.query.reportType === 'string' ? req.query.reportType.trim() : null;
  const branchId = typeof req.query.branchId === 'string' ? req.query.branchId.trim() : null;
  const limit = req.query.limit ? Math.max(1, Math.min(100, Number(req.query.limit))) : 50;

  const snapshots = await repo.getSnapshots({
    reportType,
    branchId,
    limit,
  });

  res.json({
    success: true,
    data: snapshots,
  });
});

/**
 * GET /api/v1/reports/snapshots/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
  const snapshot = await repo.getSnapshotById(req.params.id);
  if (!snapshot) {
    throw Errors.notFound('Snapshot not found');
  }

  res.json({
    success: true,
    data: snapshot,
  });
});

/**
 * POST /api/v1/reports/snapshots
 * Body:
 *   reportType: string (OCCUPANCY | REVENUE | BILLING | SERVICES | TRENDS)
 *   reportPeriodStart: string (YYYY-MM-DD)
 *   reportPeriodEnd: string (YYYY-MM-DD)
 *   branchId?: string
 *   reportData: any
 */
router.post('/', async (req: Request, res: Response) => {
  const { reportType, reportPeriodStart, reportPeriodEnd, branchId, reportData } = req.body;

  if (!reportType || !reportPeriodStart || !reportPeriodEnd || !reportData) {
    throw Errors.badRequest('Missing required fields: reportType, reportPeriodStart, reportPeriodEnd, reportData');
  }

  const snapshot = await repo.saveSnapshot({
    reportType,
    reportPeriodStart,
    reportPeriodEnd,
    branchId: branchId || null,
    reportData,
  });

  res.status(201).json({
    success: true,
    data: snapshot,
    message: 'Report snapshot successfully saved for audit archive (Rule B17).',
  });
});

export default router;
