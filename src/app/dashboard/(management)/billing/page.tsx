'use client';   //tells next.js this is the client side page

import React, { useState, useEffect, useCallback } from 'react';  //React hooks
import { useAuth } from '@/context/auth-context';  //reads who is currently logged in
import { apiFetch, toNum, ApiError } from '@/lib/api-client'; // converts PostgreSQL decimal strings to JavaScript numbers, makes API calls
import {
    Receipt, Search, RefreshCw, X, ChevronDown,
    DollarSign, CheckCircle, AlertCircle, Clock,
    Printer, CreditCard, Landmark, Banknote, ShieldCheck, LogOut
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

// ── Helper Components ─────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Invoice['status'] }) {
    if (status === 'SETTLED') return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-jakarta font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-sm">
            <CheckCircle size={10} /> Settled
        </span>
    );
    if (status === 'PARTIALLY_PAID') return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-jakarta font-semibold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-sm">
            <Clock size={10} /> Partial
        </span>
    );
    return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-jakarta font-semibold uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded-sm">
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

// ── Main Page Component ───────────────────────────────────────────────────────

export default function BillingPage() {
    const { user, logout } = useAuth();

    // ── State ──────────────────────────────────────────────────────────────────
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [taxes, setTaxes] = useState<TaxConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'ledger' | 'taxes'>('ledger');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [showTaxModal, setShowTaxModal] = useState(false);
    const [showPayModal, setShowPayModal] = useState(false);
    const [payAmount, setPayAmount] = useState('');
    const [payMethod, setPayMethod] = useState<'CASH' | 'CREDIT_CARD' | 'BANK_TRANSFER'>('CASH');
    const [payLoading, setPayLoading] = useState(false);
    const [payError, setPayError] = useState<string | null>(null);

    // ── Fetch Data ──────────────────────────────────────────────────────────────
    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [invRes, taxRes] = await Promise.all([
                apiFetch<{ success: boolean; count: number; data: Invoice[] }>('/api/v1/invoices'),
                apiFetch<{ success: boolean; data: TaxConfig[] }>('/api/v1/tax-configurations'),
            ]);
            setInvoices(invRes.data ?? []);
            setTaxes(taxRes.data ?? []);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Failed to load billing data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ── Derived / Computed Values ───────────────────────────────────────────────
    const filtered = invoices.filter(inv => {
        if (statusFilter !== 'ALL' && inv.status !== statusFilter) return false;
        if (search.trim()) {
            const q = search.toLowerCase();
            return (
                inv.guest_name.toLowerCase().includes(q) ||
                inv.room_number.toLowerCase().includes(q) ||
                inv.invoice_id.toLowerCase().includes(q) ||
                inv.booking_id.toLowerCase().includes(q)
            );
        }
        return true;
    });

    const totalInvoiced = invoices.reduce((s, i) => s + toNum(i.total_amount), 0);
    const totalCollected = invoices.reduce((s, i) => s + toNum(i.total_paid), 0);
    const totalOutstanding = invoices.reduce((s, i) => s + toNum(i.balance_due), 0);
    const settledCount = invoices.filter(i => i.status === 'SETTLED').length;

    // ── Record Payment Handler ──────────────────────────────────────────────────
    const handleRecordPayment = async () => {
        if (!selectedInvoice) return;
        setPayLoading(true);
        setPayError(null);
        try {
            await apiFetch(`/api/v1/invoices/${selectedInvoice.booking_id}/payments`, {
                method: 'POST',
                body: JSON.stringify({
                    amount: parseFloat(payAmount),
                    payment_method: payMethod,
                }),
            });
            setShowPayModal(false);
            setPayAmount('');
            fetchData();
        } catch (err) {
            setPayError(err instanceof ApiError ? err.message : 'Payment failed');
        } finally {
            setPayLoading(false);
        }
    };

    // ── Loading & Error States ─────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="min-h-screen bg-stone-950 flex items-center justify-center">
                <div className="text-center space-y-3">
                    <div className="w-10 h-10 rounded-sm bg-skynest-accent/15 border border-skynest-accent/30 flex items-center justify-center mx-auto animate-pulse">
                        <Receipt className="w-5 h-5 text-skynest-accent" />
                    </div>
                    <p className="font-jakarta text-sm text-stone-400">Loading billing ledger…</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-stone-950 flex items-center justify-center">
                <div className="text-center space-y-3">
                    <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
                    <p className="font-jakarta text-sm text-rose-400">{error}</p>
                    <button onClick={fetchData} className="text-xs font-jakarta font-semibold uppercase tracking-widest text-skynest-accent hover:underline">
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    // ── JSX ────────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-stone-950 text-stone-100 font-jakarta p-8 max-w-[1440px]">

            {/* ── Page Header ──────────────────────────────────────────────────────── */}
            <div className="flex items-start justify-between pb-8 mb-8 border-b border-white/10">
                <div>
                    <p className="font-jakarta text-[10px] uppercase tracking-[0.2em] text-skynest-accent font-semibold mb-1">
                        Financial Operations
                    </p>
                    <h1 className="font-cinzel italic text-2xl md:text-3xl text-stone-100">
                        Billing &amp; Invoices
                    </h1>
                    <p className="font-jakarta text-sm text-stone-400 mt-1">
                        Statutory tax cascade · Payment ledger · Settlement management
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={fetchData}
                            className="flex items-center gap-2 px-4 py-2 text-xs font-jakarta font-semibold uppercase tracking-widest border border-white/10 bg-stone-900/60 text-stone-300 hover:text-stone-100 hover:border-white/25 transition-colors"
                        >
                            <RefreshCw size={12} /> Refresh
                        </button>
                        <button
                            onClick={logout}
                            className="flex items-center gap-2 px-4 py-2 text-xs font-jakarta font-semibold uppercase tracking-widest border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 transition-colors"
                        >
                            <LogOut size={12} /> Log Out
                        </button>
                    </div>
                </div>
                <button
                    onClick={fetchData}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-jakarta font-semibold uppercase tracking-widest border border-white/10 bg-stone-900/60 text-stone-300 hover:text-stone-100 hover:border-white/25 transition-colors"
                >
                    <RefreshCw size={12} /> Refresh
                </button>
            </div>

            <div className="space-y-8">

                {/* ── KPI Summary Cards ─────────────────────────────────────────────── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Total Invoiced', value: fmt(totalInvoiced), icon: <Receipt size={16} />, color: 'text-stone-100' },
                        { label: 'Revenue Collected', value: fmt(totalCollected), icon: <DollarSign size={16} />, color: 'text-emerald-400' },
                        { label: 'Outstanding Balance', value: fmt(totalOutstanding), icon: <AlertCircle size={16} />, color: 'text-rose-400' },
                        { label: 'Settled Invoices', value: `${settledCount} / ${invoices.length}`, icon: <CheckCircle size={16} />, color: 'text-amber-400' },
                    ].map(card => (
                        <div key={card.label} className="bg-stone-900 border border-white/10 p-5">
                            <div className={`flex items-center gap-2 ${card.color} mb-2`}>
                                {card.icon}
                                <span className="text-[10px] font-jakarta font-semibold uppercase tracking-widest text-stone-400">
                                    {card.label}
                                </span>
                            </div>
                            <p className={`font-cinzel text-xl font-medium ${card.color}`}>{card.value}</p>
                        </div>
                    ))}
                </div>

                {/* ── Tab Navigation ────────────────────────────────────────────────── */}
                <div className="border-b border-white/10 flex gap-0">
                    {[
                        { key: 'ledger', label: 'Financial Ledger', icon: <Receipt size={13} /> },
                        { key: 'taxes', label: 'Statutory Tax Rates', icon: <ShieldCheck size={13} /> },
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key as 'ledger' | 'taxes')}
                            className={`flex items-center gap-2 px-5 py-3 text-xs font-jakarta font-semibold uppercase tracking-widest border-b-2 transition-colors ${activeTab === tab.key
                                ? 'border-skynest-accent text-skynest-accent'
                                : 'border-transparent text-stone-400 hover:text-stone-200'
                                }`}
                        >
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>

                {/* ── Tab 1: Financial Ledger ───────────────────────────────────────── */}
                {activeTab === 'ledger' && (
                    <div className="space-y-4">

                        {/* Search & Filter Bar */}
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative flex-1">
                                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
                                <input
                                    type="text"
                                    placeholder="Search guest name, room, invoice ID…"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2.5 text-sm font-jakarta border border-white/10 bg-stone-900/60 text-stone-100 placeholder:text-stone-500 focus:border-skynest-accent outline-none transition-colors"
                                />
                            </div>
                            <div className="relative">
                                <select
                                    value={statusFilter}
                                    onChange={e => setStatusFilter(e.target.value as StatusFilter)}
                                    className="appearance-none pl-4 pr-10 py-2.5 text-xs font-jakarta font-semibold uppercase tracking-widest border border-white/10 bg-stone-900 text-stone-300 focus:border-skynest-accent outline-none transition-colors cursor-pointer"
                                >
                                    {(['ALL', 'SETTLED', 'PARTIALLY_PAID', 'OPEN'] as StatusFilter[]).map(s => (
                                        <option key={s} value={s} className="bg-stone-900 text-stone-100">{s.replace('_', ' ')}</option>
                                    ))}
                                </select>
                                <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 pointer-events-none" />
                            </div>
                        </div>

                        {/* Invoice Table */}
                        <div className="bg-stone-900 border border-white/10 overflow-x-auto">
                            <table className="w-full text-left text-sm font-jakarta">
                                <thead className="bg-white/[0.02] border-b border-white/10 text-stone-400 text-[10px] tracking-widest uppercase">
                                    <tr>
                                        <th className="px-5 py-3 font-semibold">Guest</th>
                                        <th className="px-5 py-3 font-semibold">Room</th>
                                        <th className="px-5 py-3 font-semibold">Stay</th>
                                        <th className="px-5 py-3 font-semibold">Total</th>
                                        <th className="px-5 py-3 font-semibold">Paid</th>
                                        <th className="px-5 py-3 font-semibold">Balance</th>
                                        <th className="px-5 py-3 font-semibold">Status</th>
                                        <th className="px-5 py-3 font-semibold">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filtered.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="px-5 py-12 text-center text-sm text-stone-500">
                                                No invoices match your search or filter.
                                            </td>
                                        </tr>
                                    ) : filtered.map(inv => (
                                        <tr key={inv.invoice_id} className="hover:bg-white/[0.02] transition-colors">
                                            <td className="px-5 py-4">
                                                <p className="font-medium text-stone-200 text-sm">{inv.guest_name}</p>
                                                <p className="text-[11px] text-stone-500 mt-0.5">{inv.guest_email}</p>
                                            </td>
                                            <td className="px-5 py-4">
                                                <p className="text-sm font-medium text-stone-200">Room {inv.room_number}</p>
                                                <p className="text-[11px] text-stone-500 mt-0.5">{inv.room_type_name}</p>
                                            </td>
                                            <td className="px-5 py-4">
                                                <p className="text-xs text-stone-300">{fmtDate(inv.check_in_date)}</p>
                                                <p className="text-[11px] text-stone-500">→ {fmtDate(inv.check_out_date)}</p>
                                                <p className="text-[10px] text-stone-500 mt-0.5">{inv.nights} night{inv.nights !== 1 ? 's' : ''}</p>
                                            </td>
                                            <td className="px-5 py-4 font-medium text-stone-200">{fmt(inv.total_amount)}</td>
                                            <td className="px-5 py-4 text-emerald-400 font-medium">{fmt(inv.total_paid)}</td>
                                            <td className="px-5 py-4 text-rose-400 font-medium">{fmt(inv.balance_due)}</td>
                                            <td className="px-5 py-4"><StatusBadge status={inv.status} /></td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => { setSelectedInvoice(inv); setShowTaxModal(true); }}
                                                        className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 hover:text-skynest-accent transition-colors flex items-center gap-1"
                                                    >
                                                        <Printer size={11} /> View
                                                    </button>
                                                    {inv.status !== 'SETTLED' && (
                                                        <button
                                                            onClick={() => { setSelectedInvoice(inv); setPayAmount(toNum(inv.balance_due).toFixed(2)); setShowPayModal(true); }}
                                                            className="text-[10px] font-semibold uppercase tracking-widest text-skynest-accent hover:underline transition-colors flex items-center gap-1"
                                                        >
                                                            <CreditCard size={11} /> Pay
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <p className="text-[11px] text-stone-500 font-jakarta">
                            Showing {filtered.length} of {invoices.length} invoices
                        </p>
                    </div>
                )}

                {/* ── Tab 2: Statutory Tax Rates ───────────────────────────────────── */}
                {activeTab === 'taxes' && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="font-cinzel text-lg uppercase tracking-widest text-stone-100 mb-1">
                                Statutory Tax Configuration
                            </h2>
                            <p className="font-jakarta text-sm text-stone-400">
                                The 4-tier Sri Lankan tax cascade applied to all invoices in sequence:
                                <span className="text-amber-400 font-medium"> Base → SC → TDL → SSCL → VAT</span>
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {taxes.map((tax, i) => (
                                <div key={tax.tax_id} className="bg-stone-900 border border-white/10 p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-sm bg-skynest-accent/15 border border-skynest-accent/30 flex items-center justify-center text-skynest-accent font-cinzel text-sm font-medium">
                                                {i + 1}
                                            </div>
                                            <div>
                                                <p className="font-jakarta font-semibold text-sm text-stone-200">{tax.tax_name}</p>
                                                <p className="text-[11px] text-stone-500 mt-0.5">Tier {i + 1} of the cascade</p>
                                            </div>
                                        </div>
                                        <span className={`text-[10px] font-jakarta font-semibold uppercase tracking-widest px-2.5 py-0.5 rounded-sm ${tax.is_active
                                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                                            }`}>
                                            {tax.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                    <p className="font-cinzel text-3xl font-normal text-stone-100 mb-3">
                                        {toNum(tax.tax_percentage).toFixed(1)}%
                                    </p>
                                    <div className="border-t border-white/10 pt-3 space-y-1">
                                        <p className="text-[11px] text-stone-500 font-jakarta">
                                            Effective from: <span className="text-stone-300">{fmtDate(tax.effective_from)}</span>
                                        </p>
                                        {tax.effective_to && (
                                            <p className="text-[11px] text-stone-500 font-jakarta">
                                                Effective to: <span className="text-stone-300">{fmtDate(tax.effective_to)}</span>
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {taxes.length === 0 && (
                            <div className="bg-stone-900 border border-white/10 p-12 text-center">
                                <ShieldCheck className="w-8 h-8 text-stone-600 mx-auto mb-3" />
                                <p className="font-jakarta text-sm text-stone-500">No tax configurations found.</p>
                            </div>
                        )}
                    </div>
                )}

            </div>

            {/* ══════════════════════════════════════════════════════════════════════ */}
            {/* ── Tax Breakdown Modal ──────────────────────────────────────────────── */}
            {/* ══════════════════════════════════════════════════════════════════════ */}
            {showTaxModal && selectedInvoice && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
                    <div className="bg-stone-900 border border-white/10 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
                        {/* Modal Header */}
                        <div className="flex items-start justify-between p-6 border-b border-white/10">
                            <div>
                                <p className="text-[10px] uppercase tracking-[0.2em] text-skynest-accent font-semibold font-jakarta mb-1">
                                    Invoice Detail
                                </p>
                                <h2 className="font-cinzel text-xl uppercase tracking-wide text-stone-100">
                                    Tax Breakdown
                                </h2>
                            </div>
                            <button onClick={() => setShowTaxModal(false)} className="text-stone-400 hover:text-stone-100 transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        {/* Invoice Identity */}
                        <div className="p-6 border-b border-white/10 space-y-1">
                            <p className="font-jakarta font-semibold text-stone-200">{selectedInvoice.guest_name}</p>
                            <p className="font-jakarta text-sm text-stone-400">{selectedInvoice.guest_email}</p>
                            <p className="font-jakarta text-xs text-stone-500 mt-2">
                                Room {selectedInvoice.room_number} · {selectedInvoice.branch_name} ·{' '}
                                {selectedInvoice.nights} night{selectedInvoice.nights !== 1 ? 's' : ''}
                            </p>
                            <p className="font-jakarta text-xs text-stone-500">
                                {fmtDate(selectedInvoice.check_in_date)} → {fmtDate(selectedInvoice.check_out_date)}
                            </p>
                        </div>

                        {/* Tax Cascade Breakdown */}
                        <div className="p-6 space-y-2">
                            <p className="text-[10px] uppercase tracking-widest text-stone-500 font-jakarta font-semibold mb-4">
                                Statutory Tax Cascade
                            </p>
                            {[
                                { label: 'Base Room Charge', amount: selectedInvoice.base_amount, tier: 0 },
                                { label: 'Service Charge (SC)', amount: selectedInvoice.sc_amount, tier: 1 },
                                { label: 'Tourism Dev. Levy (TDL)', amount: selectedInvoice.tdl_amount, tier: 2 },
                                { label: 'SSCL', amount: selectedInvoice.sscl_amount, tier: 3 },
                                { label: 'VAT', amount: selectedInvoice.vat_amount, tier: 4 },
                            ].map(row => (
                                <div key={row.label} className={`flex items-center justify-between py-2 ${row.tier === 0 ? 'border-b border-white/10 pb-3 mb-1' : ''}`}>
                                    <div className="flex items-center gap-3">
                                        {row.tier > 0 && (
                                            <span className="w-4 h-px bg-white/20 inline-block" />
                                        )}
                                        <span className={`font-jakarta text-sm ${row.tier === 0 ? 'font-semibold text-stone-200' : 'text-stone-400'}`}>
                                            {row.label}
                                        </span>
                                    </div>
                                    <span className={`font-jakarta font-medium ${row.tier === 0 ? 'text-stone-100' : 'text-stone-300'}`}>
                                        {fmt(row.amount)}
                                    </span>
                                </div>
                            ))}
                            <div className="border-t-2 border-white/15 pt-3 mt-2 flex items-center justify-between">
                                <span className="font-jakarta font-semibold text-sm text-stone-100">Grand Total</span>
                                <span className="font-cinzel text-xl text-amber-400">{fmt(selectedInvoice.total_amount)}</span>
                            </div>
                        </div>

                        {/* Payment Status */}
                        <div className="px-6 pb-6 space-y-2">
                            <div className="flex items-center justify-between py-2 border-t border-white/10">
                                <span className="font-jakarta text-sm text-stone-400">Amount Paid</span>
                                <span className="font-jakarta font-semibold text-emerald-400">{fmt(selectedInvoice.total_paid)}</span>
                            </div>
                            <div className="flex items-center justify-between py-2">
                                <span className="font-jakarta text-sm text-stone-400">Balance Due</span>
                                <span className="font-jakarta font-semibold text-rose-400">{fmt(selectedInvoice.balance_due)}</span>
                            </div>
                            <div className="flex items-center justify-between pt-2">
                                <span className="font-jakarta text-xs text-stone-500">Status</span>
                                <StatusBadge status={selectedInvoice.status} />
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t border-white/10 flex justify-end gap-3 bg-stone-950/40">
                            <button
                                onClick={() => setShowTaxModal(false)}
                                className="px-5 py-2 text-xs font-jakarta font-semibold uppercase tracking-widest border border-white/10 text-stone-300 hover:text-stone-100 hover:border-white/25 transition-colors"
                            >
                                Close
                            </button>
                            {selectedInvoice.status !== 'SETTLED' && (
                                <button
                                    onClick={() => { setShowTaxModal(false); setPayAmount(toNum(selectedInvoice.balance_due).toFixed(2)); setShowPayModal(true); }}
                                    className="px-5 py-2 text-xs font-jakarta font-semibold uppercase tracking-widest bg-skynest-accent text-white hover:bg-skynest-accent/90 transition-colors"
                                >
                                    Record Payment
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════════ */}
            {/* ── Record Payment Modal ─────────────────────────────────────────────── */}
            {/* ══════════════════════════════════════════════════════════════════════ */}
            {showPayModal && selectedInvoice && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
                    <div className="bg-stone-900 border border-white/10 w-full max-w-md shadow-2xl">
                        {/* Modal Header */}
                        <div className="flex items-start justify-between p-6 border-b border-white/10">
                            <div>
                                <p className="text-[10px] uppercase tracking-[0.2em] text-skynest-accent font-semibold font-jakarta mb-1">
                                    Payment
                                </p>
                                <h2 className="font-cinzel text-xl uppercase tracking-wide text-stone-100">
                                    Record Payment
                                </h2>
                            </div>
                            <button onClick={() => { setShowPayModal(false); setPayError(null); }} className="text-stone-400 hover:text-stone-100 transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            <div className="bg-stone-950/50 border border-white/10 p-4 rounded-sm">
                                <p className="font-jakarta text-xs text-stone-400 mb-1">Guest</p>
                                <p className="font-jakarta font-semibold text-sm text-stone-200">{selectedInvoice.guest_name}</p>
                                <p className="font-jakarta text-xs text-stone-400 mt-1">
                                    Balance due: <span className="text-rose-400 font-semibold">{fmt(selectedInvoice.balance_due)}</span>
                                </p>
                            </div>

                            {/* Amount Field */}
                            <div>
                                <label className="block text-[10px] font-jakarta font-semibold uppercase tracking-widest text-stone-400 mb-2">
                                    Payment Amount ($)
                                </label>
                                <input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    value={payAmount}
                                    onChange={e => setPayAmount(e.target.value)}
                                    className="w-full px-4 py-3 text-sm font-jakarta border border-white/10 bg-stone-950 text-stone-100 focus:border-skynest-accent outline-none transition-colors"
                                    placeholder="0.00"
                                />
                            </div>

                            {/* Payment Method */}
                            <div>
                                <label className="block text-[10px] font-jakarta font-semibold uppercase tracking-widest text-stone-400 mb-2">
                                    Payment Method
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {([
                                        { value: 'CASH', label: 'Cash', icon: <Banknote size={14} /> },
                                        { value: 'CREDIT_CARD', label: 'Card', icon: <CreditCard size={14} /> },
                                        { value: 'BANK_TRANSFER', label: 'Bank', icon: <Landmark size={14} /> },
                                    ] as { value: 'CASH' | 'CREDIT_CARD' | 'BANK_TRANSFER'; label: string; icon: React.ReactNode }[]).map(m => (
                                        <button
                                            key={m.value}
                                            type="button"
                                            onClick={() => setPayMethod(m.value)}
                                            className={`flex flex-col items-center gap-1.5 py-3 px-2 border text-xs font-jakarta font-semibold transition-colors ${payMethod === m.value
                                                ? 'border-skynest-accent text-skynest-accent bg-skynest-accent/10'
                                                : 'border-white/10 text-stone-400 hover:border-white/20'
                                                }`}
                                        >
                                            {m.icon} {m.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {payError && (
                                <p className="text-xs font-jakarta text-rose-300 bg-rose-500/10 border border-rose-500/30 px-3 py-2">
                                    {payError}
                                </p>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t border-white/10 flex justify-end gap-3 bg-stone-950/40">
                            <button
                                onClick={() => { setShowPayModal(false); setPayError(null); }}
                                disabled={payLoading}
                                className="px-5 py-2 text-xs font-jakarta font-semibold uppercase tracking-widest border border-white/10 text-stone-300 hover:text-stone-100 hover:border-white/25 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRecordPayment}
                                disabled={payLoading || !payAmount || parseFloat(payAmount) <= 0}
                                className="px-5 py-2 text-xs font-jakarta font-semibold uppercase tracking-widest bg-skynest-accent text-white hover:bg-skynest-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {payLoading ? (
                                    <><RefreshCw size={12} className="animate-spin" /> Processing…</>
                                ) : (
                                    <><CheckCircle size={12} /> Confirm Payment</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
