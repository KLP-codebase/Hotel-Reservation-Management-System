import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const guestId = searchParams.get("guestId");

    let sql = `
      SELECT 
        b.*,
        json_build_object('id', g.id, 'firstName', g.first_name, 'lastName', g.last_name, 'email', g.email, 'phone', g.phone) AS guest,
        json_build_object('id', r.id, 'number', r.number, 'type', r.type, 'pricePerNight', r.price_per_night) AS room
      FROM bookings b
      JOIN guests g ON b.guest_id = g.id
      JOIN rooms r ON b.room_id = r.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (status) {
      params.push(status);
      sql += ` AND b.status = $${params.length}`;
    }

    if (guestId) {
      params.push(guestId);
      sql += ` AND b.guest_id = $${params.length}`;
    }

    sql += " ORDER BY b.created_at DESC";

    const result = await query(sql, params);
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("GET /api/bookings error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch bookings" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { guestId, roomId, checkIn, checkOut, adults, children, totalAmount, specialRequests, source } = body;

    if (!guestId || !roomId || !checkIn || !checkOut || !totalAmount) {
      return NextResponse.json(
        { success: false, error: "Missing required booking fields" },
        { status: 400 }
      );
    }

    const bookingRef = `BK-${Date.now().toString(36).toUpperCase()}`;

    const sql = `
      INSERT INTO bookings (booking_ref, guest_id, room_id, check_in, check_out, adults, children, total_amount, special_requests, source)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const result = await query(sql, [
      bookingRef,
      guestId,
      roomId,
      checkIn,
      checkOut,
      Number(adults ?? 1),
      Number(children ?? 0),
      Number(totalAmount),
      specialRequests ?? null,
      source ?? "DIRECT",
    ]);

    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error("POST /api/bookings error:", error);
    return NextResponse.json({ success: false, error: "Failed to create booking" }, { status: 500 });
  }
}
