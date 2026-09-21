import { Router, Request, Response } from 'express'; //mini api framework used to create routes
import { z } from 'zod';  //typescript validation library 
import { validate } from '../middleware/validate.middleware'; //checking the data validity
import { authenticate } from '../middleware/auth.middleware';//checking if user is logged in
import { authorize } from '../middleware/rbac.middleware';//checking if user has permission
import { db } from '../config/db';//database connection class
import { TaxRepository } from '../repositories/tax.repository'; //database communicator class
import { ResponseFactory } from '../lib/response';
import { Errors } from '../lib/errors';  //prebuilt http error exceptions


const router = Router(); //creates the express router
const repo = new TaxRepository(db);  //creates the tax repositary object

//-------------------------Validation schemas--------------------------------------------
//validate tax creation input
const CreateTaxSchema = z.object({
    taxName: z.string().min(1, 'Tax name is required').max(100),
    taxPercentage: z
        .number()
        .min(0, 'Tax percentage cannot be negative')
        .max(1, 'Tax percentage must be a decimal between 0 and 1 (e.g. 0.18 for 18%)'),
    isActive: z.boolean().optional().default(true),
    effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'effectiveFrom must be YYYY-MM-DD'),  //ex:2026-09-21
    effectiveTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'effectiveTo must be YYYY-MM-DD').nullable().optional(),
});

//validate tax update input
const UpdateTaxSchema = z.object({
    taxPercentage: z
        .number()
        .min(0, 'Tax percentage cannot be negative')
        .max(1, 'Tax percentage must be a decimal between 0 and 1 (e.g. 0.18 for 18%)')
        .optional(),
    isActive: z.boolean().optional(),   //optional because we don't need to update everything
    effectiveTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'effectiveTo must be YYYY-MM-DD').nullable().optional(),
});

//--------------------------------------------------------------------------------------------------------------------------


//------------------------Routes--------------------------------------------------------------------------------------------
/*when a GET request comes to this router's / path, execute this function
 Returns all taxes (ordered by tax_id). Accessible to front-desk & management.*/
router.get('/', async (req: Request, res: Response) => {
    const taxes = await repo.findAll();
    res.status(200).json(ResponseFactory.ok(taxes));
});

/**
 * 2. GET /api/v1/tax-configurations/active
 * Returns only currently active statutory taxes for billing (Rule B13).
 * NOTE: Defined BEFORE /:id so Express doesn't mistake 'active' for an ID!
 */
router.get('/active', async (_req: Request, res: Response) => {
    const activeTaxes = await repo.findActive();
    res.status(200).json(ResponseFactory.ok(activeTaxes));
});

/**
 * 3. GET /api/v1/tax-configurations/:id
 * Returns a single tax configuration by its ID.
 */
router.get('/:id', async (req: Request, res: Response) => {
    const taxId = parseInt(req.params.id, 10);
    if (isNaN(taxId)) {
        throw Errors.badRequest('Invalid tax ID — must be an integer');
    }
    const tax = await repo.findById(taxId);
    if (!tax) {
        throw Errors.notFound('Tax configuration');
    }
    res.status(200).json(ResponseFactory.ok(tax));
});




