import { Router, Request, Response } from 'express';
import { db } from '../config/db';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { DashboardRepository } from '../repositories/dashboard.repository';

// ── GoF: Chain of Responsibility ──────────────────────────────────────────────
// Route pipeline: authenticate → authorize(ADMINISTRATOR, MANAGER) → handler
// ADMINISTRATOR: cross-branch access (no branchId restriction)
// MANAGER: scoped to their own branch (branchId from JWT)

const router = Router();
const repo   = new DashboardRepository(db);

// Apply authentication and RBAC to ALL dashboard routes
router.use(authenticate);
router.use(authorize('ADMINISTRATOR', 'MANAGER', 'DBA'));

/**
 * GET /api/v1/dashboard/stats
 * Returns live operational KPI metrics.
 * - ADMINISTRATOR/DBA: accepts optional ?branchId= query param; defaults to cross-branch
 * - MANAGER: always scoped to their own branchId from JWT
 */
router.get('/stats', async (req: Request, res: Response) => {
  let branchId: number | undefined;

  if (req.user!.role === 'MANAGER') {
    // Managers are always scoped to their branch
    branchId = req.user!.branchId != null
      ? parseInt(req.user!.branchId, 10)
      : undefined;
  } else if (req.query.branchId) {
    // Admins/DBA can optionally scope to a branch
    const parsed = parseInt(req.query.branchId as string, 10);
    if (!isNaN(parsed)) branchId = parsed;
  }

  const stats = await repo.getStats(branchId);
  res.json({ success: true, data: stats });
});

/**
 * GET /api/v1/dashboard/bookings
 * Returns recent bookings via v_booking_details Facade view.
 * Query params: ?limit=20&branchId=1
 */
router.get('/bookings', async (req: Request, res: Response) => {
  const limit  = Math.min(parseInt((req.query.limit as string) ?? '20', 10), 100);
  let branchId: number | undefined;

  if (req.user!.role === 'MANAGER') {
    branchId = req.user!.branchId != null
      ? parseInt(req.user!.branchId, 10)
      : undefined;
  } else if (req.query.branchId) {
    const parsed = parseInt(req.query.branchId as string, 10);
    if (!isNaN(parsed)) branchId = parsed;
  }

  const bookings = await repo.getRecentBookings(limit, branchId);
  res.json({ success: true, data: bookings, count: bookings.length });
});

export default router;
