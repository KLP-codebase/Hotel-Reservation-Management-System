import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { UserAccountRepository } from '../repositories/user-account.repository';
import { StaffRepository } from '../repositories/staff.repository';
import { AuthStrategy } from '../lib/auth/auth.strategy';
import { JwtPayloadBuilder, AccountType } from '../lib/jwt-payload.builder';
import { ResponseFactory } from '../lib/response';
import { Errors } from '../lib/errors';
import { auditEmitter } from '../lib/audit/audit.emitter';
import { emailService } from './email.service';

export interface LoginDto {
  username: string;
  password: string;
}

export interface RegisterDto {
  branchId?:  string;
  firstName:  string;
  lastName:   string;
  email:      string;
  phone?:     string;
  role:       AccountType;
  username:   string;
  password:   string;
}

export interface AcceptInviteDto {
  token:    string;
  username: string;
  password: string;
}

// ── GoF: Facade ───────────────────────────────────────────────────────────────
// AuthService is the single entry point for all auth operations.
// Hides: UserAccountRepository (Template Method) + bcrypt + JwtPayloadBuilder
//        (Builder) + AuthStrategy (Strategy) + auditEmitter (Observer) + emailService.
export class AuthService {
  constructor(
    private readonly repo: UserAccountRepository,
    private readonly strategy: AuthStrategy,
  ) {}

  async login(dto: LoginDto, ipAddress?: string) {
    // Step 1: find account (Repository / Template Method)
    const account = await this.repo.findByUsername(dto.username);
    if (!account) throw Errors.invalidCreds();

    // Step 2: verify password
    const match = await bcrypt.compare(dto.password, account.password_hash);
    if (!match) throw Errors.invalidCreds();

    // Verification guard (Issue 1 fix: dedicated emailNotVerified factory method)
    if (!account.is_email_verified) {
      throw Errors.emailNotVerified('Please verify your email before logging in. Check your inbox for the verification link.');
    }

    // Step 3: update last_login_at
    await this.repo.updateLastLogin(account.user_account_id);

    // Auto-assign branch for manager if unassigned
    if (account.account_type === 'MANAGER' && !account.branch_id) {
      account.branch_id = 'b2222222-2222-2222-2222-222222222222';
      account.branch_name = 'Sky Nest Galle';
      await this.repo.assignBranchToStaff(account.staff_id, account.branch_id).catch(() => null);
    }

    // Step 4: build JWT payload (Builder)
    const payload = new JwtPayloadBuilder()
      .setSubject(account.user_account_id)
      .setRole(account.account_type)
      .setBranch(account.branch_id ?? null)
      .build();

    // Step 5: sign token (Strategy)
    const token = this.strategy.sign(payload);

    // Step 6: emit audit event (Observer)
    auditEmitter.emit('auth.login', {
      actorId:    account.user_account_id,
      entityType: 'user_accounts',
      entityId:   account.user_account_id,
      action:     'LOGIN',
      ipAddress,
    });

    // Step 7: return response (Factory Method)
    return ResponseFactory.ok({
      token,
      user: {
        id:          account.user_account_id,
        username:    account.username,
        role:        account.account_type,
        firstName:   account.first_name,
        lastName:    account.last_name,
        email:       account.email,
        branchId:    account.branch_id   ?? null,
        branchName:  account.branch_name ?? null,
      },
    });
  }

  async register(dto: RegisterDto, actorId?: string) {
    // GoF Singleton Pattern & Security Hardening:
    // Creation of additional Administrator accounts is strictly prohibited.
    if (dto.role === 'ADMINISTRATOR') {
      throw Errors.forbidden('Forbidden: Additional Administrator accounts cannot be created. The system is configured with a single fixed Administrator account.');
    }

    // Public/unauthenticated registration guard:
    if (!actorId && dto.role !== 'GUEST') {
      throw Errors.forbidden('Forbidden: Creation of Manager or Staff accounts from public registration is not permitted.');
    }

    const hash = await bcrypt.hash(dto.password, 10);

    // Two-step token write approach (Issue 4 confirmed):
    // 1. Create staff + user_accounts record atomically (is_email_verified = FALSE by DEFAULT)
    const { staffId, userAccountId } = await this.repo.createWithStaff(
      dto.branchId ?? null,
      dto.firstName,
      dto.lastName,
      dto.email,
      dto.phone ?? null,
      dto.role,
      dto.username,
      hash,
    );

    // 2. Generate 64-char crypto token (24h expiry) and set on user_accounts
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.repo.setVerificationToken(userAccountId, verificationToken, expiresAt);

    // 3. Dispatch verification email via Resend
    await emailService.sendGuestVerificationEmail({
      to: dto.email,
      firstName: dto.firstName,
      token: verificationToken,
    });

    auditEmitter.emit('account.created', {
      actorId,
      entityType: 'user_accounts',
      entityId:   userAccountId,
      action:     'INSERT',
      newValue:   { staffId, userAccountId, username: dto.username, role: dto.role },
    });

    return ResponseFactory.created({
      staffId,
      userAccountId,
      username: dto.username,
      email: dto.email,
      isEmailVerified: false,
    }, 'Account created successfully. Please check your inbox to verify your email address.');
  }

  async verifyEmail(token: string) {
    if (!token) throw Errors.badRequest('Verification token is required');

    const account = await this.repo.findByVerificationToken(token);
    if (!account) {
      throw Errors.badRequest('Invalid or expired verification link. Please request a new verification email.');
    }

    if (account.verification_token_expires_at && new Date() > new Date(account.verification_token_expires_at)) {
      throw Errors.badRequest('Verification link has expired. Please request a new one.');
    }

    await this.repo.verifyEmail(account.user_account_id);

    auditEmitter.emit('auth.email_verified', {
      actorId:    account.user_account_id,
      entityType: 'user_accounts',
      entityId:   account.user_account_id,
      action:     'UPDATE',
      newValue:   { is_email_verified: true },
    });

    return ResponseFactory.ok({ email: account.email }, 'Email verified successfully. You may now sign in.');
  }

  async resendVerification(email: string) {
    if (!email) throw Errors.badRequest('Email address is required');

    const account = await this.repo.findByEmail(email);
    // Silent success if account does not exist (prevents email harvesting)
    if (!account) {
      return ResponseFactory.ok({}, 'If an account exists with this email, a verification link has been sent.');
    }

    if (account.is_email_verified) {
      return ResponseFactory.ok({}, 'This email address is already verified. You may proceed to sign in.');
    }

    // Rate limiting: 2-minute cooldown
    if (account.last_verification_sent_at) {
      const elapsedSeconds = Math.floor((Date.now() - new Date(account.last_verification_sent_at).getTime()) / 1000);
      if (elapsedSeconds < 120) {
        throw Errors.badRequest(`Please wait ${120 - elapsedSeconds} seconds before requesting another verification email.`);
      }
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.repo.setVerificationToken(account.user_account_id, verificationToken, expiresAt);

    await emailService.sendGuestVerificationEmail({
      to: account.email ?? email,
      firstName: account.first_name ?? 'Guest',
      token: verificationToken,
    });

    return ResponseFactory.ok({}, 'Verification link sent. Please check your inbox.');
  }

  async getInviteInfo(token: string, staffRepo: StaffRepository) {
    if (!token) throw Errors.badRequest('Invitation token is required');

    const staff = await staffRepo.findByInviteToken(token);
    if (!staff) {
      throw Errors.badRequest('Invalid or expired invitation link.');
    }

    if (staff.invite_token_expires_at && new Date() > new Date(staff.invite_token_expires_at)) {
      throw Errors.badRequest('This invitation link has expired. Please contact your administrator.');
    }

    if (staff.user_account_id) {
      throw Errors.badRequest('This invitation has already been accepted.');
    }

    return ResponseFactory.ok({
      staffId:    staff.staff_id,
      firstName:  staff.first_name,
      lastName:   staff.last_name,
      email:      staff.email,
      role:       staff.role,
      branchName: staff.branch_name ?? null,
    });
  }

  async acceptInvite(dto: AcceptInviteDto, staffRepo: StaffRepository) {
    if (!dto.token) throw Errors.badRequest('Invitation token is required');
    if (!dto.username || dto.username.length < 3) throw Errors.badRequest('Username must be at least 3 characters');
    if (!dto.password || dto.password.length < 8) throw Errors.badRequest('Password must be at least 8 characters');

    const staff = await staffRepo.findByInviteToken(dto.token);
    if (!staff) {
      throw Errors.badRequest('Invalid or expired invitation link.');
    }

    if (staff.invite_token_expires_at && new Date() > new Date(staff.invite_token_expires_at)) {
      throw Errors.badRequest('This invitation link has expired. Please contact your administrator.');
    }

    if (staff.user_account_id) {
      throw Errors.badRequest('This invitation has already been accepted.');
    }

    const existingUser = await this.repo.findByUsername(dto.username);
    if (existingUser) {
      throw Errors.conflict('Username is already taken. Please choose another username.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const { rows } = await (this.repo as any).db.query(
      `INSERT INTO user_accounts (staff_id, username, password_hash, account_type, is_email_verified)
       VALUES ($1, $2, $3, $4, true)
       RETURNING user_account_id`,
      [staff.staff_id, dto.username, passwordHash, staff.role],
    );

    const userAccountId = rows[0]?.user_account_id;
    await staffRepo.clearInviteToken(staff.staff_id);

    auditEmitter.emit('account.created', {
      actorId: userAccountId,
      entityType: 'user_accounts',
      entityId: userAccountId,
      action: 'INSERT',
      newValue: { staffId: staff.staff_id, username: dto.username, role: staff.role },
    });

    return ResponseFactory.ok({
      username: dto.username,
      staffId: staff.staff_id,
    }, 'Account activated successfully. You can now sign in with your credentials.');
  }

  async me(userAccountId: string) {
    const account = await this.repo.findById(userAccountId);
    if (!account) throw Errors.notFound('User');

    // Auto-assign branch for manager if unassigned
    if (account.account_type === 'MANAGER' && !account.branch_id) {
      account.branch_id = 'b2222222-2222-2222-2222-222222222222';
      account.branch_name = 'Sky Nest Galle';
      await this.repo.assignBranchToStaff(account.staff_id, account.branch_id).catch(() => null);
    }

    return ResponseFactory.ok({
      id:         account.user_account_id,
      username:   account.username,
      role:       account.account_type,
      firstName:  account.first_name,
      lastName:   account.last_name,
      email:      account.email,
      branchId:   account.branch_id   ?? null,
      branchName: account.branch_name ?? null,
    });
  }
}
