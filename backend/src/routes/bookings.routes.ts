import { emailService } from '../services/email.service';
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

// Front-desk and management roles; everything except POST / requires one of these.
const staffOnly = [authenticate, authorize('RECEPTIONIST', 'MANAGER', 'ADMINISTRATOR', 'DBA')];

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

const BookingServiceItemSchema = z.object({
    service_id: z.number().int().positive(),
    service_name: z.string().min(1),
    category: z.string().optional(),
    base_price: z.number().nonnegative(),
    quantity: z.number().int().positive().optional().default(1),
    room_index: z.number().int().nonnegative().optional().default(0),
});

const BookingPaymentInputSchema = z.object({
    amount: z.number().positive(),
    payment_method: z.string().min(1).default('CARD'),
    is_deposit: z.boolean().optional().default(false),
    reference_number: z.string().optional(),
});

const CreateBookingSchema = z.object({
    branch_id: z.string().uuid('branch_id must be a valid UUID'),
    booked_by_guest_id: z.string().min(1),
    notes: z.string().optional(),
    adults: z.number().int().min(1).optional(),
    children: z.number().int().min(0).optional(),
    rooms: z.array(RoomLineSchema).optional(),
    services: z.array(BookingServiceItemSchema).optional(),
    payment: BookingPaymentInputSchema.optional(),
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
// Public — used by the website booking flow.
router.post('/', async (req: Request, res: Response) => {
    const parsed = CreateBookingSchema.safeParse(req.body);
    if (!parsed.success) return validationFailed(res, parsed.error);

    const { rooms = [], ...header } = parsed.data;

    const bookerId = await resolveGuest(header.booked_by_guest_id);
    const roomLines = [];
    for (const line of rooms) {
        roomLines.push({ ...line, primary_guest_id: await resolveGuest(line.primary_guest_id) });
    }

    const sessionId = (req.body as any).session_id || (req.headers['x-session-id'] as string);
    const roomIds = roomLines.map(r => r.room_id).filter(Boolean);

    // Verify concurrency hold: if any room is held by another active session, reject
    if (roomIds.length > 0) {
        const holdConflict = await db.query<{ id: string; number: string }>(
            `SELECT r.id, r.number
             FROM rooms r
             JOIN room_holds rh ON rh.room_id = r.id
             WHERE r.id = ANY($1::varchar[])
               AND rh.expires_at > CURRENT_TIMESTAMP
               AND ($2::varchar IS NULL OR rh.session_id <> $2::varchar)
             LIMIT 1`,
            [roomIds, sessionId || null]
        );
        if (holdConflict.rows.length > 0) {
            return res.status(409).json({
                success: false,
                code: 'ROOM_HELD_BY_ANOTHER_GUEST',
                message: `Room ${holdConflict.rows[0].number} is currently held by another guest. Please select a different room or wait for the hold to expire.`,
            });
        }
    }

    const { services = [], payment, ...bookingHeader } = header as any;

    // Validate service quantity caps:
    // - Spa / Wellness: max = adults * nights
    // - In-room Breakfast / Dining: max = (adults + children) * nights
    if (services.length > 0 && roomLines.length > 0) {
        const firstLine = roomLines[0];
        const checkInTime = new Date(firstLine.check_in_date).getTime();
        const checkOutTime = new Date(firstLine.check_out_date).getTime();
        const nights = Math.max(1, Math.round((checkOutTime - checkInTime) / (1000 * 60 * 60 * 24)));
        const adults = Number(header.adults) || 1;
        const children = Number(header.children) || 0;
        const totalGuests = adults + children;

        for (const s of services) {
            const cat = (s.category || '').toLowerCase();
            const name = (s.service_name || '').toLowerCase();
            const qty = s.quantity ?? 1;

            if (cat === 'wellness' || name.includes('spa') || name.includes('massage') || name.includes('ayurvedic')) {
                const maxSpa = Math.max(1, adults * nights);
                if (qty > maxSpa) {
                    return res.status(400).json({
                        success: false,
                        code: 'SERVICE_CAP_EXCEEDED',
                        message: `Orders for "${s.service_name}" cannot exceed ${maxSpa} (${adults} adult(s) × ${nights} night(s)).`,
                    });
                }
            }

            if (name.includes('breakfast') || (cat === 'dining' && (name.includes('breakfast') || name.includes('dining')))) {
                const maxBreakfast = Math.max(1, totalGuests * nights);
                if (qty > maxBreakfast) {
                    return res.status(400).json({
                        success: false,
                        code: 'SERVICE_CAP_EXCEEDED',
                        message: `Orders for "${s.service_name}" cannot exceed ${maxBreakfast} (${totalGuests} guest(s) × ${nights} night(s)).`,
                    });
                }
            }
        }
    }

    const booking = await repo.createBooking({ ...bookingHeader, booked_by_guest_id: bookerId }, roomLines);

    // Release any temporary room holds upon successful booking creation
    if (roomIds.length > 0) {
        await db.query('DELETE FROM room_holds WHERE room_id = ANY($1::varchar[])', [roomIds]).catch(() => {});
    }

    // Process optional selected add-on services
    if (services.length > 0 && booking.rooms.length > 0) {
        for (const s of services) {
            const targetRoom = booking.rooms[s.room_index ?? 0] || booking.rooms[0];
            await db.query(
                `INSERT INTO service_usage (booking_room_id, service_id, quantity, price_at_usage, used_at)
                 VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
                [targetRoom.booking_room_id, s.service_id, s.quantity ?? 1, s.base_price]
            ).catch(err => console.warn('[Bookings] Failed to insert service usage:', err.message));
        }
    }

    // Ensure final bill/invoices are initialized for each room stay
    for (const rm of booking.rooms) {
        await db.query('SELECT sp_generate_final_bill($1::uuid)', [rm.booking_room_id]).catch(() => {});
    }

    // Process partial/full payment guarantee
    let isConfirmed = false;
    if (payment && booking.rooms.length > 0) {
        const primaryRoomId = booking.rooms[0].booking_room_id;
        const invRes = await db.query<{ invoice_id: string }>(
            'SELECT invoice_id FROM invoices WHERE booking_room_id = $1 LIMIT 1',
            [primaryRoomId]
        );
        const invId = invRes.rows[0]?.invoice_id;
        if (invId) {
            await db.query(
                `INSERT INTO payments (invoice_id, amount, payment_method, reference_number)
                 VALUES ($1, $2, $3, $4)`,
                [invId, payment.amount, payment.payment_method || 'CARD', payment.reference_number || `ONLINE-PAY-${Date.now()}`]
            ).catch(err => console.warn('[Bookings] Failed to record payment:', err.message));

            // Instant status confirmation upon payment settlement
            await db.query("UPDATE bookings SET status = 'CONFIRMED' WHERE booking_id = $1", [booking.booking_id]);
            await db.query("UPDATE booking_rooms SET status = 'CONFIRMED' WHERE booking_id = $1", [booking.booking_id]);
            isConfirmed = true;

            // Trigger instant confirmation email
            repo.findById(booking.booking_id).then((detail: any) => {
                if (detail && detail.guest_email) {
                    const room0 = detail.rooms[0];
                    emailService.sendBookingConfirmationEmail({
                        to: detail.guest_email,
                        guestName: `${detail.guest_first_name || ''} ${detail.guest_last_name || ''}`.trim() || 'Valued Guest',
                        branchName: detail.branch_name || 'Sky Nest Hotel',
                        bookingRef: booking.booking_id,
                        stayDates: room0 ? `${room0.check_in_date} to ${room0.check_out_date}` : 'Upcoming Stay',
                        duration: `${detail.rooms.length} room(s)`,
                        roomName: room0?.room_number ? `Room ${room0.room_number} (${room0.room_type_name || 'Standard'})` : (room0?.room_type_name || 'Standard Room'),
                        roomRate: room0?.rate_at_booking ? `$${Number(room0.rate_at_booking).toFixed(2)} / night` : undefined,
                        roomSubtotal: detail.total_amount ? `$${Number(detail.total_amount).toFixed(2)}` : undefined,
                        grandTotal: detail.total_amount ? `$${Number(detail.total_amount).toFixed(2)}` : undefined,
                    }).catch(err => console.warn('[Bookings] Payment confirmation email error:', err.message));
                }
            }).catch(err => console.warn('[Bookings] Failed to query detail for payment email:', err.message));
        }
    }

    res.status(201).json({
        success: true,
        data: {
            ...booking,
            status: isConfirmed ? 'CONFIRMED' : 'PENDING',
            payment_recorded: Boolean(payment),
        }
    });
});

// GET /api/v1/bookings — list all bookings
router.get('/', ...staffOnly, async (_req: Request, res: Response) => {
    const bookings = await repo.findAll();
    res.json({ success: true, data: bookings });
});

// GET /api/v1/bookings/:id — single booking detail
router.get('/:id', ...staffOnly, async (req: Request, res: Response) => {
    if (!isUuid(req.params.id)) throw Errors.notFound('Booking');
    const booking = await repo.findById(req.params.id);
    if (!booking) throw Errors.notFound('Booking');
    res.json({ success: true, data: booking });
});


// POST /api/v1/bookings/:id/rooms — add a room to an existing booking
router.post('/:id/rooms', ...staffOnly, async (req: Request, res: Response) => {
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
router.patch('/:id/status', ...staffOnly, async (req: Request, res: Response) => {
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

    // 5. Cascade status to booking_rooms (fires trg_sync_room_status to update physical room availability)
    await db.query(
        'UPDATE booking_rooms SET status = $1 WHERE booking_id = $2',
        [nextStatus, bookingId]
    ).catch(err => console.warn('[Bookings] Failed to cascade status to booking_rooms:', err));

    // 6. If confirmed by receptionist, trigger confirmation email to guest
    if (nextStatus === 'CONFIRMED') {
        repo.findById(bookingId).then((detail: any) => {
            if (detail && detail.guest_email) {
                const room0 = detail.rooms[0];
                emailService.sendBookingConfirmationEmail({
                    to: detail.guest_email,
                    guestName: `${detail.guest_first_name || ''} ${detail.guest_last_name || ''}`.trim() || 'Valued Guest',
                    branchName: detail.branch_name || 'Sky Nest Hotel',
                    bookingRef: bookingId,
                    stayDates: room0 ? `${room0.check_in_date} to ${room0.check_out_date}` : 'Upcoming Stay',
                    duration: `${detail.rooms.length} room(s)`,
                    roomName: room0?.room_number ? `Room ${room0.room_number} (${room0.room_type_name || 'Standard'})` : (room0?.room_type_name || 'Standard Room'),
                    roomRate: room0?.rate_at_booking ? `$${Number(room0.rate_at_booking).toFixed(2)} / night` : undefined,
                    roomSubtotal: detail.total_amount ? `$${Number(detail.total_amount).toFixed(2)}` : undefined,
                    grandTotal: detail.total_amount ? `$${Number(detail.total_amount).toFixed(2)}` : undefined,
                }).catch(err => console.warn('[Bookings] Confirmation email dispatch error:', err.message));
            }
        }).catch(err => console.warn('[Bookings] Failed to find booking for email:', err.message));
    }

    res.json({ success: true, data: updated });
});


export default router;
