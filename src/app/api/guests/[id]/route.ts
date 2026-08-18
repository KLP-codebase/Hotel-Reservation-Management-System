import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const guestResult = await query("SELECT * FROM guests WHERE id = $1 LIMIT 1", [params.id]);

    if (guestResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Guest not found" }, { status: 404 });
    }

    const bookingsResult = await query(
      "SELECT b.*, r.number as room_number FROM bookings b JOIN rooms r ON b.room_id = r.id WHERE b.guest_id = $1 ORDER BY b.created_at DESC",
      [params.id]
    );

    const guest = {
      ...guestResult.rows[0],
      bookings: bookingsResult.rows,
    };

    return NextResponse.json({ success: true, data: guest });
  } catch (error) {
    console.error("GET /api/guests/[id] error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch guest" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const fields = Object.keys(body);

    if (fields.length === 0) {
      return NextResponse.json({ success: false, error: "No fields to update" }, { status: 400 });
    }

    const setClauses = fields.map((field, idx) => `${field} = $${idx + 2}`).join(", ");
    const values = [params.id, ...Object.values(body)];

    const sql = `UPDATE guests SET ${setClauses}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`;
    const result = await query(sql, values);

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error("PATCH /api/guests/[id] error:", error);
    return NextResponse.json({ success: false, error: "Failed to update guest" }, { status: 500 });
  }
}
