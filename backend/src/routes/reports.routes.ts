import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { lockBranchQuery } from '../lib/branch-scope';

import occupancyRoutes from './reports/occupancy-reports.routes';
import trendsRoutes from './reports/trends-reports.routes';
import snapshotRoutes from './reports/snapshot-reports.routes';
import revenueRoutes from './reports/revenue-reports.routes';
import serviceRoutes from './reports/service-reports.routes';

const router = Router();

// ── RBAC Mandate (SRS §4.8 & Site Map Page 14) ─────────────────────────────────
// Reports provide sensitive executive management financial and operational intelligence.
// Access is restricted to ADMINISTRATOR, MANAGER, and DBA roles.
router.use(authenticate);
router.use(authorize('ADMINISTRATOR', 'MANAGER', 'DBA'));
// Single-branch staff reports always cover their own branch, whatever ?branchId= says.
router.use(lockBranchQuery);

// ── Sub-router mounts (Isolated domain delegation) ─────────────────────────────
// Person 3: Operations, Capacity & Preference Analytics
router.use('/occupancy', occupancyRoutes);
router.use('/trends', trendsRoutes);
router.use('/snapshots', snapshotRoutes);

// Person 1: Financial & Revenue Intelligence
router.use('/revenue', revenueRoutes);

// Person 2: Ancillary Services Breakdown
router.use('/services', serviceRoutes);

export default router;
