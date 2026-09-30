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
    const taxId = req.params.id;
    const tax = await repo.findById(taxId); //find by id
    if (!tax) {
        throw Errors.notFound('Tax configuration');
    }
    res.status(200).json(ResponseFactory.ok(tax));
});


/**
 * 4. PUT /api/v1/tax-configurations/:id
 * Update tax rate, active flag, or expiration date.
 * Protected: Requires login AND MANAGER, ADMINISTRATOR, or DBA role.
 */


router.put(
    '/:id',
    authenticate, //whether the user is authenticated
    authorize('ADMINISTRATOR', 'MANAGER', 'DBA'),//checking if the authenticated user has permission to update the tax
    validate(UpdateTaxSchema), //validating the input data
    async (req: Request, res: Response) => {
        const taxId = req.params.id;
        const updated = await repo.update(taxId, {
            tax_percentage: req.body.taxPercentage,
            is_active: req.body.isActive,
            effective_to: req.body.effectiveTo,
        });
        if (!updated) {
            throw Errors.notFound('Tax configuration');
        }
        res.status(200).json(ResponseFactory.ok(updated, 'Tax configuration updated successfully'));
    }
);

/**
 * 5. POST /api/v1/tax-configurations
 * Create a new statutory tax rate (Rule B13).
 * Protected: Requires login AND ADMINISTRATOR or DBA role.
 */
//Only administrator and DBA can create new taxes
router.post(
    '/',
    authenticate,
    authorize('ADMINISTRATOR', 'DBA'),
    validate(CreateTaxSchema),
    async (req: Request, res: Response) => {
        const created = await repo.create({
            tax_name: req.body.taxName,
            tax_percentage: req.body.taxPercentage,
            is_active: req.body.isActive,
            effective_from: req.body.effectiveFrom,
            effective_to: req.body.effectiveTo,
        });   //201 is commonly used when new resource has created
        res.status(201).json(ResponseFactory.created(created, 'Tax configuration created successfully'));
    }
);
export default router;


