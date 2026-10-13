'use client';   //tells next.js this is the client side page

import React, { useState, useEffect, useCallback } from 'react';  //React hooks
import { useAuth } from '@/context/auth-context';  //reads who is currently logged in
import { apiFetch, toNum, ApiError } from '@/lib/api-client'; // converts PostgreSQL decimal strings to JavaScript numbers, makes API calls
import { CreditCard, Landmark, Banknote, ChevronDown, Printer } from 'lucide-react'; //Icons
import {
    DashboardMasthead, MastheadRefresh, SectionHeader, Segmented, SearchField, Toolbar, FilterSelect,
    Btn, Field, Modal, Loading, Empty, StatusDot, tbl, fmtLKR, fmtLKRCompact, fmtStayRange, fmtDay,
} from '@/components/dashboard/ui';

// ── Types ─────────────────────────────────────────────────────────────────────
//Describe the expected shape of the data coming from the backend API for a single invoice
interface Invoice {
    invoice_id: string;
    booking_id: string;
    booking_room_id?: string;
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

interface Branch {
    branch_id: string;
    branch_name: string;
    city?: string;
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

const STATUS_LABEL: Record<Invoice['status'], string> = {
    SETTLED: 'Settled',
    PARTIALLY_PAID: 'Partly paid',
    OPEN: 'Open',
};

const PAY_METHODS = [
    { value: 'CASH', label: 'Cash', icon: Banknote },
    { value: 'CREDIT_CARD', label: 'Card', icon: CreditCard },
    { value: 'BANK_TRANSFER', label: 'Bank', icon: Landmark },
] as const;

// ── Main Page Component ───────────────────────────────────────────────────────

export default function BillingPage() {
    const { user } = useAuth();
    const isAdminOrDba = user?.role === 'ADMINISTRATOR' || user?.role === 'DATABASE_ADMINISTRATOR';
    const isManager = user?.role === 'MANAGER';

    // ── State ──────────────────────────────────────────────────────────────────
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
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

    // Lock Manager to their assigned branch
    useEffect(() => {
        if (isManager && user?.branchId) {
            setSelectedBranch(String(user.branchId));
        }
    }, [isManager, user?.branchId]);

    // Pre-fill the search from ?q= (the booking detail page links here with its booking ID)
    useEffect(() => {
        const q = new URLSearchParams(window.location.search).get('q');
        if (q) setSearch(q);
    }, []);

    // ── Fetch Data ──────────────────────────────────────────────────────────────
    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const branchParam = selectedBranch !== 'ALL' ? `?branchId=${selectedBranch}` : '';
            const [invRes, taxRes, branchRes] = await Promise.all([
                apiFetch<{ success: boolean; count: number; data: Invoice[] }>(`/api/v1/invoices${branchParam}`),
                apiFetch<{ success: boolean; data: TaxConfig[] }>('/api/v1/tax-configurations'),
                apiFetch<{ success: boolean; data: Branch[] }>('/api/v1/branches').catch(() => ({ success: false, data: [] as Branch[] })),
            ]);
            setInvoices(invRes.data ?? []);
            setTaxes(taxRes.data ?? []);
            if (branchRes.data) {
                setBranches(branchRes.data);
            }
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Failed to load billing data');
        } finally {
            setLoading(false);
        }
    }, [selectedBranch]);

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
                    booking_room_id: selectedInvoice.booking_room_id,
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

    // ── Generate Printable / Downloadable Tax Invoice PDF ────────────────────────
    const handlePrintInvoice = (inv: Invoice) => {
        const printWindow = window.open('', '_blank', 'width=850,height=950');
        if (!printWindow) return;

        const isSettled = inv.status === 'SETTLED' || inv.balance_due <= 0;
        const formattedCheckIn = inv.check_in_date ? new Date(inv.check_in_date).toLocaleDateString('en-GB') : 'N/A';
        const formattedCheckOut = inv.check_out_date ? new Date(inv.check_out_date).toLocaleDateString('en-GB') : 'N/A';
        const todayDate = new Date().toLocaleDateString('en-GB');

        const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Sky Nest Tax Invoice - ${inv.invoice_id}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; margin: 0; padding: 24px; font-size: 13px; line-height: 1.5; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #D9722C; padding-bottom: 16px; margin-bottom: 24px; }
    .brand { font-size: 26px; font-weight: 700; color: #0B2540; letter-spacing: 1px; }
    .brand-sub { font-size: 11px; text-transform: uppercase; color: #D9722C; font-weight: 600; letter-spacing: 2px; }
    .inv-title { text-align: right; }
    .inv-title h2 { margin: 0; font-size: 20px; color: #0B2540; text-transform: uppercase; }
    .inv-meta { font-size: 12px; color: #64748b; margin-top: 4px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px; }
    .card h3 { margin: 0 0 8px 0; font-size: 11px; text-transform: uppercase; color: #64748b; letter-spacing: 1px; }
    .table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    .table th { background: #0B2540; color: #ffffff; text-align: left; padding: 10px 12px; font-size: 12px; text-transform: uppercase; }
    .table td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; }
    .table tr:last-child td { border-bottom: 2px solid #0B2540; }
    .text-right { text-align: right; }
    .totals { width: 280px; margin-left: auto; margin-bottom: 24px; }
    .totals-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
    .totals-row.grand { border-top: 2px solid #0B2540; border-bottom: 2px solid #0B2540; font-weight: 700; font-size: 16px; color: #0B2540; padding: 10px 0; }
    .stamp { display: inline-block; padding: 8px 16px; border: 2px solid ${isSettled ? '#15803d' : '#d97706'}; color: ${isSettled ? '#15803d' : '#d97706'}; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; border-radius: 4px; transform: rotate(-5deg); margin-top: 10px; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">SKY NEST</div>
      <div class="brand-sub">Hotel & Luxury Residences</div>
      <div style="margin-top: 6px; font-size: 12px; color: #64748b;">
        ${inv.branch_name} • Sri Lanka<br/>
        VAT Registration No: 104-982-3490-VAT
      </div>
    </div>
    <div class="inv-title">
      <h2>TAX INVOICE</h2>
      <div class="inv-meta">
        <strong>Invoice #:</strong> ${inv.invoice_id}<br/>
        <strong>Booking ID:</strong> ${inv.booking_id.substring(0, 8)}...<br/>
        <strong>Issue Date:</strong> ${todayDate}
      </div>
      <div>
        <span class="stamp">${isSettled ? 'PAID IN FULL' : 'PAYMENT OPEN'}</span>
      </div>
    </div>
  </div>

  <div class="grid">
    <div class="card">
      <h3>Billed To (Guest)</h3>
      <strong style="font-size: 14px; color: #0B2540;">${inv.guest_name}</strong><br/>
      Email: ${inv.guest_email}<br/>
      Room: <strong>Room ${inv.room_number}</strong> (${inv.room_type_name})
    </div>
    <div class="card">
      <h3>Stay Details</h3>
      <strong>Check-in:</strong> ${formattedCheckIn}<br/>
      <strong>Check-out:</strong> ${formattedCheckOut}<br/>
      <strong>Total Stay:</strong> ${inv.nights} Night(s)
    </div>
  </div>

  <table class="table">
    <thead>
      <tr>
        <th>Description</th>
        <th class="text-right">Rate / Basis</th>
        <th class="text-right">Amount (LKR)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Room Accommodation & Incidental Services</strong><br/><span style="font-size: 11px; color: #64748b;">Net room charges for ${inv.nights} night(s)</span></td>
        <td class="text-right">Base Tariff</td>
        <td class="text-right">${inv.base_amount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
      </tr>
      <tr>
        <td><strong>Statutory Service Charge (SC)</strong><br/><span style="font-size: 11px; color: #64748b;">Hospitality employee service charge</span></td>
        <td class="text-right">10.00%</td>
        <td class="text-right">${inv.sc_amount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
      </tr>
      <tr>
        <td><strong>Tourism Development Levy (TDL)</strong><br/><span style="font-size: 11px; color: #64748b;">Sri Lanka Tourism Act turnover levy</span></td>
        <td class="text-right">1.00%</td>
        <td class="text-right">${inv.tdl_amount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
      </tr>
      <tr>
        <td><strong>Social Security Contribution Levy (SSCL)</strong><br/><span style="font-size: 11px; color: #64748b;">Act No. 25 of 2022</span></td>
        <td class="text-right">2.50%</td>
        <td class="text-right">${inv.sscl_amount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
      </tr>
      <tr>
        <td><strong>Value Added Tax (VAT)</strong><br/><span style="font-size: 11px; color: #64748b;">Inland Revenue Department</span></td>
        <td class="text-right">18.00%</td>
        <td class="text-right">${inv.vat_amount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
      </tr>
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-row grand">
      <span>Total Invoiced</span>
      <span>LKR ${inv.total_amount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span>
    </div>
    <div class="totals-row">
      <span>Total Paid</span>
      <span>LKR ${inv.total_paid.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span>
    </div>
    <div class="totals-row" style="color: ${inv.balance_due > 0 ? '#b91c1c' : '#15803d'}; font-weight: 600;">
      <span>Balance Due</span>
      <span>LKR ${inv.balance_due.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span>
    </div>
  </div>

  <div class="footer">
    Thank you for choosing Sky Nest Hotel. We look forward to welcoming you again.<br/>
    This is an authentic computer-generated fiscal tax invoice issued under Inland Revenue Department guidelines.
  </div>

  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>
        `;

        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
    };


    const openPay = (inv: Invoice) => {
        setSelectedInvoice(inv);
        setPayAmount(toNum(inv.balance_due).toFixed(2));
        setPayError(null);
        setShowPayModal(true);
    };

    const pct = (p: number | unknown) => {
        const n = toNum(p);
        return (n <= 1 ? n * 100 : n).toFixed(1);
    };

    const selectedBranchRow = branches.find((b) => String(b.branch_id) === String(selectedBranch));

    // ── JSX ────────────────────────────────────────────────────────────────────
    return (
        <>
            <DashboardMasthead
                eyebrow={isManager ? `${user?.branchName ?? 'Sanctuary'} · Financial Ledger` : 'Finance · Ledger & Taxes'}
                title="Billing"
                imageKey={user?.branchName || selectedBranchRow?.branch_name}
                aside={
                    <div className="flex items-center gap-6">
                        {isAdminOrDba && branches.length > 0 && (
                            <label className="relative flex items-center gap-3 border-b border-white/20 focus-within:border-skynest-accent transition-colors duration-300">
                                <span className="font-jakarta text-[11px] font-medium tracking-[0.12em] uppercase text-white/60">Property</span>
                                <select
                                    value={selectedBranch}
                                    onChange={(e) => setSelectedBranch(e.target.value)}
                                    className="appearance-none bg-transparent py-1.5 pr-6 font-jakarta text-[13px] text-white focus:outline-none cursor-pointer"
                                >
                                    <option value="ALL" className="text-ink">All Properties</option>
                                    {branches.map((b) => (
                                        <option key={b.branch_id} value={b.branch_id} className="text-ink">
                                            {b.branch_name}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/60 pointer-events-none" />
                            </label>
                        )}
                        <MastheadRefresh onClick={fetchData} loading={loading} />
                    </div>
                }
                kpis={[
                    { label: 'Invoiced', value: fmtLKRCompact(totalInvoiced), sub: fmtLKR(totalInvoiced) },
                    { label: 'Collected', value: fmtLKRCompact(totalCollected), sub: fmtLKR(totalCollected) },
                    { label: 'Outstanding', value: fmtLKRCompact(totalOutstanding), sub: fmtLKR(totalOutstanding), onClick: () => setStatusFilter(s => s === 'OPEN' ? 'ALL' : 'OPEN'), active: statusFilter === 'OPEN' },
                    { label: 'Settled', value: `${settledCount}/${invoices.length}`, sub: 'Invoices paid in full', onClick: () => setStatusFilter(s => s === 'SETTLED' ? 'ALL' : 'SETTLED'), active: statusFilter === 'SETTLED' },
                ]}
            />

            <main className="max-w-[1440px] mx-auto px-6 md:px-12 py-12 md:py-16">
                <section className="space-y-8">
                    <SectionHeader
                        index={activeTab === 'ledger' ? `${filtered.length} of ${invoices.length} invoices` : `${taxes.length} taxes, applied in order`}
                        title={activeTab === 'ledger' ? 'Invoices' : 'Tax Cascade'}
                    >
                        <div className="flex flex-col md:items-end gap-4 w-full md:w-auto">
                            <Segmented
                                value={activeTab}
                                onChange={setActiveTab}
                                options={[
                                    { value: 'ledger', label: 'Invoices', count: invoices.length },
                                    { value: 'taxes', label: 'Tax rates', count: taxes.length },
                                ]}
                            />
                            {activeTab === 'ledger' && (
                                <SearchField value={search} onChange={setSearch} placeholder="Search guest, room or invoice" />
                            )}
                        </div>
                    </SectionHeader>

                    {loading ? (
                        <Loading label="Loading billing" />
                    ) : error ? (
                        <div className="py-12 flex flex-col items-center gap-4">
                            <p className="font-jakarta text-[15px] text-red-700">{error}</p>
                            <Btn onClick={fetchData}>Try again</Btn>
                        </div>
                    ) : activeTab === 'ledger' ? (
                        /* ── Invoices ─────────────────────────────────────────── */
                        <div className="space-y-6">
                            <Toolbar>
                                <FilterSelect label="Status" value={statusFilter} onChange={v => setStatusFilter(v as StatusFilter)}>
                                    <option value="ALL">All statuses</option>
                                    <option value="OPEN">Open</option>
                                    <option value="PARTIALLY_PAID">Partly paid</option>
                                    <option value="SETTLED">Settled</option>
                                </FilterSelect>
                            </Toolbar>

                            {filtered.length === 0 ? (
                                <Empty>{search.trim() ? `No invoices match “${search.trim()}”.` : 'No invoices in this view.'}</Empty>
                            ) : (
                                <div className={tbl.wrap}>
                                    <table className={`${tbl.table} min-w-[1024px]`}>
                                        <thead>
                                            <tr className={tbl.headRow}>
                                                {isAdminOrDba && selectedBranch === 'ALL' && <th className={tbl.th}>Property</th>}
                                                <th className={tbl.th}>Guest</th>
                                                <th className={tbl.th}>Room</th>
                                                <th className={tbl.th}>Stay</th>
                                                <th className={`${tbl.th} text-right`}>Total</th>
                                                <th className={`${tbl.th} text-right`}>Paid</th>
                                                <th className={`${tbl.th} text-right`}>Balance</th>
                                                <th className={tbl.th}>Status</th>
                                                <th className={tbl.th}><span className="sr-only">Actions</span></th>
                                            </tr>
                                        </thead>
                                        <tbody className={tbl.body}>
                                            {filtered.map((inv, idx) => {
                                                const range = fmtStayRange(inv.check_in_date, inv.check_out_date);
                                                const balance = toNum(inv.balance_due);
                                                return (
                                                    <tr key={`${inv.invoice_id}-${inv.booking_room_id || inv.room_number || idx}`} className={tbl.row}>
                                                        {isAdminOrDba && selectedBranch === 'ALL' && (
                                                            <td className={`${tbl.td} whitespace-nowrap`}>
                                                                <span className="font-cinzel text-[14px] text-ink">{inv.branch_name || '—'}</span>
                                                            </td>
                                                        )}
                                                        <td className={`${tbl.td} max-w-[240px]`}>
                                                            <p className="text-[15px] truncate">{inv.guest_name}</p>
                                                            <p className={`${tbl.sub} truncate`}>{inv.guest_email}</p>
                                                        </td>
                                                        <td className={tbl.td}>
                                                            <p className="font-cinzel text-[20px] leading-none">{inv.room_number}</p>
                                                            <p className={tbl.sub}>{inv.room_type_name}</p>
                                                        </td>
                                                        <td className={`${tbl.td} whitespace-nowrap tabular-nums`}>
                                                            {range.from} <span className="text-ink/50" aria-hidden>→</span> {range.to}
                                                            <p className={tbl.sub}>{inv.nights} night{inv.nights !== 1 ? 's' : ''}</p>
                                                        </td>
                                                        <td className={`${tbl.td} text-right tabular-nums whitespace-nowrap`}>{fmtLKR(inv.total_amount)}</td>
                                                        <td className={`${tbl.td} text-right tabular-nums whitespace-nowrap`}>{fmtLKR(inv.total_paid)}</td>
                                                        <td className={`${tbl.td} text-right tabular-nums whitespace-nowrap ${balance > 0 ? 'font-medium' : 'text-ink/70'}`}>{fmtLKR(balance)}</td>
                                                        <td className={tbl.td}><StatusDot status={inv.status} label={STATUS_LABEL[inv.status]} /></td>
                                                        <td className={`${tbl.td} pr-0`}>
                                                            <div className="flex items-center justify-end gap-2">
                                                                <Btn onClick={() => { setSelectedInvoice(inv); setShowTaxModal(true); }}>View</Btn>
                                                                {inv.status !== 'SETTLED' && (
                                                                    <Btn variant="primary" onClick={() => openPay(inv)}>Pay</Btn>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* ── Tax cascade ──────────────────────────────────────── */
                        taxes.length === 0 ? (
                            <Empty>No tax rates configured.</Empty>
                        ) : (
                            <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-t border-l border-skynest-hairline">
                                {taxes.map((tax, i) => (
                                    <li key={tax.tax_id} className="p-6 border-r border-b border-skynest-hairline space-y-4">
                                        <div className="flex items-center justify-between gap-4">
                                            <span className="font-jakarta text-[11px] font-medium tracking-[0.16em] uppercase text-ink/70">Step {i + 1}</span>
                                            <StatusDot status={tax.is_active ? 'ACTIVE' : 'INACTIVE'} label={tax.is_active ? 'Active' : 'Inactive'} />
                                        </div>
                                        <p className="font-cinzel text-[40px] leading-none text-ink tabular-nums">{pct(tax.tax_percentage)}%</p>
                                        <div className="font-jakarta">
                                            <p className="text-[15px] text-ink">{tax.tax_name}</p>
                                            <p className="mt-1 text-[12px] text-ink/70">
                                                From {fmtDay(tax.effective_from)}{tax.effective_to ? ` until ${fmtDay(tax.effective_to)}` : ''}
                                            </p>
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        )
                    )}
                </section>
            </main>

            {/* ── Invoice modal ─────────────────────────────────────────────────── */}
            {showTaxModal && selectedInvoice && (() => {
                const range = fmtStayRange(selectedInvoice.check_in_date, selectedInvoice.check_out_date);
                const lines = [
                    { label: 'Room charge', amount: selectedInvoice.base_amount },
                    { label: 'Service charge', amount: selectedInvoice.sc_amount },
                    { label: 'Tourism development levy', amount: selectedInvoice.tdl_amount },
                    { label: 'SSCL', amount: selectedInvoice.sscl_amount },
                    { label: 'VAT', amount: selectedInvoice.vat_amount },
                ];
                return (
                    <Modal
                        eyebrow={`Invoice · Room ${selectedInvoice.room_number}`}
                        title={selectedInvoice.guest_name}
                        onClose={() => setShowTaxModal(false)}
                        footer={
                            <div className="flex items-center justify-between w-full">
                                <Btn variant="ghost" onClick={() => handlePrintInvoice(selectedInvoice)}>
                                    <Printer className="w-4 h-4 mr-1.5" />
                                    Print / PDF Bill
                                </Btn>
                                <div className="flex items-center gap-2">
                                    <Btn variant="ghost" onClick={() => setShowTaxModal(false)}>Close</Btn>
                                    {selectedInvoice.status !== 'SETTLED' && (
                                        <Btn variant="primary" onClick={() => { setShowTaxModal(false); openPay(selectedInvoice); }}>Record payment</Btn>
                                    )}
                                </div>
                            </div>
                        }

                    >
                        <p className="font-jakarta text-[13px] text-ink/70">
                            {selectedInvoice.branch_name} · {range.from} → {range.to} · {selectedInvoice.nights} night{selectedInvoice.nights !== 1 ? 's' : ''}
                        </p>

                        <dl className="font-jakarta text-[13px] divide-y divide-skynest-hairline border-y border-skynest-hairline">
                            {lines.map((row, i) => (
                                <div key={row.label} className="flex items-center justify-between py-2">
                                    <dt className={i === 0 ? 'text-ink' : 'text-ink/70 pl-4'}>{row.label}</dt>
                                    <dd className="tabular-nums text-ink">{fmtLKR(row.amount)}</dd>
                                </div>
                            ))}
                        </dl>

                        <div className="flex items-baseline justify-between">
                            <span className="font-jakarta text-[11px] font-medium tracking-[0.12em] uppercase text-ink/70">Total</span>
                            <span className="font-cinzel text-[28px] text-ink tabular-nums">{fmtLKR(selectedInvoice.total_amount)}</span>
                        </div>

                        <dl className="font-jakarta text-[13px] space-y-2">
                            <div className="flex items-center justify-between">
                                <dt className="text-ink/70">Paid</dt>
                                <dd className="tabular-nums text-ink">{fmtLKR(selectedInvoice.total_paid)}</dd>
                            </div>
                            <div className="flex items-center justify-between">
                                <dt className="text-ink/70">Balance due</dt>
                                <dd className="tabular-nums text-ink font-medium">{fmtLKR(selectedInvoice.balance_due)}</dd>
                            </div>
                            <div className="flex items-center justify-between pt-2">
                                <dt className="text-ink/70">Status</dt>
                                <dd><StatusDot status={selectedInvoice.status} label={STATUS_LABEL[selectedInvoice.status]} /></dd>
                            </div>
                        </dl>
                    </Modal>
                );
            })()}

            {/* ── Record payment modal ──────────────────────────────────────────── */}
            {showPayModal && selectedInvoice && (
                <Modal
                    eyebrow="Payment"
                    title="Record payment"
                    onClose={() => { setShowPayModal(false); setPayError(null); }}
                    footer={
                        <>
                            <Btn variant="ghost" onClick={() => { setShowPayModal(false); setPayError(null); }} disabled={payLoading}>Cancel</Btn>
                            <Btn
                                variant="primary"
                                onClick={handleRecordPayment}
                                loading={payLoading}
                                disabled={!payAmount || parseFloat(payAmount) <= 0}
                            >
                                Confirm payment
                            </Btn>
                        </>
                    }
                >
                    <div className="flex items-baseline justify-between gap-4 pb-4 border-b border-skynest-hairline font-jakarta">
                        <span className="text-[15px] text-ink">{selectedInvoice.guest_name}</span>
                        <span className="text-[13px] text-ink/70">
                            Balance <span className="text-ink font-medium tabular-nums">{fmtLKR(selectedInvoice.balance_due)}</span>
                        </span>
                    </div>

                    <Field
                        label="Amount ($)"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={payAmount}
                        onChange={e => setPayAmount(e.target.value)}
                        placeholder="0.00"
                    />

                    <div className="flex flex-col gap-2">
                        <span className="font-jakarta text-[11px] font-medium tracking-[0.12em] uppercase text-ink/70">Method</span>
                        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Payment method">
                            {PAY_METHODS.map(m => {
                                const active = payMethod === m.value;
                                const Icon = m.icon;
                                return (
                                    <button
                                        key={m.value}
                                        type="button"
                                        role="radio"
                                        aria-checked={active}
                                        onClick={() => setPayMethod(m.value)}
                                        className={`flex flex-col items-center gap-2 py-4 rounded-[4px] border font-jakarta text-[11px] font-medium tracking-[0.12em] uppercase transition-colors duration-300 ${active ? 'border-ink bg-ink text-white' : 'border-skynest-hairline text-ink/70 hover:border-ink/30 hover:text-ink'
                                            }`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        {m.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {payError && (
                        <p className="font-jakarta text-[13px] text-red-700">{payError}</p>
                    )}
                </Modal>
            )}
        </>
    );
}
