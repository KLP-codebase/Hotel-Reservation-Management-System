import { Router } from "express";
import { RoomController } from "../controllers/RoomController";
import { authenticate } from "../middleware/authenticate";

const router = Router();
router.use(authenticate);

router.get("/",                     RoomController.getAll);
router.get("/availability",         RoomController.checkAvailability);
router.get("/:id",                  RoomController.getById);
router.post("/",                    RoomController.create);
router.patch("/:id",                RoomController.update);
router.patch("/:id/status",         RoomController.updateStatus);
router.delete("/:id",               RoomController.remove);

export { router as roomRoutes };
