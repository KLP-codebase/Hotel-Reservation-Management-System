import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");

    let sql = "SELECT * FROM rooms WHERE is_active = true";
    const params: any[] = [];

    if (status) {
      params.push(status);
      sql += ` AND status = $${params.length}`;
    }

    if (type) {
      params.push(type);
      sql += ` AND type = $${params.length}`;
    }

    sql += " ORDER BY number ASC";

    const result = await query(sql, params);
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("GET /api/rooms error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch rooms" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { number, type, floor, pricePerNight, maxGuests, amenities, description } = body;

    if (!number || !type || !pricePerNight) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const sql = `
      INSERT INTO rooms (number, type, floor, price_per_night, max_guests, amenities, description)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const result = await query(sql, [
      number,
      type,
      Number(floor ?? 1),
      Number(pricePerNight),
      Number(maxGuests ?? 2),
      amenities ?? [],
      description ?? null,
    ]);

    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error("POST /api/rooms error:", error);
    return NextResponse.json({ success: false, error: "Failed to create room" }, { status: 500 });
  }
}
