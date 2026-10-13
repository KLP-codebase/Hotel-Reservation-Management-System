import { PoolClient } from 'pg';
import { DbAdapter } from '../config/db';
import { AppError, Errors } from '../lib/errors';

// NOTE — live Railway schema (differs from init.sql):
//   bookings.booked_by_guest_id / bookings.guest_id / booking_rooms.primary_guest_id
//   are VARCHAR and hold guests.id (legacy identity), NOT guests.guest_id (uuid).
//   bookings.guest_id has a FK → guests(id), so passing a guest_id uuid fails.
//   Always run an incoming guest identifier through resolveGuestLegacyId() first.

export interface CreateBookingInput {
    branch_id: string | number;
    booked_by_guest_id: string;   // guests.id
    notes?: string;
    adults?: number;
    children?: number;
}

export interface RoomLineInput {
    primary_guest_id: string;     // guests.id
    room_type_id?: number | null;
    room_id: string | number;
    plan_id?: number | null;
    check_in_date: string;
    check_out_date: string;
}

export interface AddedRoomLine {
    booking_room_id: string;
    room_id: string;
    room_number: string | null;
    rate_at_booking: string;
}

export interface AddAccompanyingGuestInput {
    booking_room_id: string;
    first_name: string;
    last_name: string;
    id_passport_no: string;
}


export class BookingRepository {
    constructor(private db: DbAdapter) { }

    // Accepts either guests.id or guests.guest_id and returns guests.id
    // (the value the bookings tables actually reference), or null if no such guest.
    async resolveGuestLegacyId(identifier: string): Promise<string | null> {
        const result = await this.db.query<{ id: string }>(`
            SELECT id
            FROM guests
            WHERE id = $1 OR guest_id::text = $1
            LIMIT 1
        `, [identifier]);

        return result.rows[0]?.id ?? null;
    }

    // Creates the booking header and (optionally) its room lines in ONE transaction.
    // If any room line fails (e.g. double-booked), the header is rolled back too,
    // so we never leave a booking with no rooms behind.
    async createBooking(
        input: CreateBookingInput,
        rooms: RoomLineInput[] = [],
    ): Promise<{ booking_id: string; rooms: AddedRoomLine[] }> {
        return this.db.transaction(async (client) => {
            const guestQuery = await client.query<{ id: string; guest_id: string }>(`
                SELECT id, guest_id FROM guests WHERE id = $1 OR guest_id::text = $1 LIMIT 1
            `, [input.booked_by_guest_id]);
            const resolvedBooker = guestQuery.rows[0];
            const bookerIdVal = resolvedBooker?.id ?? input.booked_by_guest_id;
            const bookerUuidVal = resolvedBooker?.guest_id ?? null;

            const header = await client.query<{ booking_id: string; branch_id: string }>(`
                INSERT INTO bookings (branch_id, booked_by_guest_id, guest_id, notes, special_requests, adults, children)
                VALUES ($1, $2, $3, $4, $4, $5, $6)
                RETURNING booking_id, branch_id
            `, [input.branch_id, bookerIdVal, bookerUuidVal ?? bookerIdVal, input.notes ?? null, input.adults ?? null, input.children ?? null]);

            const created = header.rows[0];
            if (!created) throw Errors.internal();

            const added: AddedRoomLine[] = [];
            for (const line of rooms) {
                added.push(await this.insertRoomLine(client, created.booking_id, created.branch_id, line));
            }

            return { booking_id: created.booking_id, rooms: added };
        });
    }

    // Adds one room line to an existing booking (own transaction).
    async addRoom(bookingId: string, branchId: string, line: RoomLineInput): Promise<AddedRoomLine> {
        return this.db.transaction((client) => this.insertRoomLine(client, bookingId, branchId, line));
    }

    // Shared by createBooking() and addRoom(). Must run inside a transaction.
    private async insertRoomLine(
        client: PoolClient,
        bookingId: string,
        branchId: string,
        line: RoomLineInput,
    ): Promise<AddedRoomLine> {
        // 1. Lock the room row resiliently across column variations (type vs room_type_id).
        const roomResult = await client.query<{
            id: string; number: string | null; branch_id: string; price_per_night: string; type: string | null; room_type_id: number | null;
        }>(`
            SELECT id, number, branch_id, price_per_night,
                   to_jsonb(rooms)->>'type' AS type,
                   (to_jsonb(rooms)->>'room_type_id')::int AS room_type_id
            FROM rooms
            WHERE id = $1
            FOR UPDATE
        `, [String(line.room_id)]);

        const room = roomResult.rows[0];
        if (!room) throw Errors.notFound('Room');
        if (room.branch_id !== branchId) {
            throw Errors.badRequest('Room does not belong to this booking\'s branch');
        }

        // Map room type name to room_type_id if integer FK was not directly present
        let roomTypeId = line.room_type_id ?? room.room_type_id ?? null;
        if (!roomTypeId && room.type) {
            const typeMap: Record<string, number> = {
                STANDARD: 1,
                DELUXE: 2,
                SUITE: 3,
                PRESIDENTIAL: 4,
            };
            roomTypeId = typeMap[room.type.toUpperCase()] ?? null;
        }

        // 2. Overlap check — current room lines, plus legacy single-room bookings
        const clash = await client.query(`
            SELECT 1 FROM booking_rooms
            WHERE room_id = $1
              AND status <> 'CANCELLED'
              AND check_in_date  < $3::date
              AND check_out_date > $2::date
            UNION ALL
            SELECT 1 FROM bookings
            WHERE room_id = $1
              AND status <> 'CANCELLED'
              AND check_in  < $3::date
              AND check_out > $2::date
            LIMIT 1
        `, [room.id, line.check_in_date, line.check_out_date]);

        if (clash.rows.length > 0) {
            throw new AppError(409, 'ROOM_UNAVAILABLE', 'Room is already booked for the selected dates');
        }

        // Resolve line guest identity for both VARCHAR(36) and UUID schema variations
        const guestQuery = await client.query<{ id: string; guest_id: string }>(`
            SELECT id, guest_id FROM guests WHERE id = $1 OR guest_id::text = $1 LIMIT 1
        `, [line.primary_guest_id]);
        const resolvedLineGuest = guestQuery.rows[0];
        const primaryGuestIdVal = resolvedLineGuest?.id ?? line.primary_guest_id;
        const primaryGuestUuidVal = resolvedLineGuest?.guest_id ?? line.primary_guest_id;

        // 3. Insert into booking_rooms with automatic fallback if UUID foreign key is enforced
        try {
            const inserted = await client.query<{ booking_room_id: string; rate_at_booking: string }>(`
                INSERT INTO booking_rooms
                    (booking_id, primary_guest_id, room_type_id, room_id, plan_id,
                     check_in_date, check_out_date, rate_at_booking)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING booking_room_id, rate_at_booking
            `, [
                bookingId, primaryGuestIdVal, roomTypeId,
                room.id, line.plan_id ?? 1, line.check_in_date,
                line.check_out_date, room.price_per_night,
            ]);

            return {
                booking_room_id: inserted.rows[0].booking_room_id,
                room_id: room.id,
                room_number: room.number,
                rate_at_booking: inserted.rows[0].rate_at_booking,
            };
        } catch (err: any) {
            // 23P01 = exclusion_violation from the no_double_booking constraint (DB backstop)
            if (err?.code === '23P01') {
                throw new AppError(409, 'ROOM_UNAVAILABLE', 'Room is already booked for the selected dates');
            }
            // 23503 / 22P02 = foreign key or uuid violation on primary_guest_id -> retry with canonical guest_id UUID
            if ((err?.code === '23503' || err?.code === '22P02') && primaryGuestUuidVal && primaryGuestUuidVal !== primaryGuestIdVal) {
                const retryInserted = await client.query<{ booking_room_id: string; rate_at_booking: string }>(`
                    INSERT INTO booking_rooms
                        (booking_id, primary_guest_id, room_type_id, room_id, plan_id,
                         check_in_date, check_out_date, rate_at_booking)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    RETURNING booking_room_id, rate_at_booking
                `, [
                    bookingId, primaryGuestUuidVal, roomTypeId,
                    room.id, line.plan_id ?? 1, line.check_in_date,
                    line.check_out_date, room.price_per_night,
                ]);
                return {
                    booking_room_id: retryInserted.rows[0].booking_room_id,
                    room_id: room.id,
                    room_number: room.number,
                    rate_at_booking: retryInserted.rows[0].rate_at_booking,
                };
            }
            console.error('[insertRoomLine] Insert failed:', err.message, err.code);
            throw err;
        }
    }

    async findHeaderById(bookingId: string) {
        const result = await this.db.query(`
            SELECT booking_id, branch_id, status, created_at
            FROM bookings
            WHERE booking_id = $1
        `, [bookingId]);

        return result.rows[0] ?? null;
    }

    async findById(bookingId: string) {
        // First get the booking header from the plain bookings table
        // (v_booking_details uses INNER JOIN — a booking with 0 rooms returns null there)
        const headerResult = await this.db.query(`
            SELECT
                b.booking_id,
                b.status,
                b.notes,
                b.created_at,
                br.branch_name,
                g.email AS guest_email,
                g.first_name AS guest_first_name,
                g.last_name AS guest_last_name,
                COALESCE(
                    g.first_name || ' ' || g.last_name,
                    s.first_name || ' ' || s.last_name,
                    'Unknown'
                ) AS booker_name
            FROM bookings b
            LEFT JOIN branches br ON br.branch_id = b.branch_id
            LEFT JOIN guests g ON (g.id = b.booked_by_guest_id OR g.guest_id::text = b.booked_by_guest_id)
            LEFT JOIN staff s ON s.staff_id = b.booked_by_staff_id
            WHERE b.booking_id = $1
        `, [bookingId]);

        if (!headerResult.rows[0]) return null;
        const header = headerResult.rows[0];

        // Then get the room lines with accompanying guests
        const roomsResult = await this.db.query(`
            SELECT
                br.booking_room_id,
                br.status,
                r.number AS room_number,
                COALESCE(rt.type_name, r.type::text) AS room_type_name,
                mp.plan_name AS meal_plan_name,
                br.check_in_date::text AS check_in_date,
                br.check_out_date::text AS check_out_date,
                (br.check_out_date - br.check_in_date) AS nights,
                br.rate_at_booking,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'verification_id', ag.verification_id,
                            'first_name', ag.first_name,
                            'last_name', ag.last_name,
                            'id_passport_no', ag.id_passport_no,
                            'is_verified', ag.is_verified
                        )
                    ) FILTER (WHERE ag.verification_id IS NOT NULL),
                    '[]'
                ) AS accompanying_guests
            FROM booking_rooms br
            LEFT JOIN rooms r ON r.id = br.room_id
            LEFT JOIN room_types rt ON rt.room_type_id = br.room_type_id
            LEFT JOIN meal_plans mp ON mp.plan_id = br.plan_id
            LEFT JOIN accompanying_guests ag ON ag.booking_room_id = br.booking_room_id
            WHERE br.booking_id = $1
            GROUP BY br.booking_room_id, br.status, r.number, r.type, rt.type_name, mp.plan_name,
                     br.check_in_date, br.check_out_date, br.rate_at_booking
        `, [bookingId]);

        // rate_at_booking is a PER-NIGHT rate (billing uses nights × rate too),
        // so each line's room charge is nights × rate.
        const total_amount = roomsResult.rows.reduce(
            (sum: number, row: any) => sum + Number(row.nights || 0) * parseFloat(row.rate_at_booking || 0), 0
        );

        return {
            ...header,
            total_amount,
            rooms: roomsResult.rows,
        };
    }

    async findAll() {
        const result = await this.db.query(`
SELECT
  b.booking_id,
  b.status,
  b.created_at,
  br.branch_name,
  COALESCE(g.first_name || ' ' || g.last_name, s.first_name || ' ' || s.last_name) AS guest_name,
  agg.room_count,
  agg.earliest_check_in,
  agg.latest_check_out
FROM bookings b
LEFT JOIN branches br ON br.branch_id = b.branch_id
LEFT JOIN guests g ON g.id = b.booked_by_guest_id
LEFT JOIN staff s ON s.staff_id = b.booked_by_staff_id
LEFT JOIN LATERAL (
  SELECT
    COUNT(*) AS room_count,
    MIN(check_in_date) AS earliest_check_in,
    MAX(check_out_date) AS latest_check_out
  FROM booking_rooms
  WHERE booking_rooms.booking_id = b.booking_id
) agg ON true
ORDER BY b.created_at DESC

        `, []);

        return result.rows;
    }

    // Moves a booking from `fromStatus` to `toStatus` atomically.
    // `AND status = fromStatus` guards against two staff members acting at once:
    // if someone else already changed it, 0 rows update and we return null.
    async updateStatus(
        bookingId: string,
        fromStatus: string,
        toStatus: string,
    ): Promise<{ booking_id: string; status: string } | null> {
        return this.db.transaction((client) => this.transitionStatus(client, bookingId, fromStatus, toStatus));
    }

    // Same as updateStatus(), for callers that need more work in the same transaction.
    // The booking's live room lines follow it, which fires the booking_rooms triggers:
    //   CHECKED_IN  → rooms.status = OCCUPIED            (fn_sync_room_status)
    //   CHECKED_OUT → rooms.status = MAINTENANCE, and the
    //                 room's invoice is (re)generated     (fn_auto_bill_on_checkout)
    //   CANCELLED   → the dates are freed for new bookings (no_double_booking ignores CANCELLED)
    async transitionStatus(
        client: PoolClient,
        bookingId: string,
        fromStatus: string,
        toStatus: string,
    ): Promise<{ booking_id: string; status: string } | null> {
        const result = await client.query<{ booking_id: string; status: string }>(`
            UPDATE bookings
            SET status = $1, updated_at = CURRENT_TIMESTAMP
            WHERE booking_id = $2 AND status = $3
            RETURNING booking_id, status
        `, [toStatus, bookingId, fromStatus]);

        if (!result.rows[0]) return null;

        if (toStatus === 'CHECKED_IN' || toStatus === 'CHECKED_OUT' || toStatus === 'CANCELLED') {
            await client.query(`
                UPDATE booking_rooms
                SET status = $1
                WHERE booking_id = $2 AND status NOT IN ('CANCELLED', $1)
            `, [toStatus, bookingId]);
        }

        return result.rows[0];
    }

    // Reads the booking header and locks it until the transaction ends, so a
    // concurrent check-in / check-out of the same booking waits its turn.
    async lockHeader(client: PoolClient, bookingId: string) {
        const result = await client.query<{ booking_id: string; branch_id: string; status: string }>(`
            SELECT booking_id, branch_id, status
            FROM bookings
            WHERE booking_id = $1
            FOR UPDATE
        `, [bookingId]);

        return result.rows[0] ?? null;
    }

    // The booking's room lines that still count (not cancelled), oldest first.
    async findLiveRoomLines(client: PoolClient, bookingId: string) {
        const result = await client.query<{ booking_room_id: string }>(`
            SELECT booking_room_id
            FROM booking_rooms
            WHERE booking_id = $1 AND status <> 'CANCELLED'
            ORDER BY created_at, booking_room_id
        `, [bookingId]);

        return result.rows;
    }

    async insertAccompanyingGuests(
        client: PoolClient,
        bookingRoomId: string,
        guests: Omit<AddAccompanyingGuestInput, 'booking_room_id'>[],
    ): Promise<void> {
        for (const g of guests) {
            await client.query(`
                INSERT INTO accompanying_guests (booking_room_id, first_name, last_name, id_passport_no)
                VALUES ($1, $2, $3, $4)
            `, [bookingRoomId, g.first_name, g.last_name, g.id_passport_no]);
        }
    }

    async addAccompanyingGuest(input: AddAccompanyingGuestInput) {
        const result = await this.db.query(`
            INSERT INTO accompanying_guests (booking_room_id, first_name, last_name, id_passport_no)
            VALUES ($1, $2, $3, $4)
            RETURNING verification_id, booking_room_id, first_name, last_name, id_passport_no, is_verified
        `, [input.booking_room_id, input.first_name, input.last_name, input.id_passport_no]);

        return result.rows[0];
    }

    async findBookingRoomById(bookingRoomId: string) {
        const result = await this.db.query(`
            SELECT booking_room_id, booking_id, room_id, status
            FROM booking_rooms
            WHERE booking_room_id = $1
        `, [bookingRoomId]);

        return result.rows[0] ?? null;
    }


}
