import { Router, Request, Response } from 'express';
import { db } from '../config/db';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { DashboardRepository } from '../repositories/dashboard.repository';

// ── GoF: Chain of Responsibility ──────────────────────────────────────────────
// Route pipeline: authenticate → authorize(ADMINISTRATOR, MANAGER, DBA) → handler
// ADMINISTRATOR: cross-branch access (no branchId restriction; can query specific branch)
// MANAGER: strictly scoped to their own branch (branchId from JWT/session)

const router = Router();
const repo   = new DashboardRepository(db);

// Apply authentication and RBAC to ALL dashboard routes
router.use(authenticate);
router.use(authorize('ADMINISTRATOR', 'MANAGER', 'DBA', 'RECEPTIONIST'));

/**
 * Helper: extracts and validates the branchId for the requesting user.
 * If user is a MANAGER with no assigned branch, auto-assigns to the first active branch.
 */
async function resolveBranchScope(req: Request): Promise<string | undefined> {
  if (req.user?.role === 'MANAGER' || req.user?.role === 'RECEPTIONIST') {
    let branchId = req.user.branchId ?? undefined;
    if (!branchId && req.user.role === 'MANAGER') {
      // Auto-assign unassigned manager to first active branch
      const firstBranch = await repo.getFirstActiveBranch();
      if (firstBranch) {
        branchId = firstBranch.branch_id;
        if (req.user.sub) {
          await repo.assignUserBranch(req.user.sub, branchId).catch(() => null);
        }
      }
    }
    return branchId;
  }

  // Administrator / DBA can optionally filter by ?branchId=
  if (req.query.branchId && typeof req.query.branchId === 'string') {
    return req.query.branchId.trim();
  }

  return undefined;
}

/**
 * GET /api/v1/dashboard/stats
 * Returns live operational KPI metrics.
 * - MANAGER: strictly scoped to their hotel
 * - ADMIN/DBA: cross-branch or scoped via ?branchId=
 */
router.get('/stats', async (req: Request, res: Response) => {
  const branchId = await resolveBranchScope(req);
  const stats    = await repo.getStats(branchId);
  res.json({ success: true, data: stats });
});

/**
 * GET /api/v1/dashboard/bookings
 * Returns bookings via v_booking_details Facade view.
 * Query params: ?limit=20&branchId=...&status=CHECKED_IN
 */
router.get('/bookings', async (req: Request, res: Response) => {
  const limit    = Math.min(parseInt((req.query.limit as string) ?? '20', 10), 100);
  const branchId = await resolveBranchScope(req);
  const status   = typeof req.query.status === 'string' ? req.query.status.trim() : undefined;

  const bookings = await repo.getRecentBookings(limit, branchId, status);
  res.json({ success: true, data: bookings, count: bookings.length });
});

/**
 * GET /api/v1/dashboard/rooms-status
 * Returns all physical rooms of the hotel with real-time occupancy and resident guest details.
 */
router.get('/rooms-status', async (req: Request, res: Response) => {
  const branchId    = await resolveBranchScope(req);
  const roomsStatus = await repo.getRoomsStatus(branchId);
  res.json({ success: true, data: roomsStatus, count: roomsStatus.length });
});

/**
 * GET /api/v1/dashboard/staff-roster
 * Returns staff working today and scheduled for tomorrow with shift and duty details.
 */
router.get('/staff-roster', async (req: Request, res: Response) => {
  const branchId    = await resolveBranchScope(req);
  const staffRoster = await repo.getStaffDutyRoster(branchId);
  res.json({ success: true, data: staffRoster, count: staffRoster.length });
});

export default router;
