"use server";

import { query } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createBookingAction(data: {
  guestId: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  adults?: number;
  children?: number;
  totalAmount: number;
  specialRequests?: string;
  source?: "DIRECT" | "BOOKING_COM" | "AGODA" | "WALK_IN";
}) {
  try {
    const bookingRef = `BK-${Date.now().toString(36).toUpperCase()}`;

    const sql = `
      INSERT INTO bookings (booking_ref, guest_id, room_id, check_in, check_out, adults, children, total_amount, special_requests, source)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const result = await query(sql, [
      bookingRef,
      data.guestId,
      data.roomId,
      data.checkIn,
      data.checkOut,
      data.adults ?? 1,
      data.children ?? 0,
      data.totalAmount,
      data.specialRequests ?? null,
      data.source ?? "DIRECT",
    ]);

    revalidatePath("/dashboard/bookings");
    return { success: true, data: result.rows[0] };
  } catch (error) {
    console.error("createBookingAction error:", error);
    return { success: false, error: "Failed to create booking" };
  }
}

export async function updateBookingStatusAction(
  bookingId: string,
  status: string,
  paymentStatus?: string
) {
  try {
    let sql = "UPDATE bookings SET status = $1";
    const params: any[] = [status];

    if (paymentStatus) {
      params.push(paymentStatus);
      sql += `, payment_status = $${params.length}`;
    }

    params.push(bookingId);
    sql += `, updated_at = CURRENT_TIMESTAMP WHERE id = $${params.length} RETURNING *`;

    const result = await query(sql, params);

    revalidatePath("/dashboard/bookings");
    return { success: true, data: result.rows[0] };
  } catch (error) {
    console.error("updateBookingStatusAction error:", error);
    return { success: false, error: "Failed to update booking status" };
  }
}
