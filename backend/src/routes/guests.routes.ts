import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.middleware';
import { db } from '../config/db';
import { GuestRepository } from '../repositories/guest.repository';
import { Errors } from '../lib/errors';
import { isUuid } from '../lib/uuid';

// Create one instance of the repository (it holds the db connection)
const router = Router();
const repo = new GuestRepository(db);

router.get('/', async (req: Request, res: Response) => {
    const { search } = req.query;
    const guests = search
        ? await repo.search(String(search))
        : await repo.findAll();

    res.json({ success: true, data: guests })
})

router.get('/:id', async (req: Request, res: Response) => {
    if (!isUuid(req.params.id)) throw Errors.notFound('Guest');
    const guest = await repo.findById(req.params.id);
    if (!guest) throw Errors.notFound('Guest');
    res.json({ success: true, data: guest });
});


const CreateSchema = z.object({
    first_name: z.string().min(1).max(100),
    last_name: z.string().min(1).max(100),
    email: z.string().email().optional(),
    phone: z.string().max(50).optional(),
});

router.post('/', validate(CreateSchema), async (req: Request, res: Response) => {
    const guest = await repo.create(req.body);
    res.status(201).json({ success: true, data: guest });
});

const UpdateSchema = z.object({
    first_name: z.string().min(1).max(100).optional(),
    last_name: z.string().min(1).max(100).optional(),
    email: z.string().email().optional(),
    phone: z.string().max(50).optional(),
});

router.patch('/:id', validate(UpdateSchema), async (req: Request, res: Response) => {
    if (!isUuid(req.params.id)) throw Errors.notFound('Guest');
    const guest = await repo.update(req.params.id, req.body);
    if (!guest) throw Errors.notFound('Guest');
    res.json({ success: true, data: guest });
});

export default router;
