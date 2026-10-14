import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { db } from '../config/db';
import { TaxRepository } from '../repositories/tax.repository';
import { ResponseFactory } from '../lib/response';
import { Errors } from '../lib/errors';

const router = Router();
const repo = new TaxRepository(db);

router.use(authenticate);

const CreateTaxSchema = z.object({
  taxName:        z.string().min(1).max(100).optional(),
  tax_name:       z.string().min(1).max(100).optional(),
  taxPercentage:  z.coerce.number().positive().optional(),
  tax_percentage: z.coerce.number().positive().optional(),
  isActive:       z.boolean().optional(),
  is_active:      z.boolean().optional(),
  effectiveFrom:  z.string().min(1).optional(),
  effective_from: z.string().min(1).optional(),
  effectiveTo:    z.string().nullable().optional(),
  effective_to:   z.string().nullable().optional(),
}).refine(d => (d.taxName ?? d.tax_name) !== undefined, {
  message: 'Tax name is required',
  path: ['taxName'],
}).refine(d => (d.taxPercentage ?? d.tax_percentage) !== undefined, {
  message: 'Tax percentage is required',
  path: ['taxPercentage'],
}).refine(d => (d.effectiveFrom ?? d.effective_from) !== undefined, {
  message: 'Effective from date is required',
  path: ['effectiveFrom'],
});

const UpdateTaxSchema = z.object({
  taxPercentage:  z.coerce.number().positive().optional(),
  tax_percentage: z.coerce.number().positive().optional(),
  isActive:       z.boolean().optional(),
  is_active:      z.boolean().optional(),
  effectiveTo:    z.string().nullable().optional(),
  effective_to:   z.string().nullable().optional(),
});

// GET /api/v1/taxes - List all statutory taxes
router.get('/', async (req: Request, res: Response) => {
  const onlyActive = req.query.active === 'true';
  const taxes = onlyActive ? await repo.findActive() : await repo.findAll();
  res.status(200).json(ResponseFactory.ok(taxes));
});

// GET /api/v1/taxes/:id
router.get('/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) throw Errors.badRequest('Invalid tax ID');
  const tax = await repo.findById(id);
  if (!tax) throw Errors.notFound('Tax configuration');
  res.status(200).json(ResponseFactory.ok(tax));
});

// POST /api/v1/taxes - Schedule future tax rate
router.post(
  '/',
  authorize('ADMINISTRATOR', 'DBA'),
  async (req: Request, res: Response) => {
    const parsed = CreateTaxSchema.parse(req.body);
    const taxName = (parsed.taxName ?? parsed.tax_name)!;
    const taxPercentage = (parsed.taxPercentage ?? parsed.tax_percentage)!;
    const effectiveFrom = (parsed.effectiveFrom ?? parsed.effective_from)!;
    const effectiveTo = parsed.effectiveTo !== undefined ? parsed.effectiveTo : (parsed.effective_to ?? null);
    const isActive = parsed.isActive ?? parsed.is_active ?? true;

    const created = await repo.create({
      tax_name: taxName,
      tax_percentage: taxPercentage,
      effective_from: effectiveFrom,
      effective_to: effectiveTo,
      is_active: isActive,
    });

    res.status(201).json(ResponseFactory.created(created, 'Tax rate scheduled successfully'));
  },
);

// PATCH /api/v1/taxes/:id - Update rate or validity
router.patch(
  '/:id',
  authorize('ADMINISTRATOR', 'DBA'),
  async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw Errors.badRequest('Invalid tax ID');
    const existing = await repo.findById(id);
    if (!existing) throw Errors.notFound('Tax configuration');

    const parsed = UpdateTaxSchema.parse(req.body);
    const taxPercentage = parsed.taxPercentage ?? parsed.tax_percentage;
    const isActive = parsed.isActive ?? parsed.is_active;
    const effectiveTo = parsed.effectiveTo !== undefined ? parsed.effectiveTo : parsed.effective_to;

    const updated = await repo.update(id, {
      tax_percentage: taxPercentage,
      is_active: isActive,
      effective_to: effectiveTo,
    });

    res.status(200).json(ResponseFactory.ok(updated, 'Tax rate updated successfully'));
  },
);

export default router;
