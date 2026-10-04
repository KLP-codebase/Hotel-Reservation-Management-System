import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../config/db';
import { BookingRepository } from '../repositories/booking.repository';
import { Errors } from '../lib/errors';
import { isUuid } from '../lib/uuid';

const router = Router();
const repo = new BookingRepository(db);

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD');

// Schema for one room line (used by POST / with nested rooms, and POST /:id/rooms).
// rate_at_booking is NOT accepted from the client — the server snapshots the
// room's own price_per_night (see BookingRepository.insertRoomLine).
const RoomLineSchema = z.object({
    primary_guest_id: z.string().min(1),
    room_type_id: z.number().int().positive().optional().nullable(),
    room_id: z.union([z.string(), z.number()]),
    plan_id: z.number().int().positive().optional().default(1),
    check_in_date: isoDate,
    check_out_date: isoDate,
}).refine(r => r.check_out_date > r.check_in_date, {
    message: 'check_out_date must be after check_in_date',
    path: ['check_out_date'],
});

// Schema for creating a booking. `rooms` is optional: when present, the header
// and all room lines are created atomically in one transaction.
const CreateBookingSchema = z.object({
    branch_id: z.string().uuid('branch_id must be a valid UUID'),
    booked_by_guest_id: z.string().min(1),
    notes: z.string().optional(),
    adults: z.number().int().min(1).optional(),
    children: z.number().int().min(0).optional(),
    rooms: z.array(RoomLineSchema).optional(),
});

// Schema for updating status
const UpdateStatusSchema = z.object({
    status: z.enum(['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED']),
});

function validationFailed(res: Response, error: z.ZodError) {
    res.status(422).json({
        success: false,
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        errors: error.flatten().fieldErrors,
    });
}

// Guest ids may arrive as guests.id or guests.guest_id — normalise to guests.id.
async function resolveGuest(identifier: string): Promise<string> {
    const legacyId = await repo.resolveGuestLegacyId(identifier);
    if (!legacyId) throw Errors.notFound('Guest');
    return legacyId;
}


// POST /api/v1/bookings — create a new booking (optionally with its rooms, atomically)
router.post('/', async (req: Request, res: Response) => {
    const parsed = CreateBookingSchema.safeParse(req.body);
    if (!parsed.success) return validationFailed(res, parsed.error);

    const { rooms = [], ...header } = parsed.data;

    const bookerId = await resolveGuest(header.booked_by_guest_id);
    const roomLines = [];
    for (const line of rooms) {
        roomLines.push({ ...line, primary_guest_id: await resolveGuest(line.primary_guest_id) });
    }

    const booking = await repo.createBooking({ ...header, booked_by_guest_id: bookerId }, roomLines);
    res.status(201).json({ success: true, data: booking });
});

// GET /api/v1/bookings — list all bookings
router.get('/', async (_req: Request, res: Response) => {
    const bookings = await repo.findAll();
    res.json({ success: true, data: bookings });
});

// GET /api/v1/bookings/:id — single booking detail
router.get('/:id', async (req: Request, res: Response) => {
    if (!isUuid(req.params.id)) throw Errors.notFound('Booking');
    const booking = await repo.findById(req.params.id);
    if (!booking) throw Errors.notFound('Booking');
    res.json({ success: true, data: booking });
});


// POST /api/v1/bookings/:id/rooms — add a room to an existing booking
router.post('/:id/rooms', async (req: Request, res: Response) => {
    const bookingId = req.params.id;

    // 1. Check if the booking exists
    if (!isUuid(bookingId)) throw Errors.notFound('Booking');
    const booking = await repo.findHeaderById(bookingId);
    if (!booking) throw Errors.notFound('Booking');

    // 2. Validate request body
    const parsed = RoomLineSchema.safeParse(req.body);
    if (!parsed.success) return validationFailed(res, parsed.error);

    // 3. Add room — the repository locks the room, checks for overlaps and
    //    throws 409 ROOM_UNAVAILABLE on a double-booking.
    const room = await repo.addRoom(bookingId, booking.branch_id, {
        ...parsed.data,
        primary_guest_id: await resolveGuest(parsed.data.primary_guest_id),
    });
    res.status(201).json({ success: true, data: room });
});

// PATCH /api/v1/bookings/:id/status — transition booking status
router.patch('/:id/status', async (req: Request, res: Response) => {
    const bookingId = req.params.id;

    // 1. Validate request body
    const parsed = UpdateStatusSchema.safeParse(req.body);
    if (!parsed.success) return validationFailed(res, parsed.error);

    // 2. Check if booking exists
    if (!isUuid(bookingId)) throw Errors.notFound('Booking');
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

    // 4. Update status (only if nobody changed it since step 2)
    const updated = await repo.updateStatus(bookingId, currentStatus, nextStatus);
    if (!updated) {
        throw Errors.conflict('Booking status was changed by someone else. Reload and try again.');
    }
    res.json({ success: true, data: updated });
});


export default router;
