import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { db } from '../config/db';
import { StaffRepository } from '../repositories/staff.repository';
import { StaffService } from '../services/staff.service';
import { ownBranch, assertOwnBranch } from '../lib/branch-scope';
import { Errors } from '../lib/errors';

// Roles a manager may hire into their own branch; everything else needs an administrator.
const MANAGER_HIRABLE_ROLES = ['RECEPTIONIST', 'SERVICE_STAFF'];

const router  = Router();
const repo    = new StaffRepository(db);
const service = new StaffService(repo);

// Single-branch staff may only look at or invite staff of their own branch.
async function assertOwnsStaff(req: Request, staffId: string): Promise<void> {
  if (!ownBranch(req)) return;
  const staff = await repo.findById(staffId);
  if (staff) assertOwnBranch(req, staff.branch_id);
}

// ── Zod schemas ───────────────────────────────────────────────────────────────
const CreateStaffSchema = z.object({
  branchId:  z.string().uuid().optional().nullable().or(z.literal('')),
  firstName: z.string().min(1).max(100),
  lastName:  z.string().min(1).max(100),
  email:     z.string().email(),
  phone:     z.string().max(50).optional(),
  role:      z.enum(['GUEST','RECEPTIONIST','SERVICE_STAFF','MANAGER','ADMINISTRATOR','DBA']),
});

const UpdateStaffSchema = z.object({
  branchId:  z.string().uuid().optional().nullable().or(z.literal('')),
  firstName: z.string().min(1).max(100).optional(),
  lastName:  z.string().min(1).max(100).optional(),
  phone:     z.string().max(50).optional(),
  role:      z.enum(['GUEST','RECEPTIONIST','SERVICE_STAFF','MANAGER','ADMINISTRATOR','DBA']).optional(),
});

// ── Routes ────────────────────────────────────────────────────────────────────
// Chain of Responsibility: validate → authenticate → authorize → handler

router.get(
  '/',
  authenticate,
  authorize('MANAGER', 'ADMINISTRATOR', 'DBA'),
  async (req: Request, res: Response) => {
    const result = await service.list(ownBranch(req));
    res.status(200).json(result);
  },
);

router.get(
  '/:id',
  authenticate,
  authorize('MANAGER', 'ADMINISTRATOR', 'DBA'),
  async (req: Request, res: Response) => {
    await assertOwnsStaff(req, req.params.id);
    const result = await service.getById(req.params.id);
    res.status(200).json(result);
  },
);

router.post(
  '/',
  validate(CreateStaffSchema),
  authenticate,
  authorize('ADMINISTRATOR', 'DBA', 'MANAGER'),
  async (req: Request, res: Response) => {
    // A manager adds front desk and service staff to their own branch only.
    const own = ownBranch(req);
    if (own && !MANAGER_HIRABLE_ROLES.includes(req.body.role)) {
      throw Errors.forbidden('Managers can only add receptionists and service staff');
    }
    const result = await service.create(
      { branch_id: own ?? (req.body.branchId || undefined), first_name: req.body.firstName, last_name: req.body.lastName,
        email: req.body.email, phone: req.body.phone, role: req.body.role },
      req.user?.sub,
    );
    res.status(201).json(result);
  },
);

router.patch(
  '/:id',
  validate(UpdateStaffSchema),
  authenticate,
  authorize('ADMINISTRATOR', 'DBA'),
  async (req: Request, res: Response) => {
    const result = await service.update(
      req.params.id,
      { branch_id: (req.body.branchId || undefined), first_name: req.body.firstName, last_name: req.body.lastName,
        phone: req.body.phone, role: req.body.role },
      req.user?.sub,
    );
    res.status(200).json(result);
  },
);

router.delete(
  '/:id',
  authenticate,
  authorize('ADMINISTRATOR', 'DBA'),
  async (req: Request, res: Response) => {
    const result = await service.deactivate(req.params.id, req.user?.sub);
    res.status(200).json(result);
  },
);

router.post(
  "/:id/invite",
  authenticate,
  authorize("ADMINISTRATOR", "MANAGER", "DBA"),
  async (req: Request, res: Response) => {
    await assertOwnsStaff(req, req.params.id);
    const result = await service.invite(req.params.id, req.user?.sub);
    res.status(200).json(result);
  },
);

export default router;
