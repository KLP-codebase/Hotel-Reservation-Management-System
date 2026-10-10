import { Router, Request, Response } from "express";
import { z } from "zod";
import { db } from "../config/db";
import { AvailabilityRepository } from "../repositories/availability.repository";
import { RoomHoldRepository } from "../repositories/room-hold.repository";

const router = Router();
const repo = new AvailabilityRepository(db);
const holdRepo = new RoomHoldRepository(db);

const QuerySchema = z.object({
  branch_id: z.string().uuid("branch_id must be a valid UUID"),
  room_type: z.enum(["STANDARD", "DELUXE", "SUITE", "PRESIDENTIAL", "ALL"]).optional().default("ALL"),
  check_in: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  check_out: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  session_id: z.string().optional(),
});

const HoldSchema = z.object({
  room_ids: z.array(z.string()).min(1, "At least one room_id is required"),
  check_in: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  check_out: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  session_id: z.string().min(1, "session_id is required"),
});

// GET /api/v1/availability?branch_id=<uuid>&room_type=STANDARD&check_in=2025-01-01&check_out=2025-01-05
router.get("/", async (req: Request, res: Response) => {
  const parsed = QuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(422).json({
      success: false,
      message: "Validation failed",
      code: "VALIDATION_ERROR",
      errors: parsed.error.flatten().fieldErrors,
    });
    return;
  }
  const { branch_id, room_type, check_in, check_out, session_id } = parsed.data;
  const rooms = await repo.findAvailableRooms(branch_id, room_type, check_in, check_out);

  // Filter out rooms currently held by another session for these dates
  const heldRoomsRes = await db.query<{ room_id: string }>(
    `SELECT DISTINCT room_id
     FROM room_holds
     WHERE expires_at > CURRENT_TIMESTAMP
       AND ($1::varchar IS NULL OR session_id <> $1::varchar)
       AND check_in_date < $3::date
       AND check_out_date > $2::date`,
    [session_id || null, check_in, check_out]
  );
  const heldSet = new Set(heldRoomsRes.rows.map(r => r.room_id));
  const availableRooms = rooms.filter(r => !heldSet.has(r.id));

  res.json({ success: true, data: availableRooms });
});

// GET /api/v1/availability/rooms?branch_id=<uuid>
router.get("/rooms", async (req: Request, res: Response) => {
  const branchId = req.query.branch_id as string | undefined;
  const rooms = await repo.findAllRooms(branchId);
  res.json({ success: true, data: rooms });
});

// POST /api/v1/availability/hold-rooms — Competitive booking room hold
router.post("/hold-rooms", async (req: Request, res: Response) => {
  const parsed = HoldSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({
      success: false,
      message: "Validation failed",
      code: "VALIDATION_ERROR",
      errors: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  const { room_ids, check_in, check_out, session_id } = parsed.data;
  const result = await holdRepo.acquireHold(room_ids, check_in, check_out, session_id);

  if (!result.success) {
    res.status(409).json({
      success: false,
      code: "ROOM_HELD_BY_ANOTHER_GUEST",
      message: result.conflict?.reason || "One or more rooms are currently held by another guest completing their booking.",
      conflict: result.conflict,
    });
    return;
  }

  res.json({
    success: true,
    message: "Room hold successfully acquired for 10 minutes",
    data: {
      room_ids,
      session_id,
      expires_at: result.expiresAt,
    },
  });
});

// DELETE /api/v1/availability/hold-rooms — Release hold
router.delete("/hold-rooms", async (req: Request, res: Response) => {
  const { room_ids, session_id } = req.body;
  if (session_id) {
    if (Array.isArray(room_ids) && room_ids.length > 0) {
      await holdRepo.releaseHold(room_ids, session_id);
    } else {
      await holdRepo.releaseSession(session_id);
    }
  }
  res.json({ success: true, message: "Room holds released" });
});

export default router;
