import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { db } from '../config/db';
import { RoomRepository, RoomStatus } from '../repositories/room.repository';
import { ResponseFactory } from '../lib/response';
import { Errors } from '../lib/errors';

const router = Router();
const repo = new RoomRepository(db);

const RoomStatusSchema = z.enum([
  'AVAILABLE',
  'OCCUPIED',
  'MAINTENANCE',
  'OUT_OF_SERVICE',
]);

const CreateRoomSchema = z.object({
  branchId: z.coerce.number().int().positive().optional(),
  branch_id: z.coerce.number().int().positive().optional(),
  roomTypeId: z.coerce.number().int().positive().optional(),
  room_type_id: z.coerce.number().int().positive().optional(),
  roomNumber: z.string().min(1).max(20).optional(),
  room_number: z.string().min(1).max(20).optional(),
  floor: z.coerce.number().int().optional(),
  status: RoomStatusSchema.optional(),
}).refine(d => (d.branchId ?? d.branch_id) !== undefined, {
  message: 'Branch is required',
  path: ['branchId'],
}).refine(d => (d.roomTypeId ?? d.room_type_id) !== undefined, {
  message: 'Room type is required',
  path: ['roomTypeId'],
}).refine(d => (d.roomNumber ?? d.room_number) !== undefined, {
  message: 'Room number is required',
  path: ['roomNumber'],
});

const UpdateRoomSchema = z.object({
  branchId: z.coerce.number().int().positive().optional(),
  branch_id: z.coerce.number().int().positive().optional(),
  roomTypeId: z.coerce.number().int().positive().optional(),
  room_type_id: z.coerce.number().int().positive().optional(),
  roomNumber: z.string().min(1).max(20).optional(),
  room_number: z.string().min(1).max(20).optional(),
  floor: z.coerce.number().int().optional(),
  status: RoomStatusSchema.optional(),
  isActive: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

const UpdateRoomStatusSchema = z.object({
  status: RoomStatusSchema,
});

// GET /rooms/stats/counts-by-type
router.get('/stats/counts-by-type', async (_req: Request, res: Response) => {
  const counts = await repo.getRoomCountsByRoomType();
  res.status(200).json(ResponseFactory.ok(counts));
});

// GET /rooms
router.get('/', async (req: Request, res: Response) => {
  const branchId =
    typeof req.query.branch_id === 'string' && req.query.branch_id !== 'ALL' && req.query.branch_id.trim() !== ''
      ? req.query.branch_id
      : undefined;

  const roomTypeId =
    typeof req.query.room_type_id === 'string' && req.query.room_type_id !== 'ALL' && req.query.room_type_id.trim() !== ''
      ? req.query.room_type_id
      : undefined;

  const status =
    typeof req.query.status === 'string' && req.query.status !== 'ALL' && req.query.status.trim() !== ''
      ? req.query.status
      : undefined;

  const isActive =
    typeof req.query.is_active === 'string'
      ? req.query.is_active === 'true'
      : undefined;

  if (
    status !== undefined &&
    !RoomStatusSchema.safeParse(status).success
  ) {
    throw Errors.badRequest('Invalid room status');
  }

  const rooms = await repo.findFiltered({
    branch_id: branchId,
    room_type_id: roomTypeId,
    status: status as RoomStatus | undefined,
    is_active: isActive,
  });

  res.status(200).json(ResponseFactory.ok(rooms));
});

// GET /rooms/:id
router.get('/:id', async (req: Request, res: Response) => {
  const room = await repo.findById(req.params.id);

  if (!room) {
    throw Errors.notFound('Room');
  }

  res.status(200).json(ResponseFactory.ok(room));
});

// POST /rooms
router.post(
  '/',
  validate(CreateRoomSchema),
  authenticate,
  authorize('ADMINISTRATOR', 'DBA', 'MANAGER'),
  async (req: Request, res: Response) => {
    const branchId = (req.body.branchId ?? req.body.branch_id)!;
    const roomTypeId = (req.body.roomTypeId ?? req.body.room_type_id)!;
    const roomNumber = (req.body.roomNumber ?? req.body.room_number)!;

    const room = await repo.create({
      branch_id: branchId,
      room_type_id: roomTypeId,
      room_number: roomNumber,
      floor: req.body.floor,
      status: req.body.status,
    });

    res
      .status(201)
      .json(ResponseFactory.created(room, 'Room created'));
  },
);

// PATCH /rooms/:id
router.patch(
  '/:id',
  validate(UpdateRoomSchema),
  authenticate,
  authorize('ADMINISTRATOR', 'DBA', 'MANAGER'),
  async (req: Request, res: Response) => {
    const existing = await repo.findById(req.params.id);

    if (!existing) {
      throw Errors.notFound('Room');
    }

    const branchId = req.body.branchId ?? req.body.branch_id;
    const roomTypeId = req.body.roomTypeId ?? req.body.room_type_id;
    const roomNumber = req.body.roomNumber ?? req.body.room_number;
    const isActive = req.body.isActive ?? req.body.is_active;

    const updated = await repo.update(req.params.id, {
      branch_id: branchId,
      room_type_id: roomTypeId,
      room_number: roomNumber,
      floor: req.body.floor,
      status: req.body.status,
      is_active: isActive,
    });

    res
      .status(200)
      .json(ResponseFactory.ok(updated, 'Room updated'));
  },
);

// PATCH /rooms/:id/status
router.patch(
  '/:id/status',
  validate(UpdateRoomStatusSchema),
  authenticate,
  authorize(
    'ADMINISTRATOR',
    'DBA',
    'MANAGER',
    'RECEPTIONIST',
  ),
  async (req: Request, res: Response) => {
    const existing = await repo.findById(req.params.id);

    if (!existing) {
      throw Errors.notFound('Room');
    }

    const updated = await repo.updateStatus(
      req.params.id,
      req.body.status,
    );

    res
      .status(200)
      .json(ResponseFactory.ok(updated, 'Room status updated'));
  },
);

// DELETE /rooms/:id
router.delete(
  '/:id',
  authenticate,
  authorize('ADMINISTRATOR', 'DBA', 'MANAGER'),
  async (req: Request, res: Response) => {
    const existing = await repo.findById(req.params.id);

    if (!existing) {
      throw Errors.notFound('Room');
    }

    await repo.softDelete(req.params.id);

    res
      .status(200)
      .json(ResponseFactory.ok(null, 'Room deactivated'));
  },
);

export default router;