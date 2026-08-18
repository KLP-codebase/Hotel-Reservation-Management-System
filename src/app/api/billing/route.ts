import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get("bookingId");

    let sql = "SELECT * FROM bills";
    const params: any[] = [];

    if (bookingId) {
      params.push(bookingId);
      sql += " WHERE booking_id = $1";
    }

    sql += " ORDER BY issued_at DESC";

    const result = await query(sql, params);
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("GET /api/billing error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch bills" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId, subtotal, taxAmount, discountAmount, loyaltyDiscount, total, lineItems } = body;

    if (!bookingId || subtotal === undefined || total === undefined) {
      return NextResponse.json(
        { success: false, error: "Missing required billing details" },
        { status: 400 }
      );
    }

    const sql = `
      INSERT INTO bills (booking_id, subtotal, tax_amount, discount_amount, loyalty_discount, total, line_items)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const result = await query(sql, [
      bookingId,
      Number(subtotal),
      Number(taxAmount ?? 0),
      Number(discountAmount ?? 0),
      Number(loyaltyDiscount ?? 0),
      Number(total),
      JSON.stringify(lineItems ?? []),
    ]);

    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error("POST /api/billing error:", error);
    return NextResponse.json({ success: false, error: "Failed to create bill" }, { status: 500 });
  }
}
