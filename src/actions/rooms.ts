"use server";

import { query } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createRoomAction(data: {
  number: string;
  type: string;
  floor: number;
  pricePerNight: number;
  maxGuests?: number;
  amenities?: string[];
  description?: string;
}) {
  try {
    const sql = `
      INSERT INTO rooms (number, type, floor, price_per_night, max_guests, amenities, description)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const result = await query(sql, [
      data.number,
      data.type,
      data.floor,
      data.pricePerNight,
      data.maxGuests ?? 2,
      data.amenities ?? [],
      data.description ?? null,
    ]);

    revalidatePath("/dashboard/rooms");
    return { success: true, data: result.rows[0] };
  } catch (error) {
    console.error("createRoomAction error:", error);
    return { success: false, error: "Failed to create room" };
  }
}

export async function updateRoomStatusAction(roomId: string, status: string) {
  try {
    const result = await query(
      "UPDATE rooms SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *",
      [status, roomId]
    );

    revalidatePath("/dashboard/rooms");
    return { success: true, data: result.rows[0] };
  } catch (error) {
    console.error("updateRoomStatusAction error:", error);
    return { success: false, error: "Failed to update room status" };
  }
}
