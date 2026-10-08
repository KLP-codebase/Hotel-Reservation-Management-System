import { Router, Request, Response } from 'express';
import { db } from '../config/db';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { AuditRepository } from '../repositories/audit.repository';

// ── GoF: Chain of Responsibility ──────────────────────────────────────────────
// authenticate → authorize(ADMINISTRATOR, MANAGER, DBA) → handler
// All audit data is restricted — no unauthenticated or RECEPTIONIST access.

const router = Router();
const repo   = new AuditRepository(db);

router.use(authenticate);
router.use(authorize('ADMINISTRATOR', 'MANAGER', 'DBA'));

/**
 * GET /api/v1/audit-logs
 * Returns paginated application-level audit events from v_admin_audit_activity.
 * Query params: ?limit=50&offset=0&entityType=booking&action=booking.created
 *               &actorId=<uuid>&from=2025-01-01&to=2025-12-31
 */
router.get('/', async (req: Request, res: Response) => {
  const limit  = Math.min(parseInt((req.query.limit  as string) ?? '50',  10), 200);
  const offset =           parseInt((req.query.offset as string) ?? '0',  10);

  const filter = {
    entityType: req.query.entityType as string | undefined,
    action:     req.query.action     as string | undefined,
    actorId:    req.query.actorId    as string | undefined,
    from:       req.query.from       as string | undefined,
    to:         req.query.to         as string | undefined,
  };

  const { rows, total } = await repo.getAuditLogs(limit, offset, filter);
  res.json({
    success: true,
    data:    rows,
    meta: { total, limit, offset },
  });
});

/**
 * GET /api/v1/change-logs
 * Returns paginated database-level mutation records from change_log.
 * Populated exclusively by PostgreSQL triggers (Observer Tier 1).
 * Query params: ?limit=50&offset=0&tableName=bookings
 */
router.get('/changes', async (req: Request, res: Response) => {
  const limit     = Math.min(parseInt((req.query.limit     as string) ?? '50',  10), 200);
  const offset    =           parseInt((req.query.offset   as string) ?? '0',  10);
  const tableName =           req.query.tableName as string | undefined;

  const { rows, total } = await repo.getChangeLogs(limit, offset, tableName);
  res.json({
    success: true,
    data:    rows,
    meta: { total, limit, offset, tableName: tableName ?? 'all' },
  });
});

/**
 * GET /api/v1/audit-logs/entity/:tableName/:recordId
 * Returns the full audit + change history for a specific record.
 * Used by the JSONB diff modal in the admin dashboard.
 */
router.get('/entity/:tableName/:recordId', async (req: Request, res: Response) => {
  const { tableName, recordId } = req.params;
  const history = await repo.getEntityHistory(tableName as string, recordId as string);
  res.json({ success: true, data: history });
});

export default router;
