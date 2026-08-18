import { Router, Request, Response } from "express";
import { prisma } from "../config/prisma";
import { logger } from "../config/logger";

const router = Router();

/**
 * POST /webhooks/ota/sync
 * Receives reservation sync payloads from OTA channels:
 *   - Booking.com (via Channel Manager XML push → normalized JSON)
 *   - Agoda (via YCS Partner API webhooks)
 *
 * The OTA channel is identified by the `x-ota-source` header.
 */
router.post("/sync", async (req: Request, res: Response) => {
  const source = (req.headers["x-ota-source"] as string)?.toUpperCase();

  if (!source || !["BOOKING_COM", "AGODA"].includes(source)) {
    return res.status(400).json({ error: "Unknown OTA source" });
  }

  try {
    const payload = req.body;
    logger.info(`OTA sync received from ${source}`, { payload });

    // Normalize the OTA payload into our booking schema
    const normalized = normalizeOtaPayload(source, payload);

    if (!normalized) {
      return res.status(422).json({ error: "Could not normalize payload" });
    }

    // Upsert booking — create if new, update if exists
    await prisma.booking.upsert({
      where: { bookingRef: normalized.bookingRef },
      update: {
        status: normalized.status,
        checkIn: normalized.checkIn,
        checkOut: normalized.checkOut,
      },
      create: normalized,
    });

    logger.info(`OTA sync: upserted booking ${normalized.bookingRef} from ${source}`);
    return res.status(200).json({ success: true });
  } catch (err) {
    logger.error(`OTA sync error from ${source}`, err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

function normalizeOtaPayload(source: string, payload: Record<string, unknown>) {
  // TODO: implement per-OTA normalization logic
  // Booking.com uses property_id, reservation_id, etc.
  // Agoda uses booking_id, hotel_id, etc.
  return null;
}

export { router as otaSyncWebhook };
