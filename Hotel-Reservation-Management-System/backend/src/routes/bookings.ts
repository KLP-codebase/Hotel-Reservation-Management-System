import { Router } from "express";
import { BookingController } from "../controllers/BookingController";
import { authenticate } from "../middleware/authenticate";
import { validateRequest } from "../middleware/validateRequest";
import { createBookingSchema, updateBookingSchema } from "../config/validationSchemas";

const router = Router();

// All booking routes require authentication
router.use(authenticate);

router.get("/",               BookingController.getAll);
router.get("/:id",            BookingController.getById);
router.post("/",              validateRequest(createBookingSchema), BookingController.create);
router.patch("/:id",          validateRequest(updateBookingSchema), BookingController.update);
router.patch("/:id/cancel",   BookingController.cancel);
router.patch("/:id/check-in", BookingController.checkIn);
router.patch("/:id/check-out",BookingController.checkOut);
router.delete("/:id",         BookingController.remove);

export { router as bookingRoutes };
