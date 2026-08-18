import { Router, Request, Response } from "express";
import crypto from "crypto";
import { prisma } from "../config/prisma";
import { logger } from "../config/logger";

const router = Router();

/**
 * POST /webhooks/payhere/notify
 * PayHere payment gateway checkout notification endpoint.
 * Verifies MD5 signature, then updates booking payment status.
 *
 * PayHere Docs: https://support.payhere.lk/api-&-mobile-sdk/payhere-checkout
 */
router.post("/notify", async (req: Request, res: Response) => {
  try {
    const payload = req.body as Buffer;
    const data = JSON.parse(payload.toString()) as Record<string, string>;

    // ── Signature verification ────────────────────────────────────────────────
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

    if (localSig !== md5sig) {
      logger.warn(`PayHere webhook signature mismatch for order ${order_id}`);
      return res.status(400).json({ error: "Invalid signature" });
    }

    // ── Update booking payment status ─────────────────────────────────────────
    const statusMap: Record<string, string> = {
      "2":  "PAID",      // Success
      "0":  "PENDING",   // Pending
      "-1": "CANCELLED", // Cancelled
      "-2": "FAILED",    // Failed
      "-3": "REFUNDED",  // Chargedback
    };

    const paymentStatus = statusMap[status_code] ?? "PENDING";

    await prisma.booking.update({
      where: { bookingRef: order_id },
      data: { paymentStatus },
    });

    logger.info(`PayHere webhook: booking ${order_id} → ${paymentStatus}`);
    return res.status(200).send("OK");
  } catch (err) {
    logger.error("PayHere webhook error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export { router as payhereWebhook };
