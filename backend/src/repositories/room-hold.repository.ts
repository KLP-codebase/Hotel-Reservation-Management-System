import { DbAdapter } from "../config/db";

export interface RoomHoldConflict {
  roomId: string;
  roomNumber: string;
  reason: string;
}

export class RoomHoldRepository {
  constructor(private db: DbAdapter) {}

  /**
   * Attempts to acquire an exclusive 10-minute hold on one or more rooms for a session.
   * Prevents competitive booking collisions across exact or overlapping subset dates.
   */
  async acquireHold(
    roomIds: string[],
    checkInDate: string,
    checkOutDate: string,
    sessionId: string
  ): Promise<{ success: boolean; conflict?: RoomHoldConflict; expiresAt?: string }> {
    if (!roomIds.length) {
      return { success: true };
    }

    // 1. Check for real booked rooms on overlapping dates
    const bookedConflict = await this.db.query<{ id: string; number: string }>(
      `SELECT r.id, r.number
       FROM rooms r
       WHERE r.id = ANY($1::varchar[])
         AND (
           EXISTS (
             SELECT 1 FROM booking_rooms br
             WHERE br.room_id = r.id
               AND br.status != 'CANCELLED'
               AND br.check_in_date < $3::date
               AND br.check_out_date > $2::date
           )
           OR EXISTS (
             SELECT 1 FROM bookings b
             WHERE b.room_id = r.id
               AND b.status != 'CANCELLED'
               AND b.check_in < $3::date
               AND b.check_out > $2::date
           )
         )
       LIMIT 1`,
      [roomIds, checkInDate, checkOutDate]
    );

    if (bookedConflict.rows.length > 0) {
      const conflictRoom = bookedConflict.rows[0];
      return {
        success: false,
        conflict: {
          roomId: conflictRoom.id,
          roomNumber: conflictRoom.number,
          reason: `Room ${conflictRoom.number} has already been reserved by another guest for the selected dates.`,
        },
      };
    }

    // 2. Check for active holds by another session on overlapping dates
    const holdConflict = await this.db.query<{ id: string; number: string; expires_at: Date }>(
      `SELECT r.id, r.number, rh.expires_at
       FROM rooms r
       JOIN room_holds rh ON rh.room_id = r.id
       WHERE r.id = ANY($1::varchar[])
         AND rh.expires_at > CURRENT_TIMESTAMP
         AND rh.session_id <> $4
         AND rh.check_in_date < $3::date
         AND rh.check_out_date > $2::date
       LIMIT 1`,
      [roomIds, checkInDate, checkOutDate, sessionId]
    );

    if (holdConflict.rows.length > 0) {
      const conflictRoom = holdConflict.rows[0];
      return {
        success: false,
        conflict: {
          roomId: conflictRoom.id,
          roomNumber: conflictRoom.number,
          reason: `Room ${conflictRoom.number} is currently held by another guest completing their reservation on overlapping dates.`,
        },
      };
    }

    // 3. Clear any existing holds for this session on these rooms
    await this.db.query(
      `DELETE FROM room_holds
       WHERE session_id = $1 AND room_id = ANY($2::varchar[])`,
      [sessionId, roomIds]
    );

    // 4. Insert fresh 10-minute hold for all requested rooms
    const expiresAtRes = await this.db.query<{ expires_at: string }>(
      `SELECT (CURRENT_TIMESTAMP + INTERVAL '10 minutes')::text AS expires_at`
    );
    const expiresAt = expiresAtRes.rows[0]?.expires_at || new Date(Date.now() + 600000).toISOString();

    for (const roomId of roomIds) {
      await this.db.query(
        `INSERT INTO room_holds (room_id, check_in_date, check_out_date, session_id, expires_at)
         VALUES ($1, $2::date, $3::date, $4, $5::timestamp with time zone)`,
        [roomId, checkInDate, checkOutDate, sessionId, expiresAt]
      );
    }

    return {
      success: true,
      expiresAt,
    };
  }

  /**
   * Release holds when a user cancels or completes a booking
   */
  async releaseHold(roomIds: string[], sessionId: string): Promise<void> {
    if (!roomIds.length) return;
    await this.db.query(
      `DELETE FROM room_holds
       WHERE session_id = $1 AND room_id = ANY($2::varchar[])`,
      [sessionId, roomIds]
    );
  }

  async releaseSession(sessionId: string): Promise<void> {
    await this.db.query(`DELETE FROM room_holds WHERE session_id = $1`, [sessionId]);
  }
}
