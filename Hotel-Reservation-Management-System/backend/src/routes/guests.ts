import { Router } from "express";
import { GuestController } from "../controllers/GuestController";
import { authenticate } from "../middleware/authenticate";

const router = Router();
router.use(authenticate);

router.get("/",          GuestController.getAll);
router.get("/:id",       GuestController.getById);
router.get("/:id/stays", GuestController.getStayHistory);
router.post("/",         GuestController.create);
router.patch("/:id",     GuestController.update);
router.delete("/:id",    GuestController.remove);

export { router as guestRoutes };
