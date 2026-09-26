import { DbAdapter } from '../config/db';

// Shape of one available room returned from the DB
export interface AvailableRoom {
    id: string;
    number: string;
    type: string;
    floor: number;
    price_per_night: number;
    max_guests: number;
    amenities: string[];
    description: string | null;
    branch_id: string;
    status: string;
}

export class AvailabilityRepository {
    constructor(private db: DbAdapter) { }

    async findAvailableRooms(
        branchId: string,
        roomType: string,
        checkIn: string,
        checkOut: string,
    ): Promise<AvailableRoom[]> {
        const result = await this.db.query<AvailableRoom>(`
            SELECT r.id, r.number, r.type, r.floor, r.price_per_night,
                   r.max_guests, r.amenities, r.description, r.branch_id, r.status
            FROM rooms r
            WHERE r.branch_id = $1::uuid
              AND r.type      = $2::room_type
              AND r.status    = 'AVAILABLE'
              -- Real reservations live in booking_rooms (one row per room line)
              AND NOT EXISTS (
                SELECT 1 FROM booking_rooms br
                WHERE br.room_id         = r.id
                  AND br.status         != 'CANCELLED'
                  AND br.check_in_date   < $4::date
                  AND br.check_out_date  > $3::date
              )
              -- Legacy single-room bookings (older code paths still write these columns)
              AND NOT EXISTS (
                SELECT 1 FROM bookings b
                WHERE b.room_id    = r.id
                  AND b.status    != 'CANCELLED'
                  AND b.check_in   < $4::date
                  AND b.check_out  > $3::date
              )
            ORDER BY r.floor, r.number
        `, [branchId, roomType, checkIn, checkOut]);

        return result.rows;
    }

    async findAllRooms(branchId?: string): Promise<AvailableRoom[]> {
        if (branchId) {
            const result = await this.db.query<AvailableRoom>(`
                SELECT r.id, r.number, r.type, r.floor, r.price_per_night,
                       r.max_guests, r.amenities, r.description, r.branch_id, r.status
                FROM rooms r
                WHERE r.branch_id = $1::uuid
                ORDER BY r.floor, r.number
            `, [branchId]);
            return result.rows;
        }

        const result = await this.db.query<AvailableRoom>(`
            SELECT r.id, r.number, r.type, r.floor, r.price_per_night,
                   r.max_guests, r.amenities, r.description, r.branch_id, r.status
            FROM rooms r
            ORDER BY r.floor, r.number
        `);
        return result.rows;
    }
}

