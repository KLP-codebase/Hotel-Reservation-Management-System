import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("q");

    let sql = "SELECT * FROM guests";
    const params: any[] = [];

    if (search) {
      params.push(`%${search}%`);
      sql += " WHERE first_name ILIKE $1 OR last_name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1";
    }

    sql += " ORDER BY created_at DESC";

    const result = await query(sql, params);
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("GET /api/guests error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch guests" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firstName, lastName, email, phone, nationality, passportNumber, notes } = body;

    if (!firstName || !lastName || !email || !phone) {
      return NextResponse.json(
        { success: false, error: "First name, last name, email, and phone are required" },
        { status: 400 }
      );
    }

    const sql = `
      INSERT INTO guests (first_name, last_name, email, phone, nationality, passport_number, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const result = await query(sql, [
      firstName,
      lastName,
      email,
      phone,
      nationality ?? null,
      passportNumber ?? null,
      notes ?? null,
    ]);

    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error("POST /api/guests error:", error);
    return NextResponse.json({ success: false, error: "Failed to create guest" }, { status: 500 });
  }
}
