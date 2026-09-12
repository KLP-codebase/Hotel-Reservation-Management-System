import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { inMemoryStore } from '../config/db-fallback';
import { db } from '../config/db';
import { ServiceRepository } from '../repositories/service.repository';

const router = Router();
const serviceRepo = new ServiceRepository(db);

// RBAC: Operations staff can manage guest services
router.use(authenticate);
router.use(authorize('RECEPTIONIST', 'MANAGER', 'ADMINISTRATOR', 'DBA'));

const AddFolioServiceSchema = z.object({
  service_name:     z.string().min(1, 'Service name is required'),
  category:         z.string().min(1, 'Category is required'),
  meal_time:        z.enum(['BREAKFAST', 'LUNCH', 'DINNER']).optional(),
  quantity:         z.number().int().positive().default(1),
  price_at_usage:   z.number().nonnegative('Price must be non-negative'),
  notes:            z.string().optional(),
  appointment_time: z.string().optional(),
  date:             z.string().optional(),
});

/**
 * GET /api/v1/services/menus
 * Returns categorized in-room dining menus: Breakfast, Lunch, and Dinner.
 */
router.get('/menus', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: inMemoryStore.menus,
    service_hours: {
      breakfast: '06:30 – 11:00',
      lunch:     '12:00 – 16:30',
      dinner:    '18:30 – 23:00',
    },
  });
});

/**
 * GET /api/v1/services/spa-catalogue
 * Returns list of available spa and wellness treatments.
 */
router.get('/spa-catalogue', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: inMemoryStore.spaCatalogue,
  });
});

/**
 * GET /api/v1/services/spa-slots
 * Real-time collision detection for spa appointments.
 * Query params: ?branchId=...&date=YYYY-MM-DD
 */
router.get('/spa-slots', (req: Request, res: Response) => {
  const branchId = typeof req.query.branchId === 'string' ? req.query.branchId : (req.user?.branchId ?? undefined);
  const dateStr  = typeof req.query.date === 'string' ? req.query.date : undefined;

  const slots = inMemoryStore.getSpaSlots(branchId, dateStr);
  res.json({
    success: true,
    data: slots,
    count: slots.length,
    date: dateStr || new Date().toISOString().split('T')[0],
  });
});

/**
 * GET /api/v1/services/folio/:bookingId
 * Returns active itemized folio service charges for a guest stay.
 */
router.get('/folio/:bookingId', (req: Request, res: Response) => {
  const { bookingId } = req.params;
  const services = inMemoryStore.getFolio(bookingId);
  res.json({
    success: true,
    data: services,
    count: services.length,
  });
});

/**
 * POST /api/v1/services/folio/:bookingId
 * Adds in-room dining or wellness treatment to the room folio with frozen rate (Rule B10).
 */
router.post('/folio/:bookingId', (req: Request, res: Response) => {
  const { bookingId } = req.params;
  const parsed = AddFolioServiceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ success: false, errors: parsed.error.flatten().fieldErrors });
    return;
  }

  try {
    const record = inMemoryStore.addFolioService(bookingId, parsed.data);
    res.status(201).json({
      success: true,
      message: 'Service added to folio successfully',
      data: record,
    });
  } catch (err: any) {
    res.status(409).json({
      success: false,
      message: err.message || 'Unable to add service to folio',
      code: 'SERVICE_CONFLICT',
    });
  }
});

/**
 * DELETE /api/v1/services/folio/:usageId
 * Voids/removes a service charge from the room folio (e.g. guest cancelled or no-show).
 */
router.delete('/folio/:usageId', (req: Request, res: Response) => {
  const { usageId } = req.params;
  const reason = (req.body?.reason || req.query.reason || 'Guest cancellation') as string;

  const success = inMemoryStore.removeFolioService(usageId, reason);
  if (!success) {
    res.status(404).json({
      success: false,
      message: 'Service usage record not found on folio',
      code: 'NOT_FOUND',
    });
    return;
  }

  res.json({
    success: true,
    message: 'Service charge voided and removed from room folio',
    data: { usageId, reason },
  });
});

export default router;
