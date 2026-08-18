import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { query } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    let data: Record<string, string> = {};

    try {
      data = JSON.parse(rawBody);
    } catch {
      const searchParams = new URLSearchParams(rawBody);
      searchParams.forEach((val, key) => {
        data[key] = val;
      });
    }

    const {
      merchant_id,
      order_id,
      payhere_amount,
      payhere_currency,
      status_code,
      md5sig,
    } = data;

    const secret = process.env.PAYHERE_MERCHANT_SECRET ?? "";
    const hashedSecret = crypto
      .createHash("md5")
      .update(secret)
      .digest("hex")
      .toUpperCase();

    const localSig = crypto
      .createHash("md5")
      .update(
        `${merchant_id}${order_id}${payhere_amount}${payhere_currency}${status_code}${hashedSecret}`
      )
      .digest("hex")
      .toUpperCase();

    if (md5sig && localSig !== md5sig) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const statusMap: Record<string, string> = {
      "2": "PAID",
      "0": "PENDING",
      "-1": "FAILED",
      "-2": "FAILED",
      "-3": "REFUNDED",
    };

    const paymentStatus = statusMap[status_code] ?? "PENDING";

    if (order_id) {
      await query(
        "UPDATE bookings SET payment_status = $1, updated_at = CURRENT_TIMESTAMP WHERE booking_ref = $2",
        [paymentStatus, order_id]
      );
    }

    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error("PayHere webhook error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
