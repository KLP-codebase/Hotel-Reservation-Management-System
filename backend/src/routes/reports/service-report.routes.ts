import { Router } from 'express';
import { serviceReportController } from '../../controllers/reports/service-report.controller';

const router = Router();

router.get('/usage-breakdown', (req, res, next) => {
  serviceReportController.getServiceUsageBreakdown(req, res, next);
});

export default router;