'use client';

import React from 'react';
import { Receipt, Clock } from 'lucide-react';

/**
 * ── PERSON 1 WORKSPACE: Report 2 — Guest Billing Summary & Unpaid Balances ────
 * Assigned to: Person 1 (Financial Specialist)
 * Required Endpoint: GET /api/v1/reports/revenue/billing-summary?status=...&agingDays=...
 * Requirements: Highlights debtor aging (&gt;30d, &gt;60d, &gt;90d), unpaid and partially paid balances.
 */
export function BillingSummaryReport() {
  return (
    <div className="bg-stone-950/70 border border-white/10 p-12 text-center rounded-none">
      <div className="inline-flex p-4 rounded-full bg-amber-500/10 text-amber-400 mb-4 border border-amber-500/20">
        <Receipt size={32} />
      </div>
      <h3 className="font-cinzel text-xl font-bold text-stone-200">Guest Billing Summary & Debtor Aging</h3>
      <p className="font-jakarta text-xs text-stone-400 max-w-md mx-auto mt-2">
        Tracking unpaid folio balances, partial payments, and debtor aging periods (&gt;30d, &gt;60d, &gt;90d).
      </p>
      <div className="mt-6 inline-flex items-center gap-2 px-3 py-1.5 bg-stone-900 border border-white/10 text-stone-400 text-xs">
        <Clock size={14} className="text-amber-400" />
        <span>Assigned to: Person 1 (Financial Specialist) · Dedicated Workspace</span>
      </div>
    </div>
  );
}
