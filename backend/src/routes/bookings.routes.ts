import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../config/db';
import { BookingRepository } from '../repositories/booking.repository';
import { Errors } from '../lib/errors';

const router = Router();
const repo = new BookingRepository(db);

// Schema for creating a booking
const CreateBookingSchema = z.object({
    branch_id: z.number().int().positive(),
    booked_by_guest_id: z.string().uuid(),
    notes: z.string().optional(),
});

// Schema for adding a room to a booking
const AddRoomSchema = z.object({
    primary_guest_id: z.string().uuid(),
    room_type_id: z.number().int().positive(),
    room_id: z.number().int().positive(),
    plan_id: z.number().int().positive(),
    check_in_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
    check_out_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
    rate_at_booking: z.number().positive(),
});

// Schema for updating status
const UpdateStatusSchema = z.object({
    status: z.enum(['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED']),
});


// POST /api/v1/bookings — create a new booking
router.post('/', async (req: Request, res: Response) => {
    const parsed = CreateBookingSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(422).json({ success: false, errors: parsed.error.flatten().fieldErrors });
        return;
    }
    const booking = await repo.createBooking(parsed.data);
    res.status(201).json({ success: true, data: booking });
});

// GET /api/v1/bookings — list all bookings
router.get('/', async (_req: Request, res: Response) => {
    const bookings = await repo.findAll();
    res.json({ success: true, data: bookings });
});

// GET /api/v1/bookings/:id — single booking detail
router.get('/:id', async (req: Request, res: Response) => {
    const booking = await repo.findById(req.params.id);
    if (!booking) throw Errors.notFound('Booking');
    res.json({ success: true, data: booking });
});


// POST /api/v1/bookings/:id/rooms — add a room to an existing booking
router.post('/:id/rooms', async (req: Request, res: Response) => {
    const bookingId = req.params.id;

    // 1. Check if the booking exists
    const booking = await repo.findHeaderById(bookingId);
    if (!booking) throw Errors.notFound('Booking');

    // 2. Validate request body
    const parsed = AddRoomSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(422).json({ success: false, errors: parsed.error.flatten().fieldErrors });
        return;
    }

    // 3. Add room (handle double-booking conflict)
    try {
        const room = await repo.addRoom({
            booking_id: bookingId,
            ...parsed.data,
        });
        res.status(201).json({ success: true, data: room });
    } catch (err: any) {
        // 23P01 is PostgreSQL's error code for exclusion_violation (double booking!)
        if (err.code === '23P01' || err.message?.includes('no_double_booking')) {
            res.status(409).json({
                success: false,
                message: 'Room is already booked for the selected dates',
                code: 'ROOM_UNAVAILABLE',
            });
            return;
        }
        throw err;
    }
});

// PATCH /api/v1/bookings/:id/status — transition booking status
router.patch('/:id/status', async (req: Request, res: Response) => {
    const bookingId = req.params.id;

    // 1. Validate request body
    const parsed = UpdateStatusSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(422).json({ success: false, errors: parsed.error.flatten().fieldErrors });
        return;
    }

    // 2. Check if booking exists
    const booking = await repo.findHeaderById(bookingId);
    if (!booking) throw Errors.notFound('Booking');

    const currentStatus = booking.status;
    const nextStatus = parsed.data.status;

    // 3. State machine transition rules
    const allowedTransitions: Record<string, string[]> = {
        PENDING: ['CONFIRMED', 'CANCELLED'],
        CONFIRMED: ['CHECKED_IN', 'CANCELLED'],
        CHECKED_IN: ['CHECKED_OUT'],
        CHECKED_OUT: [],
        CANCELLED: [],
    };

    const allowed = allowedTransitions[currentStatus] || [];
    if (!allowed.includes(nextStatus)) {
        res.status(400).json({
            success: false,
            message: `Cannot transition status from ${currentStatus} to ${nextStatus}`,
            code: 'INVALID_STATUS_TRANSITION',
        });
        return;
    }

    // 4. Update status
    const updated = await repo.updateStatus(bookingId, nextStatus);
    res.json({ success: true, data: updated });
});


export default router;
