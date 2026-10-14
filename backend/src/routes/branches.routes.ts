import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { db } from '../config/db';
import { BranchRepository } from '../repositories/branch.repository';
import { ResponseFactory } from '../lib/response';
import { Errors } from '../lib/errors';

const router = Router();
const repo   = new BranchRepository(db);

// ── Zod schemas ───────────────────────────────────────────────────────────────
const CreateBranchSchema = z.object({
  branchName:  z.string().min(1).max(100).optional(),
  branch_name: z.string().min(1).max(100).optional(),
  city:        z.string().min(1).max(100),
  address:     z.string().max(500).optional(),
  phone:       z.string().max(50).optional(),
  email:       z.string().email().optional(),
}).refine(d => (d.branchName ?? d.branch_name) !== undefined, {
  message: 'Branch name is required',
  path: ['branchName'],
});

const UpdateBranchSchema = z.object({
  branchName:  z.string().min(1).max(100).optional(),
  branch_name: z.string().min(1).max(100).optional(),
  city:        z.string().min(1).max(100).optional(),
  address:     z.string().max(500).optional(),
  phone:       z.string().max(50).optional(),
  email:       z.string().email().optional(),
  isActive:    z.boolean().optional(),
  is_active:   z.boolean().optional(),
});

// ── Routes ────────────────────────────────────────────────────────────────────

// Public — frontend needs branch list for dropdowns (support ?include_inactive=true)
router.get('/', async (req: Request, res: Response) => {
  const includeInactive = req.query.include_inactive === 'true' || req.query.all === 'true';
  const branches = includeInactive ? await repo.findAllIncludingInactive() : await repo.findAll();
  res.status(200).json(ResponseFactory.ok(branches));
});

router.get('/:id', async (req: Request, res: Response) => {
  const branch = await repo.findById(req.params.id);
  if (!branch) throw Errors.notFound('Branch');
  res.status(200).json(ResponseFactory.ok(branch));
});

router.post(
  '/',
  validate(CreateBranchSchema),
  authenticate,
  authorize('ADMINISTRATOR', 'DBA'),
  async (req: Request, res: Response) => {
    const branchName = (req.body.branchName ?? req.body.branch_name)!;
    const branch = await repo.create({
      branch_name: branchName,
      city:        req.body.city,
      address:     req.body.address,
      phone:       req.body.phone,
      email:       req.body.email,
    });
    res.status(201).json(ResponseFactory.created(branch, 'Branch created'));
  },
);

router.patch(
  '/:id',
  validate(UpdateBranchSchema),
  authenticate,
  authorize('ADMINISTRATOR', 'DBA'),
  async (req: Request, res: Response) => {
    const existing = await repo.findById(req.params.id);
    if (!existing) throw Errors.notFound('Branch');

    const branchName = req.body.branchName ?? req.body.branch_name;
    const isActive = req.body.isActive ?? req.body.is_active;

    const updated = await repo.update(req.params.id, {
      branch_name: branchName,
      city:        req.body.city,
      address:     req.body.address,
      phone:       req.body.phone,
      email:       req.body.email,
      is_active:   isActive,
    });
    res.status(200).json(ResponseFactory.ok(updated, 'Branch updated'));
  },
);

router.delete(
  '/:id',
  authenticate,
  authorize('ADMINISTRATOR', 'DBA'),
  async (req: Request, res: Response) => {
    const existing = await repo.findById(req.params.id);
    if (!existing) throw Errors.notFound('Branch');
    await repo.softDelete(req.params.id);
    res.status(200).json(ResponseFactory.ok({ branchId: req.params.id }, 'Branch deactivated'));
  },
);

export default router;
