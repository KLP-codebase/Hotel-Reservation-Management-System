import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const source = request.headers.get("x-ota-source")?.toUpperCase();

  if (!source || !["BOOKING_COM", "AGODA"].includes(source)) {
    return NextResponse.json({ error: "Unknown OTA source" }, { status: 400 });
  }

  try {
    const payload = await request.json();
    console.log(`OTA sync received from ${source}:`, payload);

    return NextResponse.json({ success: true, message: `Received sync from ${source}` });
  } catch (error) {
    console.error(`OTA sync error from ${source}:`, error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
