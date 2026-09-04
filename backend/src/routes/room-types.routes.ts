import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { db } from '../config/db';
import { RoomTypeRepository } from '../repositories/room-type.repository';
import { ResponseFactory } from '../lib/response';
import { Errors } from '../lib/errors';

const router = Router();
const repo = new RoomTypeRepository(db);

// Validation schemas

const CreateRoomTypeSchema = z.object({
  typeName: z.string().min(1).max(100),
  baseDailyRate: z.number().positive(),
  capacity: z.number().int().positive(),
  description: z.string().max(2000).optional(),
});

const UpdateRoomTypeSchema = z.object({
  typeName: z.string().min(1).max(100).optional(),
  baseDailyRate: z.number().positive().optional(),
  capacity: z.number().int().positive().optional(),
  description: z.string().max(2000).optional(),
});

// Get all room types
router.get('/', async (_req: Request, res: Response) => {
  const roomTypes = await repo.findAll();
  res.status(200).json(ResponseFactory.ok(roomTypes));
});

// Get room type by ID
router.get('/:id', async (req: Request, res: Response) => {
  const roomType = await repo.findById(req.params.id);

  if (!roomType) {
    throw Errors.notFound('Room type');
  }

  res.status(200).json(ResponseFactory.ok(roomType));
});

// Create room type
router.post(
  '/',
  validate(CreateRoomTypeSchema),
  authenticate,
  authorize('ADMINISTRATOR', 'DBA'),
  async (req: Request, res: Response) => {
    const roomType = await repo.create({
      type_name: req.body.typeName,
      base_daily_rate: req.body.baseDailyRate,
      capacity: req.body.capacity,
      description: req.body.description,
    });

    res
      .status(201)
      .json(ResponseFactory.created(roomType, 'Room type created'));
  },
);

// Update room type
router.patch(
  '/:id',
  validate(UpdateRoomTypeSchema),
  authenticate,
  authorize('ADMINISTRATOR', 'DBA'),
  async (req: Request, res: Response) => {
    const existing = await repo.findById(req.params.id);

    if (!existing) {
      throw Errors.notFound('Room type');
    }

    const updated = await repo.update(req.params.id, {
      type_name: req.body.typeName,
      base_daily_rate: req.body.baseDailyRate,
      capacity: req.body.capacity,
      description: req.body.description,
    });

    res
      .status(200)
      .json(ResponseFactory.ok(updated, 'Room type updated'));
  },
);

export default router;