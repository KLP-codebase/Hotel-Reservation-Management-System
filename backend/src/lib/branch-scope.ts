import { Request, Response, NextFunction } from 'express';
import { db } from '../config/db';
import { Errors } from './errors';

// Managers and receptionists work in exactly one branch (the one in their JWT).
// Administrators and DBAs work across every branch, and guests are scoped by
// their own bookings elsewhere, so these helpers leave them unrestricted.
const SINGLE_BRANCH_ROLES = new Set(['MANAGER', 'RECEPTIONIST']);

/** The user's own branch, or undefined for roles that may see every branch. */
export function ownBranch(req: Request): string | undefined {
  if (!req.user || !SINGLE_BRANCH_ROLES.has(req.user.role)) return undefined;
  if (!req.user.branchId) throw Errors.forbidden('Your account is not assigned to a branch');
  return req.user.branchId;
}

/**
 * Refuses single-branch staff acting on a record outside their branch. A null
 * branch is a chain-wide record: they may read it but not change it.
 */
export function assertOwnBranch(req: Request, branchId: string | null | undefined): void {
  const own = ownBranch(req);
  if (own && String(branchId ?? '') !== own) {
    throw Errors.forbidden(branchId ? 'This record belongs to another branch' : 'Chain-wide records can only be changed by an administrator');
  }
}

/** Same check for a booking, given its booking_id or one of its booking_room_ids. */
export async function assertOwnsBooking(req: Request, bookingOrRoomId: string): Promise<void> {
  if (!ownBranch(req)) return;
  const { rows: [booking] } = await db.query<{ branch_id: string }>(
    `SELECT b.branch_id FROM bookings b
     WHERE b.booking_id::text = $1
        OR b.booking_id IN (SELECT booking_id FROM booking_rooms WHERE booking_room_id::text = $1)
     LIMIT 1`,
    [bookingOrRoomId],
  );
  if (booking) assertOwnBranch(req, booking.branch_id);
}

/** Middleware: pins `?branchId=` to the user's branch on report-style routes. */
export function lockBranchQuery(req: Request, _res: Response, next: NextFunction): void {
  try {
    const own = ownBranch(req);
    if (own) req.query.branchId = own;
    next();
  } catch (err) {
    next(err);
  }
}
