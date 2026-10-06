'use client';

import React from 'react';
import { DollarSign, Clock } from 'lucide-react';

/**
 * ── PERSON 1 WORKSPACE: Report 4 — Monthly Revenue per Branch ─────────────────
 * Assigned to: Person 1 (Financial Specialist)
 * Required Endpoint: GET /api/v1/reports/revenue/monthly?year=2026&branchId=...
 * Requirements: Segregate room tariff revenue vs ancillary service revenue,
 * and calculate Sri Lankan statutory taxes (SC, TDL, SSCL, VAT).
 */
export function MonthlyRevenueReport() {
  return (
    <div className="bg-stone-950/70 border border-white/10 p-12 text-center rounded-none">
      <div className="inline-flex p-4 rounded-full bg-amber-500/10 text-amber-400 mb-4 border border-amber-500/20">
        <DollarSign size={32} />
      </div>
      <h3 className="font-cinzel text-xl font-bold text-stone-200">Monthly Revenue per Branch</h3>
      <p className="font-jakarta text-xs text-stone-400 max-w-md mx-auto mt-2">
        Segregated room tariff revenue vs ancillary service income with statutory 4-tier Sri Lankan tax cascade.
      </p>
      <div className="mt-6 inline-flex items-center gap-2 px-3 py-1.5 bg-stone-900 border border-white/10 text-stone-400 text-xs">
        <Clock size={14} className="text-amber-400" />
        <span>Assigned to: Person 1 (Financial Specialist) · Dedicated Workspace</span>
      </div>
    </div>
  );
}
