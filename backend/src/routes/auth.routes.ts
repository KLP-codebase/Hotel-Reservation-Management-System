import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { db } from '../config/db';
import { authStrategy } from '../lib/auth/auth.strategy';
import { AuthService } from '../services/auth.service';
import { UserAccountRepository } from '../repositories/user-account.repository';
import { StaffRepository } from '../repositories/staff.repository';
import { Errors } from '../lib/errors';

const router = Router();
const repo = new UserAccountRepository(db);
const staffRepo = new StaffRepository(db);
const service = new AuthService(repo, authStrategy);

// ── Zod schemas ───────────────────────────────────────────────────────────────
const LoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const RegisterSchema = z.object({
  branchId:  z.string().uuid().optional(),
  firstName: z.string().min(1).max(100),
  lastName:  z.string().min(1).max(100),
  email:     z.string().email(),
  phone:     z.string().max(50).optional(),
  role:      z.enum(['GUEST','RECEPTIONIST','SERVICE_STAFF','MANAGER','ADMINISTRATOR','DBA']).optional().default('GUEST'),
  username:  z.string().min(3).max(100),
  password:  z.string().min(8),
});

const VerifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

const ResendVerificationSchema = z.object({
  email: z.string().email('Valid email is required'),
});

const AcceptInviteSchema = z.object({
  token:    z.string().min(1, 'Invitation token is required'),
  username: z.string().min(3, 'Username must be at least 3 characters').max(100),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

// ── Routes ────────────────────────────────────────────────────────────────────

router.post('/login', validate(LoginSchema), async (req: Request, res: Response) => {
  const ip = req.ip ?? req.socket.remoteAddress;
  const result = await service.login(req.body, ip);
  res.status(200).json(result);
});

router.post('/register', validate(RegisterSchema), async (req: Request, res: Response) => {
  // Public registration security: only GUEST account creation is permitted.
  const requestedRole = req.body.role;
  if (requestedRole && requestedRole !== 'GUEST') {
    return res.status(403).json({
      success: false,
      message: `Public registration for role '${requestedRole}' is prohibited. Only Guest accounts can be created via public sign-up.`,
      code: 'FORBIDDEN',
    });
  }

  req.body.role = 'GUEST';
  const result = await service.register(req.body, req.user?.sub);
  res.status(201).json(result);
});

router.post('/verify-email', validate(VerifyEmailSchema), async (req: Request, res: Response) => {
  const result = await service.verifyEmail(req.body.token);
  res.status(200).json(result);
});

router.post('/resend-verification', validate(ResendVerificationSchema), async (req: Request, res: Response) => {
  const result = await service.resendVerification(req.body.email);
  res.status(200).json(result);
});

router.get('/invite-info', async (req: Request, res: Response) => {
  const token = req.query.token as string;
  if (!token) throw Errors.badRequest('Token query parameter is required');
  const result = await service.getInviteInfo(token, staffRepo);
  res.status(200).json(result);
});

router.post('/accept-invite', validate(AcceptInviteSchema), async (req: Request, res: Response) => {
  const result = await service.acceptInvite(req.body, staffRepo);
  res.status(200).json(result);
});

router.post('/logout', authenticate, (req: Request, res: Response) => {
  res.clearCookie('sn_token');
  res.status(200).json({ success: true, message: 'Logged out — clear your token.' });
});

router.get('/me', authenticate, async (req: Request, res: Response) => {
  const result = await service.me(req.user!.sub);
  res.status(200).json(result);
});

export default router;
