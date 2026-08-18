import { Router } from "express";
import { BillingController } from "../controllers/BillingController";
import { authenticate } from "../middleware/authenticate";

const router = Router();
router.use(authenticate);

router.get("/",              BillingController.getAll);
router.get("/:id",           BillingController.getById);
router.post("/generate/:bookingId", BillingController.generateBill);
router.get("/:id/pdf",       BillingController.downloadPdf);

export { router as billingRoutes };
