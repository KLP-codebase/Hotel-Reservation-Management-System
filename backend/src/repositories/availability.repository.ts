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
        roomType: string | undefined,
        checkIn: string,
        checkOut: string,
    ): Promise<AvailableRoom[]> {
        const hasSpecificType = roomType && roomType !== 'ALL';
        const params: any[] = [branchId, checkIn, checkOut];
        let typeCondition = '';
        if (hasSpecificType) {
            params.push(roomType);
            typeCondition = `AND r.type = $${params.length}::room_type`;
        }

        const result = await this.db.query<AvailableRoom>(`
            SELECT r.id, r.number, r.type, r.floor, r.price_per_night,
                   r.max_guests, r.amenities, r.description, r.branch_id, r.status
            FROM rooms r
            WHERE r.branch_id = $1::uuid
              ${typeCondition}
              -- A room's status describes it today (who is in it, housekeeping after
              -- check-out), so OCCUPIED and MAINTENANCE only block a stay starting
              -- today; later dates are decided by the booking overlap checks below.
              -- OUT_OF_SERVICE has no end date, so it blocks every date.
              -- status is compared as text and is_active read via to_jsonb because the
              -- Azure schema keeps status as the room_status enum (no OUT_OF_SERVICE
              -- label, so a plain comparison errors) and may not have is_active at all.
              AND COALESCE((to_jsonb(r) ->> 'is_active')::boolean, true)
              AND r.status::text <> 'OUT_OF_SERVICE'
              AND NOT (r.status::text IN ('OCCUPIED', 'MAINTENANCE')
                       AND $2::date <= (now() AT TIME ZONE 'Asia/Colombo')::date)
              -- Real reservations live in booking_rooms (one row per room line)
              AND NOT EXISTS (
                SELECT 1 FROM booking_rooms br
                WHERE br.room_id         = r.id
                  AND br.status         != 'CANCELLED'
                  AND br.check_in_date   < $3::date
                  AND br.check_out_date  > $2::date
              )
              -- Legacy single-room bookings (older code paths still write these columns)
              AND NOT EXISTS (
                SELECT 1 FROM bookings b
                WHERE b.room_id    = r.id
                  AND b.status    != 'CANCELLED'
                  AND b.check_in   < $3::date
                  AND b.check_out  > $2::date
              )
            ORDER BY r.type, r.floor, r.number
        `, params);

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
