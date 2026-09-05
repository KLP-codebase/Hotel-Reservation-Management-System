import { EventEmitter } from 'events';
import { db } from '../../config/db';

// ── GoF: Observer ─────────────────────────────────────────────────────────────
// auditEmitter is the Subject.
// Services emit events without knowing who listens.
// Listeners (registered at server startup) write audit records to the DB.
// Adding email notifications / webhooks = adding a new listener, not touching services.

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
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
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
  auditEmitter.on('staff.created',       writeAuditRecord);
  auditEmitter.on('staff.updated',       writeAuditRecord);
  auditEmitter.on('staff.deactivated',   writeAuditRecord);
  auditEmitter.on('account.created',     writeAuditRecord);
  auditEmitter.on('account.deactivated', writeAuditRecord);
  auditEmitter.on('auth.login',          writeAuditRecord);
  auditEmitter.on('auth.logout',         writeAuditRecord);
}
