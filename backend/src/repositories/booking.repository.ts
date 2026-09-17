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
        const result = await this.db.query(`
            SELECT * FROM v_booking_details WHERE booking_id = $1
        `, [bookingId]);

        return result.rows[0] ?? null;
    }

    async findAll() {
        const result = await this.db.query(`
            SELECT booking_id, branch_id, status, created_at
            FROM bookings
            ORDER BY created_at DESC
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
