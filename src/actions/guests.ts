"use server";

import { query } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createGuestAction(data: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  nationality?: string;
  passportNumber?: string;
  notes?: string;
}) {
  try {
    const sql = `
      INSERT INTO guests (first_name, last_name, email, phone, nationality, passport_number, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const result = await query(sql, [
      data.firstName,
      data.lastName,
      data.email,
      data.phone,
      data.nationality ?? null,
      data.passportNumber ?? null,
      data.notes ?? null,
    ]);

    revalidatePath("/dashboard/guests");
    return { success: true, data: result.rows[0] };
  } catch (error) {
    console.error("createGuestAction error:", error);
    return { success: false, error: "Failed to create guest" };
  }
}
