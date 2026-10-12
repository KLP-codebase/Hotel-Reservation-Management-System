import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { env } from '../config/env';
import { emailService } from '../services/email.service';
import { validate } from '../middleware/validate.middleware';

const router = Router();

const DEPARTMENTS: Record<string, string> = {
  reservations: 'Suite Reservations & Stays',
  concierge: 'Curated Experiences & Dining',
  events: 'Weddings & Private Retreats',
  press: 'Media & Corporate Relations',
};

const SANCTUARIES: Record<string, string> = {
  any: 'All sanctuaries / general',
  colombo: 'Colombo Sky Tower',
  kandy: 'Kandy Misty Peak',
  galle: 'Galle Coastal Villa',
};

const contactSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().max(80).optional().default(''),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(40).optional().default(''),
  department: z.enum(['reservations', 'concierge', 'events', 'press']),
  sanctuary: z.enum(['any', 'colombo', 'kandy', 'galle']),
  message: z.string().trim().min(5).max(4000),
});

// ── Minimal in-memory rate limiter: 5 enquiries / 10 min / IP ─────────────────
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

/**
 * POST /api/v1/contact
 * Public. Emails a guest enquiry to the configured inbox (CONTACT_INBOX_EMAIL).
 */
router.post('/', validate(contactSchema), async (req: Request, res: Response) => {
  if (rateLimited(req.ip ?? 'unknown')) {
    return res.status(429).json({
      success: false,
      message: 'Too many enquiries. Please try again in a few minutes.',
    });
  }

  const b = req.body as z.infer<typeof contactSchema>;
  const sent = await emailService.sendContactEnquiryEmail({
    to: env.CONTACT_INBOX_EMAIL,
    name: `${b.firstName} ${b.lastName}`.trim(),
    email: b.email,
    phone: b.phone,
    department: DEPARTMENTS[b.department],
    sanctuary: SANCTUARIES[b.sanctuary],
    message: b.message,
  });

  if (!sent) {
    return res.status(502).json({
      success: false,
      message: 'We could not deliver your enquiry just now. Please try again shortly.',
    });
  }
  return res.status(201).json({ success: true });
});

export default router;
