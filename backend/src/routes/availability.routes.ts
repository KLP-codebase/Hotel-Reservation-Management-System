import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../config/db';
import { AvailabilityRepository } from '../repositories/availability.repository';

const router = Router();
const repo = new AvailabilityRepository(db);

const QuerySchema = z.object({
    branch_id: z.coerce.number().int().positive(),
    room_type_id: z.coerce.number().int().positive(),
    check_in: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
    check_out: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
});

router.get('/', async (req: Request, res: Response) => {
    const parsed = QuerySchema.safeParse(req.query);
    if (!parsed.success) {
        res.status(422).json({ success: false, errors: parsed.error.flatten().fieldErrors });
        return;
    }
    const { branch_id, room_type_id, check_in, check_out } = parsed.data;
    const rooms = await repo.findAvailableRooms(
        Number(branch_id),
        Number(room_type_id),
        String(check_in),
        String(check_out),
    );
    res.json({ success: true, data: rooms });
});


export default router;
