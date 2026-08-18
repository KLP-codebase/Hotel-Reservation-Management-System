import { Router } from "express";
import { ReportController } from "../controllers/ReportController";
import { authenticate } from "../middleware/authenticate";

const router = Router();
router.use(authenticate);

router.get("/occupancy",     ReportController.occupancy);
router.get("/revenue",       ReportController.revenue);
router.get("/bookings",      ReportController.bookings);
router.get("/loyalty",       ReportController.loyaltyStats);

export { router as reportRoutes };
