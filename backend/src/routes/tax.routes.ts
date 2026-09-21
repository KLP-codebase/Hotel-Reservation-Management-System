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

const UpdateTaxSchema = z.object({
    taxPercentage: z
        .number()
        .min(0, 'Tax percentage cannot be negative')
        .max(1, 'Tax percentage must be a decimal between 0 and 1 (e.g. 0.18 for 18%)')
        .optional(),
    isActive: z.boolean().optional(),   //optional because we don't need to update everything
    effectiveTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'effectiveTo must be YYYY-MM-DD').nullable().optional(),
});

