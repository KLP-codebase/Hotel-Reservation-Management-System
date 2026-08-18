import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const roomsRes = await query("SELECT COUNT(*)::int as total, COUNT(*) FILTER (WHERE status = 'OCCUPIED')::int as occupied FROM rooms WHERE is_active = true");
    const bookingsRes = await query("SELECT COUNT(*)::int as total FROM bookings");
    const guestsRes = await query("SELECT COUNT(*)::int as total FROM guests");
    const revenueRes = await query("SELECT COALESCE(SUM(total), 0) as revenue FROM bills");

    const totalRooms = roomsRes.rows[0]?.total ?? 0;
    const occupiedRooms = roomsRes.rows[0]?.occupied ?? 0;
    const occupancyRate = totalRooms > 0 ? ((occupiedRooms / totalRooms) * 100).toFixed(1) : "0.0";

    return NextResponse.json({
      success: true,
      data: {
        totalRooms,
        occupiedRooms,
        occupancyRate: `${occupancyRate}%`,
        totalBookings: bookingsRes.rows[0]?.total ?? 0,
        totalGuests: guestsRes.rows[0]?.total ?? 0,
        totalRevenue: Number(revenueRes.rows[0]?.revenue ?? 0),
      },
    });
  } catch (error) {
    console.error("GET /api/reports error:", error);
    return NextResponse.json({ success: false, error: "Failed to generate report" }, { status: 500 });
  }
}
