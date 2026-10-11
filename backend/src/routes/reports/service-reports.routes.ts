import { Router } from 'express';
import { serviceReportController } from '../../controllers/reports/service-report.controller';

// ── PERSON 2 WORKSPACE: Ancillary Services Specialist ─────────────────────────
// Report 3: Ancillary Services Consumption & Revenue Breakdown
// Supports both /usage and /usage-breakdown for frontend compatibility.

const router = Router();

router.get('/usage-breakdown', (req, res, next) => {
  serviceReportController.getServiceUsageBreakdown(req, res, next);
});

router.get('/usage', (req, res, next) => {
  serviceReportController.getServiceUsageBreakdown(req, res, next);
});

export default router;
