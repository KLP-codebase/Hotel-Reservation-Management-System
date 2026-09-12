import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { inMemoryStore } from '../config/db-fallback';

const router = Router();

// RBAC: Operations and management staff
router.use(authenticate);
router.use(authorize('RECEPTIONIST', 'MANAGER', 'ADMINISTRATOR', 'DBA'));

const RecordPaymentSchema = z.object({
  amount:           z.number().positive('Payment amount must be greater than zero'),
  payment_method:   z.enum(['CASH', 'CREDIT_CARD', 'BANK_TRANSFER', 'ONLINE']),
  reference_number: z.string().optional(),
  notes:            z.string().optional(),
});

/**
 * GET /api/v1/invoices/:bookingId
 * Returns complete tax cascade invoice breakdown, service items, and payments ledger.
 */
router.get('/:bookingId', (req: Request, res: Response) => {
  const { bookingId } = req.params;
  const invoice = inMemoryStore.getInvoice(bookingId);

  if (!invoice) {
    res.status(404).json({
      success: false,
      message: 'Invoice not found for booking: ' + bookingId,
      code: 'NOT_FOUND',
    });
    return;
  }

  res.json({
    success: true,
    data: invoice,
  });
});

/**
 * POST /api/v1/invoices/:bookingId/generate
 * Recalculates and formalizes final bill enforcing 4-tier statutory tax cascade.
 */
router.post('/:bookingId/generate', (req: Request, res: Response) => {
  const { bookingId } = req.params;
  const invoice = inMemoryStore.getInvoice(bookingId);

  if (!invoice) {
    res.status(404).json({
      success: false,
      message: 'Cannot generate bill: booking not found',
      code: 'NOT_FOUND',
    });
    return;
  }

  res.json({
    success: true,
    message: 'Final bill generated successfully with statutory tax cascade',
    data: invoice,
  });
});

/**
 * POST /api/v1/invoices/:bookingId/payments
 * Records a partial deposit or final settlement payment (Rule B12).
 */
router.post('/:bookingId/payments', (req: Request, res: Response) => {
  const { bookingId } = req.params;
  const parsed = RecordPaymentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ success: false, errors: parsed.error.flatten().fieldErrors });
    return;
  }

  try {
    const result = inMemoryStore.addPayment(bookingId, parsed.data);
    res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      data: result,
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      message: err.message || 'Failed to record payment',
      code: 'PAYMENT_FAILED',
    });
  }
});

export default router;
