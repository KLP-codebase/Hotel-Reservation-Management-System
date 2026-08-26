import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await query("SELECT * FROM rooms WHERE id = $1 LIMIT 1", [params.id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Room not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error("GET /api/rooms/[id] error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch room" }, { status: 500 });
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

    const sql = `UPDATE rooms SET ${setClauses}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`;
    const result = await query(sql, values);

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error("PATCH /api/rooms/[id] error:", error);
    return NextResponse.json({ success: false, error: "Failed to update room" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await query("UPDATE rooms SET is_active = false WHERE id = $1", [params.id]);
    return NextResponse.json({ success: true, message: "Room deactivated" });
  } catch (error) {
    console.error("DELETE /api/rooms/[id] error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete room" }, { status: 500 });
  }
}
