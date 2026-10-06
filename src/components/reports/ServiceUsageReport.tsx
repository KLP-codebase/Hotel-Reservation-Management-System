'use client';

import React from 'react';
import { Sparkles, Clock } from 'lucide-react';

/**
 * ── PERSON 2 WORKSPACE: Report 3 — Service Usage Breakdown ────────────────────
 * Assigned to: Person 2 (Ancillary Services Specialist)
 * Required Endpoint: GET /api/v1/reports/services/usage?startDate=...&endDate=...&category=...
 * Requirements: Granular ancillary service consumption by room and service catalogue category.
 */
export function ServiceUsageReport() {
  return (
    <div className="bg-stone-950/70 border border-white/10 p-12 text-center rounded-none">
      <div className="inline-flex p-4 rounded-full bg-amber-500/10 text-amber-400 mb-4 border border-amber-500/20">
        <Sparkles size={32} />
      </div>
      <h3 className="font-cinzel text-xl font-bold text-stone-200">Service Usage Breakdown per Room</h3>
      <p className="font-jakarta text-xs text-stone-400 max-w-md mx-auto mt-2">
        Granular order volume, average unit price, and consumption metrics categorized across Dining, Wellness, Transport, and Housekeeping.
      </p>
      <div className="mt-6 inline-flex items-center gap-2 px-3 py-1.5 bg-stone-900 border border-white/10 text-stone-400 text-xs">
        <Clock size={14} className="text-amber-400" />
        <span>Assigned to: Person 2 (Services Specialist) · Dedicated Workspace</span>
      </div>
    </div>
  );
}
