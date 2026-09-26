import { DbAdapter } from '../config/db';

export interface CreateBookingInput {
    branch_id: string | number;
    booked_by_guest_id: string;
    notes?: string;
}

export interface AddRoomInput {
    booking_id: string;
    primary_guest_id: string;
    room_type_id?: number | null;
    room_id: string | number;
    plan_id?: number | null;
    check_in_date: string;
    check_out_date: string;
    rate_at_booking: number;
}

export interface AddAccompanyingGuestInput {
    booking_room_id: string;
    first_name: string;
    last_name: string;
    id_passport_no: string;
}


export class BookingRepository {
    constructor(private db: DbAdapter) { }

    async createBooking(input: CreateBookingInput): Promise<{ booking_id: string }> {
        const result = await this.db.query<{ booking_id: string }>(`
            INSERT INTO bookings (branch_id, booked_by_guest_id, guest_id, notes, special_requests)
            VALUES ($1, $2, $2, $3, $3)
            RETURNING booking_id
        `, [input.branch_id, input.booked_by_guest_id, input.notes ?? null]);

        return result.rows[0];
    }

    async addRoom(input: AddRoomInput): Promise<{ booking_room_id: string }> {
        const result = await this.db.query<{ booking_room_id: string }>(`
            INSERT INTO booking_rooms
                (booking_id, primary_guest_id, room_type_id, room_id, plan_id,
                 check_in_date, check_out_date, rate_at_booking)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING booking_room_id
        `, [
            input.booking_id, input.primary_guest_id, input.room_type_id ?? null,
            input.room_id, input.plan_id ?? 1, input.check_in_date,
            input.check_out_date, input.rate_at_booking,
        ]);

        return result.rows[0];
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
                COALESCE(
                    g.first_name || ' ' || g.last_name,
                    s.first_name || ' ' || s.last_name,
                    'Unknown'
                ) AS booker_name
            FROM bookings b
            LEFT JOIN branches br ON br.branch_id = b.branch_id
            LEFT JOIN guests g ON g.id = b.booked_by_guest_id
            LEFT JOIN staff s ON s.staff_id = b.booked_by_staff_id
            WHERE b.booking_id = $1
        `, [bookingId]);

        if (!headerResult.rows[0]) return null;
        const header = headerResult.rows[0];

        // Then get the room lines with accompanying guests
        const roomsResult = await this.db.query(`
            SELECT
                br.booking_room_id,
                r.room_number,
                rt.type_name AS room_type_name,
                mp.plan_name AS meal_plan_name,
                br.check_in_date::text AS check_in_date,
                br.check_out_date::text AS check_out_date,
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
            LEFT JOIN rooms r ON r.room_id = br.room_id::uuid
            LEFT JOIN room_types rt ON rt.room_type_id = br.room_type_id
            LEFT JOIN meal_plans mp ON mp.plan_id = br.plan_id
            LEFT JOIN accompanying_guests ag ON ag.booking_room_id = br.booking_room_id
            WHERE br.booking_id = $1
            GROUP BY br.booking_room_id, r.room_number, rt.type_name, mp.plan_name,
                     br.check_in_date, br.check_out_date, br.rate_at_booking
        `, [bookingId]);

        // Compute total from room lines
        const total_amount = roomsResult.rows.reduce(
            (sum: number, row: any) => sum + parseFloat(row.rate_at_booking || 0), 0
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
LEFT JOIN guests g ON g.guest_id = b.booked_by_guest_id
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

    async updateStatus(bookingId: string, status: string): Promise<{ booking_id: string; status: string }> {
        const result = await this.db.query<{ booking_id: string; status: string }>(`
            UPDATE bookings
            SET status = $1
            WHERE booking_id = $2
            RETURNING booking_id, status
        `, [status, bookingId]);

        // If the booking is cancelled, also cancel its rooms so the dates are freed up
        if (status === 'CANCELLED') {
            await this.db.query(`
                UPDATE booking_rooms
                SET status = 'CANCELLED'
                WHERE booking_id = $1
            `, [bookingId]);
        }

        return result.rows[0];
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
