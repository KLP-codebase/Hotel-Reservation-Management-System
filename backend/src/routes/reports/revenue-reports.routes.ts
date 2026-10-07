import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../../config/db';
import { RevenueReportRepository } from '../../repositories/reports/revenue-report.repository';

// ── Person 1 Workspace: Financial & Revenue Specialist ────────────────────────
// Report 4: GET /api/v1/reports/revenue/monthly?year=2026&branchId=...
// Report 2: GET /api/v1/reports/revenue/billing-summary?status=...&agingDays=...&search=...&branchId=...
// Note: authenticate + authorize('ADMINISTRATOR','MANAGER','DBA') is applied
// by the parent reports.routes.ts aggregator. No need to re-apply here.

const router = Router();
const repo = new RevenueReportRepository(db);

// ── Zod validation schemas ────────────────────────────────────────────────────

/**
 * Zod schema for validating query parameters passed to GET /api/v1/reports/revenue/monthly
 * - year: 4-digit fiscal year between 2000 and 2100 (defaults to current year)
 * - branchId: optional UUID for single-branch filtering, or empty string for all branches
 */
const monthlyRevenueSchema = z.object({
  year: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : new Date().getFullYear()))
    .refine((v) => v >= 2000 && v <= 2100, {
      message: 'year must be a 4-digit year between 2000 and 2100',
    }),
  branchId: z.string().uuid('branchId must be a valid UUID').optional().or(z.literal('')),
});

/**
 * Zod schema for validating query parameters passed to GET /api/v1/reports/revenue/billing-summary
 * - status: settlement status enum ('ALL' | 'UNPAID' | 'PARTIALLY_PAID' | 'SETTLED')
 * - agingDays: minimum aging threshold in days (e.g. 30, 60, 90)
 * - search: free-text search on guest name, booking ref, or room number
 * - branchId: optional UUID for single-branch filtering
 */
const billingSummarySchema = z.object({
  status: z
    .enum(['ALL', 'UNPAID', 'PARTIALLY_PAID', 'SETTLED'])
    .optional()
    .default('ALL'),
  agingDays: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : null))
    .refine((v) => v === null || v >= 0, { message: 'agingDays must be non-negative' }),
  search: z.string().max(100).optional().or(z.literal('')),
  branchId: z.string().uuid('branchId must be a valid UUID').optional().or(z.literal('')),
});

// ── GET /api/v1/reports/revenue/monthly ──────────────────────────────────────
// Report 4: Monthly Revenue per Branch (Room Charges vs Service Revenue)
router.get('/monthly', async (req: Request, res: Response) => {
  const parsed = monthlyRevenueSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: 'Invalid query parameters',
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const { year, branchId } = parsed.data;
  const branchIdVal = branchId && branchId !== '' ? branchId : null;

  const rows = await repo.getMonthlyRevenue(branchIdVal, year);

  return res.json({
    success: true,
    data: rows,
    meta: {
      year,
      branchId: branchIdVal,
      count: rows.length,
    },
  });
});

// ── GET /api/v1/reports/revenue/billing-summary ───────────────────────────────
// Report 2: Guest Billing Summary & Unpaid Balances (with Debtor Aging)
router.get('/billing-summary', async (req: Request, res: Response) => {
  const parsed = billingSummarySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: 'Invalid query parameters',
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const { status, agingDays, search, branchId } = parsed.data;
  const branchIdVal = branchId && branchId !== '' ? branchId : null;
  const searchVal = search && search !== '' ? search : null;

  const rows = await repo.getBillingSummary(
    branchIdVal,
    status === 'ALL' ? null : (status ?? null),
    agingDays ?? null,
    searchVal,
  );

  return res.json({
    success: true,
    data: rows,
    meta: {
      status: status ?? 'ALL',
      agingDays: agingDays ?? 0,
      branchId: branchIdVal,
      count: rows.length,
    },
  });
});

export default router;
