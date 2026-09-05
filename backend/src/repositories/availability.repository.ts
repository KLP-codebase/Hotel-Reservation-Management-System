import { DbAdapter } from '../config/db';

// Shape of one available room returned from the DB
export interface AvailableRoom {
    room_id: number;
    room_number: string;
    floor: number;
}

export class AvailabilityRepository {
    constructor(private db: DbAdapter) { }

    async findAvailableRooms(
        branchId: number,
        roomTypeId: number,
        checkIn: string,
        checkOut: string,
    ): Promise<AvailableRoom[]> {
        const result = await this.db.query<AvailableRoom>(`
            SELECT r.room_id, r.room_number, r.floor
            FROM rooms r
            WHERE r.branch_id    = $1
              AND r.room_type_id = $2
              AND r.status       = 'AVAILABLE'
              AND NOT EXISTS (
                SELECT 1 FROM booking_rooms br
                WHERE br.room_id        = r.room_id
                  AND br.status        != 'CANCELLED'
                  AND br.check_in_date  < $4
                  AND br.check_out_date > $3
              )
            ORDER BY r.floor, r.room_number
        `, [branchId, roomTypeId, checkIn, checkOut]);

        return result.rows;
    }
}
