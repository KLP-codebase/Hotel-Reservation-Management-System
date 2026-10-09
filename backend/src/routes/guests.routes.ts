import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { db } from '../config/db';
import { GuestRepository } from '../repositories/guest.repository';
import { Errors } from '../lib/errors';
import { isUuid } from '../lib/uuid';

// Create one instance of the repository (it holds the db connection)
const router = Router();
const repo = new GuestRepository(db);

// Front-desk and management roles; everything except POST / requires one of these.
const staffOnly = [authenticate, authorize('RECEPTIONIST', 'MANAGER', 'ADMINISTRATOR', 'DBA')];

router.get('/', ...staffOnly, async (req: Request, res: Response) => {
    const { search } = req.query;
    const guests = search
        ? await repo.search(String(search))
        : await repo.findAll();

    res.json({ success: true, data: guests })
})

router.get('/:id', ...staffOnly, async (req: Request, res: Response) => {
    if (!isUuid(req.params.id)) throw Errors.notFound('Guest');
    const guest = await repo.findById(req.params.id);
    if (!guest) throw Errors.notFound('Guest');
    res.json({ success: true, data: guest });
});


// email is required: guests.email is NOT NULL and is how returning guests are matched.
const CreateSchema = z.object({
    first_name: z.string().min(1).max(100),
    last_name: z.string().min(1).max(100),
    email: z.string().email(),
    phone: z.string().max(50).optional(),
});

// Public — used by the website booking flow. Finds the guest by email or creates one.
// A returning guest gets 200 with ids only; a new guest gets 201 with the created row.
router.post('/', validate(CreateSchema), async (req: Request, res: Response) => {
    const { created, guest } = await repo.findOrCreateByEmail(req.body);
    res.status(created ? 201 : 200).json({ success: true, data: guest });
});

const UpdateSchema = z.object({
    first_name: z.string().min(1).max(100).optional(),
    last_name: z.string().min(1).max(100).optional(),
    email: z.string().email().optional(),
    phone: z.string().max(50).optional(),
});

router.patch('/:id', ...staffOnly, validate(UpdateSchema), async (req: Request, res: Response) => {
    if (!isUuid(req.params.id)) throw Errors.notFound('Guest');
    const guest = await repo.update(req.params.id, req.body);
    if (!guest) throw Errors.notFound('Guest');
    res.json({ success: true, data: guest });
});

export default router;
