import bcrypt from 'bcryptjs';
import { UserAccountRepository } from '../repositories/user-account.repository';
import { AuthStrategy } from '../lib/auth/auth.strategy';
import { JwtPayloadBuilder, AccountType } from '../lib/jwt-payload.builder';
import { ResponseFactory } from '../lib/response';
import { Errors } from '../lib/errors';
import { auditEmitter } from '../lib/audit/audit.emitter';

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

// ── GoF: Facade ───────────────────────────────────────────────────────────────
// AuthService is the single entry point for all auth operations.
// Hides: UserAccountRepository (Template Method) + bcrypt + JwtPayloadBuilder
//        (Builder) + AuthStrategy (Strategy) + auditEmitter (Observer).
// Routes call one method — e.g. authService.login(dto) — never touching internals.
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

    auditEmitter.emit('account.created', {
      actorId,
      entityType: 'user_accounts',
      entityId:   userAccountId,
      action:     'INSERT',
      newValue:   { staffId, userAccountId, username: dto.username, role: dto.role },
    });

    return ResponseFactory.created({ staffId, userAccountId, username: dto.username });
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
