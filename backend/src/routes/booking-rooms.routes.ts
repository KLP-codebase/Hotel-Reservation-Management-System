import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../config/db';
import { BookingRepository } from '../repositories/booking.repository';
import { Errors } from '../lib/errors';
import { isUuid } from '../lib/uuid';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';

const router = Router();
const repo = new BookingRepository(db);

// Staff only — accompanying guests are recorded at the front desk.
router.use(authenticate);
router.use(authorize('RECEPTIONIST', 'MANAGER', 'ADMINISTRATOR', 'DBA'));

const AccompanyingGuestSchema = z.object({
    first_name: z.string().min(1, 'First name is required'),
    last_name: z.string().min(1, 'Last name is required'),
    id_passport_no: z.string().min(1, 'ID or Passport number is required'),
});

// POST /api/v1/booking-rooms/:id/accompanying-guests — add accompanying guest to a room
router.post('/:id/accompanying-guests', async (req: Request, res: Response) => {
    const bookingRoomId = req.params.id;

    // 1. Check if the booking room exists
    if (!isUuid(bookingRoomId)) throw Errors.notFound('Booking Room');
    const room = await repo.findBookingRoomById(bookingRoomId);
    if (!room) throw Errors.notFound('Booking Room');

    // 2. Validate request body
    const parsed = AccompanyingGuestSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(422).json({
            success: false,
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            errors: parsed.error.flatten().fieldErrors,
        });
        return;
    }

    // 3. Insert into database
    const guest = await repo.addAccompanyingGuest({
        booking_room_id: bookingRoomId,
        ...parsed.data,
    });

    res.status(201).json({ success: true, data: guest });
});

export default router;
