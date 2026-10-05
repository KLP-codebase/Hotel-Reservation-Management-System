'use client';   //tells next.js this is the client side page

import { useState, useEffect, useCallback } from 'react';  //React hooks
import { useAuth } from '@/context/auth-context';  //reads who is currently logged in
import { apiFetch, toNum, ApiError } from '@/lib/api-client'; // converts PostgreSQL decimal strings to JavaScript numbers, makes API calls
import {
    Receipt, Search, RefreshCw, X, ChevronDown,
    DollarSign, CheckCircle, AlertCircle, Clock,
    Printer, CreditCard, Landmark, Banknote, ShieldCheck
} from 'lucide-react';//Icons

// ── Types ─────────────────────────────────────────────────────────────────────
//Describe the expected shape of the data coming from the backend API for a single invoice
interface Invoice {
    invoice_id: string;
    booking_id: string;
    guest_name: string;
    guest_email: string;
    room_number: string;
    room_type_name: string;
    branch_name: string;
    check_in_date: string | null;
    check_out_date: string | null;
    nights: number;
    base_amount: number;
    sc_amount: number;
    tdl_amount: number;
    sscl_amount: number;
    vat_amount: number;
    total_amount: number;
    total_paid: number;
    balance_due: number;
    status: 'SETTLED' | 'PARTIALLY_PAID' | 'OPEN';
    issued_at: string;
}

//Describe the expected shape of the data coming from the backend API for a tax configuration
interface TaxConfig {
    tax_id: string;
    tax_name: string;
    tax_percentage: number;
    is_active: boolean;
    effective_from: string;
    effective_to: string | null;
}

type StatusFilter = 'ALL' | 'SETTLED' | 'PARTIALLY_PAID' | 'OPEN';

// ── Helper Components ─────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Invoice['status'] }) {//colored pill badge reusable tiny component
    if (status === 'SETTLED') return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-jakarta font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-sm">
            <CheckCircle size={10} /> Settled
        </span>
    );
    if (status === 'PARTIALLY_PAID') return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-jakarta font-semibold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 rounded-sm">
            <Clock size={10} /> Partial
        </span>
    );
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-jakarta font-semibold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 rounded-sm">
            <AlertCircle size={10} /> Open
        </span>
    );
}

function fmt(n: number | unknown) {
    return `$${toNum(n).toFixed(2)}`;
}

function fmtDate(d: string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
