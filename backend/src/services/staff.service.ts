import crypto from 'crypto';
import { StaffRepository, CreateStaffDto, UpdateStaffDto } from '../repositories/staff.repository';
import { ResponseFactory } from '../lib/response';
import { Errors } from '../lib/errors';
import { auditEmitter } from '../lib/audit/audit.emitter';
import { emailService } from './email.service';

export class StaffService {
  constructor(private readonly repo: StaffRepository) {}

  async list() {
    const staff = await this.repo.findAll();
    return ResponseFactory.ok(staff);
  }

  async getById(staffId: string) {
    const staff = await this.repo.findById(staffId);
    if (!staff) throw Errors.notFound('Staff member');
    return ResponseFactory.ok(staff);
  }

  async create(dto: CreateStaffDto, actorId?: string) {
    if (dto.role === 'ADMINISTRATOR') {
      throw Errors.forbidden('Forbidden: Creation of additional Administrator accounts is strictly prohibited.');
    }

    const existing = await this.repo.findByEmail(dto.email);
    if (existing) throw Errors.conflict('A staff member with this email already exists');

    const staff = await this.repo.create(dto);

    // Generate 48-hour invite token and dispatch onboarding email
    const inviteToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    await this.repo.setInviteToken(staff.staff_id, inviteToken, expiresAt);

    await emailService.sendStaffInvitationEmail({
      to: staff.email,
      firstName: staff.first_name,
      role: staff.role,
      branchName: (staff as any).branch_name,
      token: inviteToken,
    });

    auditEmitter.emit('staff.created', {
      actorId,
      entityType: 'staff',
      entityId:   staff.staff_id,
      action:     'INSERT',
      newValue:   staff,
    });

    return ResponseFactory.created(staff, 'Staff member created and invitation sent');
  }

  async invite(staffId: string, actorId?: string) {
    const staff = await this.repo.findById(staffId);
    if (!staff) throw Errors.notFound('Staff member');

    // Check if staff already has active user account
    const { rows } = await (this.repo as any).db.query(
      `SELECT user_account_id FROM user_accounts WHERE staff_id = $1 AND is_active = true`,
      [staffId],
    );
    if (rows.length > 0) {
      throw Errors.conflict('This staff member already has an active user account.');
    }

    const inviteToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    await this.repo.setInviteToken(staffId, inviteToken, expiresAt);

    await emailService.sendStaffInvitationEmail({
      to: staff.email,
      firstName: staff.first_name,
      role: staff.role,
      branchName: (staff as any).branch_name,
      token: inviteToken,
    });

    auditEmitter.emit('staff.updated', {
      actorId,
      entityType: 'staff',
      entityId:   staffId,
      action:     'UPDATE',
      newValue:   { invite_sent: true },
    });

    return ResponseFactory.ok({ staffId: staff.staff_id }, 'Staff invitation dispatched successfully');
  }

  async update(staffId: string, dto: UpdateStaffDto, actorId?: string) {
    const existing = await this.repo.findById(staffId);
    if (!existing) throw Errors.notFound('Staff member');

    if (existing.role === 'ADMINISTRATOR' && dto.role && dto.role !== 'ADMINISTRATOR') {
      throw Errors.forbidden('Forbidden: The role of the fixed Administrator account cannot be modified.');
    }

    const updated = await this.repo.update(staffId, dto);

    auditEmitter.emit('staff.updated', {
      actorId,
      entityType: 'staff',
      entityId:   staffId,
      action:     'UPDATE',
      oldValue:   existing,
      newValue:   updated,
    });

    return ResponseFactory.ok(updated, 'Staff member updated');
  }

  async deactivate(staffId: string, actorId?: string) {
    const existing = await this.repo.findById(staffId);
    if (!existing) throw Errors.notFound('Staff member');

    if (existing.role === 'ADMINISTRATOR') {
      throw Errors.forbidden('Forbidden: The single Administrator account cannot be deactivated or deleted.');
    }

    await this.repo.softDelete(staffId);

    auditEmitter.emit('staff.deactivated', {
      actorId,
      entityType: 'staff',
      entityId:   staffId,
      action:     'DELETE',
      oldValue:   existing,
    });

    return ResponseFactory.ok({ staffId }, 'Staff member deactivated');
  }
}
