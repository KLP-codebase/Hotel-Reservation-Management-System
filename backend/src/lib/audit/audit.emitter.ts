import { EventEmitter } from 'events';
import { db } from '../../config/db';

// ── GoF: Observer (Application Tier — Tier 2) ────────────────────────────────
// auditEmitter is the Subject in the Observer pattern.
// Controllers/services emit domain events without knowing who is listening.
// Listeners registered at startup write enriched audit records to audit_logs.
//
// This is architecturally distinct from change_log (Observer Tier 1):
//   - audit_logs  → application-level events (actor, IP, HTTP context)
//   - change_log  → database-level row diffs (fired by PostgreSQL triggers)
//
// Extending: to add email notifications or webhooks, add a new listener here.
// Never touch the emitting service to extend audit behaviour.
//
// Covered domain events:
//   staff.*       — staff CRUD (existing)
//   auth.*        — login / logout (existing)
//   booking.*     — reservation lifecycle
//   room.*        — room occupancy transitions
//   guest.*       — guest profile changes
//   service.*     — service usage recorded
//   invoice.*     — final bill generation
//   payment.*     — payment received

export interface AuditEvent {
  actorId?:    string;
  entityType:  string;
  entityId:    string;
  action:      string;
  oldValue?:   unknown;
  newValue?:   unknown;
  ipAddress?:  string;
}

class AuditEventEmitter extends EventEmitter {}
export const auditEmitter = new AuditEventEmitter();

// ── Listener: write audit record to DB (raw SQL) ──────────────────────────────
async function writeAuditRecord(event: AuditEvent): Promise<void> {
  try {
    await db.query(
      `INSERT INTO audit_logs
         (actor_id, entity_type, entity_id, action, old_value, new_value, ip_address)
       VALUES ($1, $2, $3::uuid, $4, $5, $6, $7)`,
      [
        event.actorId   ?? null,
        event.entityType,
        event.entityId,
        event.action,
        event.oldValue  ? JSON.stringify(event.oldValue)  : null,
        event.newValue  ? JSON.stringify(event.newValue)  : null,
        event.ipAddress ?? null,
      ],
    );
  } catch (err) {
    // Audit failure must never crash the main request
    console.error('[audit] Failed to write audit record:', err);
  }
}

// ── Register listeners (called once in server.ts) ─────────────────────────────
export function registerAuditListeners(): void {
  // ── Existing: Staff domain ───────────────────────────────────────────────
  auditEmitter.on('staff.created',       writeAuditRecord);
  auditEmitter.on('staff.updated',       writeAuditRecord);
  auditEmitter.on('staff.deactivated',   writeAuditRecord);
  auditEmitter.on('account.created',     writeAuditRecord);
  auditEmitter.on('account.deactivated', writeAuditRecord);

  // ── Existing: Auth domain ────────────────────────────────────────────────
  auditEmitter.on('auth.login',          writeAuditRecord);
  auditEmitter.on('auth.logout',         writeAuditRecord);

  // ── New: Booking lifecycle ────────────────────────────────────────────────
  // Emitted by bookings.routes.ts after successful DB operations
  auditEmitter.on('booking.created',        writeAuditRecord); // POST /api/v1/bookings
  auditEmitter.on('booking.status_changed', writeAuditRecord); // PATCH /api/v1/bookings/:id/status
  auditEmitter.on('booking.cancelled',      writeAuditRecord); // status → CANCELLED
  auditEmitter.on('booking.room_added',     writeAuditRecord); // POST /api/v1/bookings/:id/rooms

  // ── New: Room occupancy transitions ──────────────────────────────────────
  // Emitted by booking-rooms.routes.ts on status change
  auditEmitter.on('room.checked_in',    writeAuditRecord);
  auditEmitter.on('room.checked_out',   writeAuditRecord);
  auditEmitter.on('room.cancelled',     writeAuditRecord);

  // ── New: Guest domain ────────────────────────────────────────────────────
  // Emitted by guests.routes.ts
  auditEmitter.on('guest.created',      writeAuditRecord);
  auditEmitter.on('guest.updated',      writeAuditRecord);

  // ── New: Service domain ──────────────────────────────────────────────────
  // Emitted when a service_usage record is inserted
  auditEmitter.on('service.consumed',   writeAuditRecord);

  // ── New: Invoice & Payment domain ────────────────────────────────────────
  // Emitted by invoice generation and payment routes
  auditEmitter.on('invoice.generated',  writeAuditRecord);
  auditEmitter.on('payment.received',   writeAuditRecord);
}
