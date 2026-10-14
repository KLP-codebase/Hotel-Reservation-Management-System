import { Router, Request, Response } from 'express';
import { PoolClient } from 'pg';
import { z } from 'zod';
import { db } from '../config/db';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import { DashboardRepository } from '../repositories/dashboard.repository';
import { AuditRepository } from '../repositories/audit.repository';
import { BookingRepository } from '../repositories/booking.repository';
import { InvoiceRepository } from '../repositories/invoice.repository';
import { AppError, Errors } from '../lib/errors';
import { buildDbInvoice } from './invoices.routes';

// ── GoF: Chain of Responsibility ──────────────────────────────────────────────
// Route pipeline: authenticate → authorize(ADMINISTRATOR, MANAGER, DBA) → handler
// ADMINISTRATOR: cross-branch access (no branchId restriction; can query specific branch)
// MANAGER: strictly scoped to their own branch (branchId from JWT/session)

const router = Router();
const repo      = new DashboardRepository(db);
const auditRepo = new AuditRepository(db);
const bookingRepo = new BookingRepository(db);
const invoiceRepo = new InvoiceRepository(db);

// Apply authentication and RBAC to ALL dashboard routes
router.use(authenticate);
router.use(authorize('ADMINISTRATOR', 'MANAGER', 'DBA', 'RECEPTIONIST'));

/**
 * Helper: extracts and validates the branchId for the requesting user.
 * If user is a MANAGER with no assigned branch, auto-assigns to the first active branch.
 */
async function resolveBranchScope(req: Request): Promise<string | undefined> {
  if (req.user?.role === 'MANAGER' || req.user?.role === 'RECEPTIONIST') {
    let branchId = req.user.branchId ?? undefined;
    if (!branchId && req.user.role === 'MANAGER') {
      // Auto-assign unassigned manager to first active branch
      const firstBranch = await repo.getFirstActiveBranch();
      if (firstBranch) {
        branchId = firstBranch.branch_id;
        if (req.user.sub) {
          await repo.assignUserBranch(req.user.sub, branchId).catch(() => null);
        }
      }
    }
    return branchId;
  }

  // Administrator / DBA can optionally filter by ?branchId=
  if (req.query.branchId && typeof req.query.branchId === 'string') {
    return req.query.branchId.trim();
  }

  return undefined;
}

/**
 * GET /api/v1/dashboard/stats
 * Returns live operational KPI metrics.
 * - MANAGER: strictly scoped to their hotel
 * - ADMIN/DBA: cross-branch or scoped via ?branchId=
 */
router.get('/stats', async (req: Request, res: Response) => {
  const branchId = await resolveBranchScope(req);
  const stats    = await repo.getStats(branchId);
  res.json({ success: true, data: stats });
});

/**
 * GET /api/v1/dashboard/bookings
 * Returns bookings via v_booking_details Facade view.
 * Query params: ?limit=20&branchId=...&status=CHECKED_IN
 */
router.get('/bookings', async (req: Request, res: Response) => {
  const limit    = Math.min(parseInt((req.query.limit as string) ?? '20', 10), 100);
  const branchId = await resolveBranchScope(req);
  const status   = typeof req.query.status === 'string' ? req.query.status.trim() : undefined;

  const bookings = await repo.getRecentBookings(limit, branchId, status);
  res.json({ success: true, data: bookings, count: bookings.length });
});

/**
 * GET /api/v1/dashboard/rooms-status
 * Returns all physical rooms of the hotel with real-time occupancy and resident guest details.
 */
router.get('/rooms-status', async (req: Request, res: Response) => {
  const branchId    = await resolveBranchScope(req);
  const roomsStatus = await repo.getRoomsStatus(branchId);
  res.json({ success: true, data: roomsStatus, count: roomsStatus.length });
});

/**
 * GET /api/v1/dashboard/staff-roster
 * Returns staff working today and scheduled for tomorrow with shift and duty details.
 */
router.get('/staff-roster', async (req: Request, res: Response) => {
  const branchId    = await resolveBranchScope(req);
  const staffRoster = await repo.getStaffDutyRoster(branchId);
  res.json({ success: true, data: staffRoster, count: staffRoster.length });
});


const CheckInSchema = z.object({
  bookingId:     z.string().uuid('bookingId must be a valid UUID'),
  // Room line that the accompanying guests stay in; defaults to the booking's first room.
  bookingRoomId: z.string().uuid().optional(),
  accompanyingGuests: z.array(z.object({
    first_name:     z.string().trim().min(1, 'First name is required'),
    last_name:      z.string().trim().min(1, 'Last name is required'),
    id_passport_no: z.string().trim().min(1, 'ID or Passport number is required'),
  })).default([]),
});

const CheckOutSchema = z.object({
  bookingId:     z.string().uuid('bookingId must be a valid UUID'),
  paymentMethod: z.enum(['CASH', 'CREDIT_CARD', 'BANK_TRANSFER', 'ONLINE']).default('CASH'),
  // true = pay off any outstanding balance as part of check-out
  settleBalance: z.boolean().default(false),
});

// Locks the booking and checks that this user may move it out of `expected`.
async function lockForTransition(
  client: PoolClient,
  req: Request,
  bookingId: string,
  expected: string,
  action: string,
) {
  const booking = await bookingRepo.lockHeader(client, bookingId);
  if (!booking) throw Errors.notFound('Booking');

  const branchScope = await resolveBranchScope(req);
  if (branchScope && booking.branch_id !== branchScope) {
    throw Errors.forbidden('This booking belongs to another branch');
  }
  if (booking.status !== expected) {
    throw new AppError(409, 'INVALID_STATUS_TRANSITION',
      `Only ${expected.toLowerCase().replace('_', '-')} bookings can be ${action} (this one is ${booking.status})`);
  }
  return booking;
}

// The hotel's calendar day (Sri Lanka), not the server's UTC clock.
const HOTEL_TODAY = `(now() AT TIME ZONE 'Asia/Colombo')::date`;

/**
 * POST /api/v1/dashboard/check-in
 * Front desk check-in: CONFIRMED → CHECKED_IN for the booking and all its rooms
 * (rooms become OCCUPIED via trigger) and records accompanying guests — one transaction.
 * Allowed from the check-in day until the day before check-out: never early; a late
 * arrival still checks in (and pays the full booked stay).
 */
router.post('/check-in', validate(CheckInSchema), async (req: Request, res: Response) => {
  const { bookingId, bookingRoomId, accompanyingGuests } = req.body as z.infer<typeof CheckInSchema>;

  const updated = await db.transaction(async (client) => {
    await lockForTransition(client, req, bookingId, 'CONFIRMED', 'checked in');

    // Refuses an early or expired check-in (BookingRepository.assertCheckInOpen).
    const result = await bookingRepo.transitionStatus(client, bookingId, 'CONFIRMED', 'CHECKED_IN');
    if (!result) throw Errors.conflict('Booking status was changed by someone else. Reload and try again.');

    if (accompanyingGuests.length > 0) {
      const lines = await bookingRepo.findLiveRoomLines(client, bookingId);
      const target = bookingRoomId ?? lines[0]?.booking_room_id;
      if (!target || !lines.some(l => l.booking_room_id === target)) {
        throw Errors.badRequest('Room line does not belong to this booking');
      }
      await bookingRepo.insertAccompanyingGuests(client, target, accompanyingGuests);
    }

    return result;
  });

  res.json({
    success: true,
    message: 'Guest successfully checked in.',
    data: updated,
  });
});

interface DepartureSummary {
  departure_date: string;
  early: boolean;
  nights_booked: number;
  nights_billed: number;
  cancelled_services: { service_name: string; used_at: string; amount: number }[];
}

/**
 * Prepares a departure today (must run in the check-out transaction). A guest who
 * leaves before the booked check-out date is billed for the nights actually
 * stayed (at least one): each room line's check-out moves to today, which also
 * frees the room for the remaining nights. Services dated after today are
 * removed from the folio.
 */
async function prepareDeparture(client: PoolClient, bookingId: string): Promise<DepartureSummary> {
  const { rows: lines } = await client.query<{
    booking_room_id: string; nights_booked: number; departure: string; departure_label: string; shorten: boolean;
  }>(`
    SELECT booking_room_id,
           (check_out_date - check_in_date)                                  AS nights_booked,
           GREATEST(${HOTEL_TODAY}, check_in_date + 1)::text                 AS departure,
           to_char(GREATEST(${HOTEL_TODAY}, check_in_date + 1), 'DD Mon YYYY') AS departure_label,
           check_out_date > GREATEST(${HOTEL_TODAY}, check_in_date + 1)      AS shorten
    FROM booking_rooms
    WHERE booking_id = $1 AND status <> 'CANCELLED'
    ORDER BY created_at, booking_room_id
  `, [bookingId]);

  let nightsBooked = 0;
  let nightsBilled = 0;
  for (const l of lines) {
    nightsBooked += Number(l.nights_booked);
    if (l.shorten) {
      await client.query(
        `UPDATE booking_rooms SET check_out_date = $2::date WHERE booking_room_id = $1`,
        [l.booking_room_id, l.departure]
      );
    }
  }
  const { rows: [billed] } = await client.query<{ nights: string }>(
    `SELECT COALESCE(SUM(check_out_date - check_in_date), 0) AS nights
     FROM booking_rooms WHERE booking_id = $1 AND status <> 'CANCELLED'`,
    [bookingId]
  );
  nightsBilled = Number(billed.nights);

  const { rows: cancelled } = await client.query<{ service_name: string; used_at: string; amount: string }>(`
    WITH gone AS (
      DELETE FROM service_usage
      WHERE booking_room_id = ANY($1::uuid[]) AND used_at::date > ${HOTEL_TODAY}
      RETURNING service_id, used_at, quantity * price_at_usage AS amount, notes
    )
    SELECT COALESCE(sc.service_name, gone.notes, 'Hotel service') AS service_name,
           gone.used_at::text AS used_at, gone.amount
    FROM gone LEFT JOIN service_catalogue sc ON sc.service_id::text = gone.service_id::text
    ORDER BY gone.used_at
  `, [lines.map(l => l.booking_room_id)]);

  return {
    departure_date: lines[0]?.departure_label ?? '',
    early: lines.some(l => l.shorten),
    nights_booked: nightsBooked,
    nights_billed: nightsBilled,
    cancelled_services: cancelled.map(c => ({ ...c, amount: Number(c.amount) })),
  };
}

// Thrown to roll the preview transaction back while carrying its result out.
class PreviewResult extends Error {
  constructor(public readonly data: unknown) { super('preview'); }
}

/**
 * GET /api/v1/dashboard/check-out/preview?bookingId=...
 * The bill as it will be if the guest checks out now: runs the check-out's
 * recalculation inside a transaction that is always rolled back.
 */
router.get('/check-out/preview', async (req: Request, res: Response) => {
  const parsed = z.string().uuid().safeParse(req.query.bookingId);
  if (!parsed.success) throw Errors.badRequest('bookingId must be a valid UUID');
  const bookingId = parsed.data;

  try {
    await db.transaction(async (client) => {
      await lockForTransition(client, req, bookingId, 'CHECKED_IN', 'checked out');
      const departure = await prepareDeparture(client, bookingId);
      const invoice = await buildDbInvoice(bookingId, undefined, client);
      if (!invoice) throw Errors.notFound('Invoice for booking ' + bookingId);
      const owed = Math.round((invoice.breakdown.total_amount - invoice.breakdown.total_paid) * 100) / 100;
      throw new PreviewResult({
        departure,
        invoice,
        amount_due: Math.max(0, owed),
        refund_due: Math.max(0, -owed),
      });
    });
  } catch (err) {
    if (err instanceof PreviewResult) {
      res.json({ success: true, data: err.data });
      return;
    }
    throw err;
  }
});

/**
 * POST /api/v1/dashboard/check-out
 * Front desk check-out: CHECKED_IN → CHECKED_OUT for the booking and all its rooms,
 * any day during the stay. An early departure is billed for the nights stayed
 * (see prepareDeparture). Each room's invoice is rebuilt; a balance left is either
 * settled here (settleBalance) or blocks the check-out, and an overpayment is
 * refunded — one transaction.
 */
router.post('/check-out', validate(CheckOutSchema), async (req: Request, res: Response) => {
  const { bookingId, paymentMethod, settleBalance } = req.body as z.infer<typeof CheckOutSchema>;

  const outcome = await db.transaction(async (client) => {
    await lockForTransition(client, req, bookingId, 'CHECKED_IN', 'checked out');

    const departure = await prepareDeparture(client, bookingId);

    // Before the status change: the CHECKED_OUT trigger archives the stay with
    // its invoice total, so the invoices must already reflect the final stay.
    await buildDbInvoice(bookingId, undefined, client);

    const result = await bookingRepo.transitionStatus(client, bookingId, 'CHECKED_IN', 'CHECKED_OUT');
    if (!result) throw Errors.conflict('Booking status was changed by someone else. Reload and try again.');

    const settlement = await invoiceRepo.settleBookingAtCheckout(client, bookingId, {
      settle: settleBalance,
      paymentMethod,
    });

    return { ...result, departure, settlement };
  });

  const { settlement, departure } = outcome;
  const parts = ['Guest checked out.'];
  if (departure.early) parts.push(`Early departure: billed ${departure.nights_billed} of ${departure.nights_booked} night(s).`);
  if (settlement.settledNow > 0) parts.push(`Balance of $${settlement.settledNow.toFixed(2)} settled.`);
  if (settlement.refundedNow > 0) parts.push(`Refund of $${settlement.refundedNow.toFixed(2)} recorded.`);
  if (settlement.settledNow === 0 && settlement.refundedNow === 0) parts.push('Folio settled.');

  res.json({
    success: true,
    message: parts.join(' '),
    data: outcome,
  });
});


/**
 * GET /api/v1/dashboard/audit-activity
 * Admin dashboard convenience alias for audit log activity feed.
 * Proxies to the AuditRepository so the Admin view can call a single dashboard
 * namespace endpoint instead of /api/v1/audit-logs.
 * Query params: ?limit=30&offset=0&entityType=&action=
 * RBAC: ADMINISTRATOR, DBA (MANAGER access blocked at route level)
 */
router.get('/audit-activity', authorize('ADMINISTRATOR', 'DBA'), async (req: Request, res: Response) => {
  const limit  = Math.min(parseInt((req.query.limit  as string) ?? '30', 10), 200);
  const offset =           parseInt((req.query.offset as string) ?? '0',  10);

  const filter = {
    entityType: req.query.entityType as string | undefined,
    action:     req.query.action     as string | undefined,
    actorId:    req.query.actorId    as string | undefined,
    from:       req.query.from       as string | undefined,
    to:         req.query.to         as string | undefined,
  };

  const { rows, total } = await auditRepo.getAuditLogs(limit, offset, filter);
  res.json({
    success: true,
    data:    rows,
    meta:    { total, limit, offset },
  });
});

export default router;
