import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sql = `
      SELECT 
        b.*,
        json_build_object('id', g.id, 'firstName', g.first_name, 'lastName', g.last_name, 'email', g.email, 'phone', g.phone) AS guest,
        json_build_object('id', r.id, 'number', r.number, 'type', r.type, 'pricePerNight', r.price_per_night) AS room
      FROM bookings b
      JOIN guests g ON b.guest_id = g.id
      JOIN rooms r ON b.room_id = r.id
      WHERE b.id = $1 OR b.booking_ref = $1
      LIMIT 1
    `;

    const result = await query(sql, [params.id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Booking not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error("GET /api/bookings/[id] error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch booking" }, { status: 500 });
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

    const sql = `UPDATE bookings SET ${setClauses}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`;
    const result = await query(sql, values);

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error("PATCH /api/bookings/[id] error:", error);
    return NextResponse.json({ success: false, error: "Failed to update booking" }, { status: 500 });
  }
}
