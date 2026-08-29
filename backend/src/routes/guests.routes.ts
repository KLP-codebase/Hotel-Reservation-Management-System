import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.middleware';
import { db } from '../config/db';
import { GuestRepository } from '../repositories/guest.repository';
import { Errors } from '../lib/errors';

// Create one instance of the repository (it holds the db connection)
const router = Router();
const repo = new GuestRepository(db);
