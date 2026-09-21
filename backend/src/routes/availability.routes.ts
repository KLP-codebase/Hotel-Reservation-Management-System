import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../config/db';
import { AvailabilityRepository } from '../repositories/availability.repository';

const router = Router();
const repo = new AvailabilityRepository(db);

const QuerySchema = z.object({
    branch_id: z.string().uuid('branch_id must be a valid UUID'),
    room_type: z.enum(['STANDARD', 'DELUXE', 'SUITE', 'PRESIDENTIAL']),
    check_in: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
    check_out: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
});

// GET /api/v1/availability?branch_id=<uuid>&room_type=STANDARD&check_in=2025-01-01&check_out=2025-01-05
router.get('/', async (req: Request, res: Response) => {
    const parsed = QuerySchema.safeParse(req.query);
    if (!parsed.success) {
        res.status(422).json({ success: false, errors: parsed.error.flatten().fieldErrors });
        return;
    }
    const { branch_id, room_type, check_in, check_out } = parsed.data;
    const rooms = await repo.findAvailableRooms(branch_id, room_type, check_in, check_out);
    res.json({ success: true, data: rooms });
});

// GET /api/v1/availability/rooms?branch_id=<uuid>  — list all rooms (optionally filtered by branch)
router.get('/rooms', async (req: Request, res: Response) => {
    const branchId = req.query.branch_id as string | undefined;
    const rooms = await repo.findAllRooms(branchId);
    res.json({ success: true, data: rooms });
});

export default router;
