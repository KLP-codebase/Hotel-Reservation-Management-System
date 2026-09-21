"use client";

import { useState, useEffect } from "react";
import {
  X, Receipt, CreditCard, DollarSign, Printer, CheckCircle2,
  AlertCircle, Building, Calendar, User, ShieldCheck, Check,
  Hotel, FileText, Clock, Phone, Mail
} from "lucide-react";
import { apiFetch, toNum } from "@/lib/api-client";

interface PaymentRecord {
  payment_id:       string;
  amount:           number;
  payment_date:     string;
  payment_method:   string;
  reference_number?: string | null;
  notes?:           string | null;
}

interface TaxCascadeBreakdown {
  room_charges:       number;
  service_charges:    number;
  base_amount:        number;
  service_charge_tax: number;
  tdl_amount:         number;
  ssc_amount:         number;
  vat_amount:         number;
  total_amount:       number;
  total_paid:         number;
  balance_due:        number;
  status:             "OPEN" | "PARTIALLY_PAID" | "SETTLED";
}

interface InvoiceData {
  invoice_id:      string;
  booking_id:      string;
  booking_room_id: string;
  guest_name:      string;
  guest_email:     string;
  guest_phone?:    string | null;
  room_number:     string;
  room_type_name:  string;
  check_in_date:   string;
  check_out_date:  string;
  nights:          number;
  rate_at_booking: number;
  breakdown:       TaxCascadeBreakdown;
  services:        Array<{
    usage_id:         string;
    service_name:     string;
    category:         string;
    quantity:         number;
    price_at_usage:   number;
    total_price:      number;
    used_at:          string;
    notes?:           string | null;
    meal_time?:       string | null;
    appointment_time?: string | null;
  }>;
  payments:        PaymentRecord[];
}

interface TotalBillModalProps {
  isOpen:         boolean;
  onClose:        () => void;
  booking:        any | null;
  onPaymentSaved: () => void;
  initialMode?:   "invoice" | "pay";
}

interface OrderedLineItem {
  id:          string;
  itemNumber:  number;
  date:        string;
  category:    string;
  description: string;
  details?:    string;
  unitPrice:   number;
  quantity:    number;
  totalPrice:  number;
}

function formatDateClean(dStr: string | null | undefined): string {
  if (!dStr) return "—";
  try {
    const d = new Date(dStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }
  } catch {}
  return String(dStr).replace("T", " ").replace("Z", "").split(".")[0];
}

export function TotalBillModal({ isOpen, onClose, booking, onPaymentSaved, initialMode = "invoice" }: TotalBillModalProps) {
  const [activeTab, setActiveTab]         = useState<"invoice" | "pay">(initialMode);
  const [invoice, setInvoice]             = useState<InvoiceData | null>(null);
  const [loading, setLoading]             = useState(false);
  const [payAmount, setPayAmount]         = useState<string>("");
  const [payMethod, setPayMethod]         = useState<"CREDIT_CARD" | "CASH" | "BANK_TRANSFER" | "ONLINE">("CREDIT_CARD");
  const [payRef, setPayRef]               = useState<string>("");
  const [payNotes, setPayNotes]           = useState<string>("");
  const [submittingPay, setSubmittingPay] = useState(false);
  const [statusMsg, setStatusMsg]         = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchInvoice = async () => {
    if (!booking) return;
    setLoading(true);
    try {
      const res = await apiFetch<{ success: boolean; data: InvoiceData }>(
        `/api/v1/invoices/${booking.booking_id}`
      );
      if (res.success && res.data) {
        setInvoice(res.data);
        if (res.data.breakdown.balance_due > 0) {
          setPayAmount(toNum(res.data.breakdown.balance_due).toFixed(2));
        } else {
          setPayAmount("");
        }
      }
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Failed to load room bill details." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && booking) {
      setActiveTab(initialMode || "invoice");
      fetchInvoice();
      setStatusMsg(null);
      setPayRef(`REC-${Date.now().toString().slice(-6)}`);
      setPayNotes("");
    }
  }, [isOpen, booking, initialMode]);

  if (!isOpen || !booking) return null;

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(payAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setStatusMsg({ type: "error", text: "Please enter a valid payment amount." });
      return;
    }

    setSubmittingPay(true);
    setStatusMsg(null);

    try {
      await apiFetch(`/api/v1/invoices/${booking.booking_id}/payments`, {
        method: "POST",
        body: JSON.stringify({
          amount:           amountNum,
          payment_method:   payMethod,
          reference_number: payRef.trim() || undefined,
          notes:            payNotes.trim() || undefined,
        }),
      });

      setStatusMsg({ type: "success", text: `Payment of $${toNum(amountNum).toFixed(2)} recorded successfully!` });
      await fetchInvoice();
      onPaymentSaved();
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Failed to record payment." });
    } finally {
      setSubmittingPay(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const b = invoice?.breakdown;
  const todayStr = new Date().toISOString().split("T")[0];
  const isDepartingToday = invoice ? (
    invoice.check_out_date <= todayStr ||
    booking?.booking_status === "CHECKED_OUT"
  ) : false;

  // Rule: "Paid in Full (Settled)" status applies strictly for guests departing today or checked out
  const isPaidInFullAndSettled = isDepartingToday && (b?.status === "SETTLED" || (b && b.balance_due <= 0 && b.total_paid > 0));
  const isCurrentChargesClearedInHouse = !isDepartingToday && b && b.balance_due <= 0 && b.total_paid > 0;

  // ── Construct One-by-One Ordered Line Items ─────────────────────────────────
  const orderedLineItems: OrderedLineItem[] = [];
  if (invoice && b) {
    // 1. Room accommodation line item
    orderedLineItems.push({
      id:          "room-tariff-charge",
      itemNumber:  1,
      date:        formatDateClean(invoice.check_in_date),
      category:    "Accommodation",
      description: `Room Accommodation — ${invoice.room_type_name} (Room ${invoice.room_number})`,
      details:     `${invoice.nights} Night${invoice.nights === 1 ? "" : "s"} (${formatDateClean(invoice.check_in_date)} to ${formatDateClean(invoice.check_out_date)})`,
      unitPrice:   invoice.rate_at_booking,
      quantity:    invoice.nights,
      totalPrice:  b.room_charges,
    });

    // 2. Ordered services line items (Dining, Spa, Housekeeping, Transport)
    invoice.services.forEach((s, idx) => {
      let details = "";
      if (s.appointment_time) {
        details = `Appointment Slot: ${s.appointment_time}`;
      } else if (s.meal_time) {
        details = `Meal Service: ${s.meal_time}`;
      }
      if (s.notes) {
        details = details ? `${details} | ${s.notes}` : s.notes;
      }

      orderedLineItems.push({
        id:          s.usage_id,
        itemNumber:  idx + 2,
        date:        formatDateClean(s.used_at),
        category:    s.category,
        description: s.service_name,
        details:     details || undefined,
        unitPrice:   s.price_at_usage,
        quantity:    s.quantity,
        totalPrice:  s.total_price,
      });
    });
  }

  // Branch info
  const branchName = booking.branch_name || "Sky Nest Colombo";
  const branchAddress = branchName.includes("Galle")
    ? "12 Fort Road, Galle Fort, Southern Province, Sri Lanka"
    : branchName.includes("Kandy")
    ? "45 Lake Road, Kandy, Central Province, Sri Lanka"
    : "100 Galle Road, Colombo 03, Western Province, Sri Lanka";
  const branchPhone = branchName.includes("Galle")
    ? "+94 91 200 0000"
    : branchName.includes("Kandy")
    ? "+94 81 200 0000"
    : "+94 11 200 0000";
  const branchEmail = branchName.includes("Galle")
    ? "galle@skynest.lk"
    : branchName.includes("Kandy")
    ? "kandy@skynest.lk"
    : "colombo@skynest.lk";

  // Payment Form Element reusable block
  const paymentFormComponent = b && (
    <div className="border border-skynest-hairline rounded-[4px] p-5 bg-ink/[0.015] print-hidden-element">
      <form onSubmit={handleRecordPayment} className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-skynest-hairline">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-skynest-accent" />
            <h4 className="font-cinzel text-xs font-bold text-ink uppercase tracking-wider">
              Front Desk Payment Processing
            </h4>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-jakarta text-ink/60">
              Total Invoiced: <strong className="font-mono text-ink">${toNum(b.total_amount).toFixed(2)}</strong>
            </span>
            <span className={`text-xs font-jakarta font-semibold px-2 py-0.5 rounded ${
              b.balance_due > 0 ? "bg-amber-100 text-amber-900 border border-amber-200" : "bg-emerald-100 text-emerald-900 border border-emerald-200"
            }`}>
              Balance Due: ${toNum(b.balance_due).toFixed(2)}
            </span>
          </div>
        </div>

        {!isDepartingToday && (
          <div className="p-2.5 rounded bg-sky-50/70 border border-sky-200 text-sky-800 text-[11px] font-jakarta flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-sky-600 shrink-0" />
            <span>
              <strong>In-House Stay Notice:</strong> Departure is scheduled for <strong>{formatDateClean(invoice?.check_out_date)}</strong>. Final <em>Paid in Full (Settled)</em> status will be stamped on departure day.
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-jakarta font-semibold text-ink/60 uppercase tracking-wider">
                Amount ($ USD)
              </label>
              {b.balance_due > 0 && (
                <button
                  type="button"
                  onClick={() => setPayAmount(toNum(b.balance_due).toFixed(2))}
                  className="text-[10px] font-jakarta text-skynest-accent hover:underline font-semibold"
                >
                  Pay Full Balance
                </button>
              )}
            </div>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              placeholder="0.00"
              className="w-full text-xs font-jakarta p-2.5 rounded-[3px] border border-skynest-hairline bg-paper focus:outline-none focus:border-skynest-accent font-mono"
              required
            />
          </div>

          <div>
            <label className="text-[11px] font-jakarta font-semibold text-ink/60 uppercase tracking-wider block mb-1">
              Payment Method
            </label>
            <select
              value={payMethod}
              onChange={(e) => setPayMethod(e.target.value as any)}
              className="w-full text-xs font-jakarta p-2.5 rounded-[3px] border border-skynest-hairline bg-paper focus:outline-none focus:border-skynest-accent"
            >
              <option value="CREDIT_CARD">Credit Card (POS Terminal)</option>
              <option value="CASH">Cash (Front Desk Cashier)</option>
              <option value="BANK_TRANSFER">Bank Wire / BOC Transfer</option>
              <option value="ONLINE">Online Gateway</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-jakarta font-semibold text-ink/60 uppercase tracking-wider block mb-1">
              Transaction Reference #
            </label>
            <input
              type="text"
              value={payRef}
              onChange={(e) => setPayRef(e.target.value)}
              placeholder="e.g. TXN-CC-99120"
              className="w-full text-xs font-jakarta p-2.5 rounded-[3px] border border-skynest-hairline bg-paper focus:outline-none focus:border-skynest-accent font-mono"
            />
          </div>
        </div>

        <div>
          <label className="text-[11px] font-jakarta font-semibold text-ink/60 uppercase tracking-wider block mb-1">
            Payment Remarks / Folio Notes
          </label>
          <input
            type="text"
            value={payNotes}
            onChange={(e) => setPayNotes(e.target.value)}
            placeholder="e.g. Deposit tranche, settlement at departure..."
            className="w-full text-xs font-jakarta p-2.5 rounded-[3px] border border-skynest-hairline bg-paper focus:outline-none focus:border-skynest-accent"
          />
        </div>

        <div className="flex items-center justify-end pt-2">
          <button
            type="submit"
            disabled={submittingPay || !payAmount || parseFloat(payAmount) <= 0}
            className="py-2.5 px-6 bg-ink text-paper rounded-[3px] font-jakarta text-xs font-semibold tracking-wider uppercase hover:bg-skynest-accent transition-colors disabled:opacity-40 flex items-center gap-1.5 shadow-xs"
          >
            {submittingPay ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-paper border-t-transparent rounded-full animate-spin" />
                Recording Payment...
              </>
            ) : (
              <>
                <CreditCard className="w-3.5 h-3.5 text-skynest-accent" />
                Record Payment Tranche
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );

  // Authentic Tax Invoice Printable Sheet
  const invoiceSheetComponent = invoice && b && (
    <div
      id="printable-invoice-container"
      className="bg-white border border-skynest-hairline rounded-[2px] p-6 sm:p-8 shadow-xs text-ink font-jakarta"
    >
      {/* 1. Official Invoice Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-skynest-hairline">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded bg-ink flex items-center justify-center text-white shrink-0">
              <Hotel className="w-5 h-5 text-skynest-accent" />
            </div>
            <div>
              <h1 className="font-cinzel text-xl font-bold tracking-widest text-ink uppercase">
                Sky Nest
              </h1>
              <p className="font-jakarta text-[9px] tracking-widest uppercase text-skynest-accent font-semibold">
                Luxury Hotels & Resorts
              </p>
            </div>
          </div>

          <div className="mt-3 text-xs text-ink/70 space-y-0.5 font-jakarta">
            <p className="font-semibold text-ink">{branchName}</p>
            <p>{branchAddress}</p>
            <p>Tel: {branchPhone} | Email: {branchEmail}</p>
            <p className="text-[11px] text-ink/50 pt-1">
              VAT Reg No: <strong className="font-mono text-ink">104588920-7000</strong> | TIN: <strong className="font-mono text-ink">98120455</strong>
            </p>
          </div>
        </div>

        <div className="text-left sm:text-right">
          <span className="inline-block px-2.5 py-1 rounded bg-ink/[0.04] border border-skynest-hairline font-cinzel text-xs font-bold tracking-widest text-ink uppercase mb-2">
            Official Tax Invoice
          </span>
          <p className="font-mono text-sm font-bold text-ink">
            INV-{invoice.booking_id.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase()}
          </p>
          <p className="text-xs text-ink/60 mt-1">
            Date of Issue: <span className="font-medium text-ink">{new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</span>
          </p>
          <p className="text-xs text-ink/60">
            Folio Ref: <span className="font-mono font-medium text-ink">FOL-{invoice.room_number || "101"}</span>
          </p>
          <div className="mt-2">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded border ${
                isPaidInFullAndSettled
                  ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                  : isCurrentChargesClearedInHouse
                  ? "bg-sky-50 text-sky-800 border-sky-300"
                  : b.total_paid > 0
                  ? "bg-amber-50 text-amber-800 border-amber-300"
                  : "bg-rose-50 text-rose-800 border-rose-300"
              }`}
            >
              {isPaidInFullAndSettled ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" />
                  PAID IN FULL (SETTLED)
                </>
              ) : isCurrentChargesClearedInHouse ? (
                <>
                  <Clock className="w-3 h-3 text-sky-600" />
                  IN-HOUSE (CHARGES CLEARED)
                </>
              ) : b.total_paid > 0 ? (
                "PARTIALLY PAID (INTERIM)"
              ) : (
                "PAYMENT OPEN (INTERIM)"
              )}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Billed To & Stay Credentials */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-5 border-b border-skynest-hairline bg-ink/[0.01] px-4 my-4 rounded">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-ink/40 block mb-1">
            Billed To (Resident Guest)
          </span>
          <p className="font-jakarta font-bold text-sm text-ink">{invoice.guest_name}</p>
          <p className="text-xs text-ink/70 mt-0.5">{invoice.guest_email}</p>
          {invoice.guest_phone && (
            <p className="text-xs text-ink/70 font-mono mt-0.5">{invoice.guest_phone}</p>
          )}
        </div>

        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-ink/40 block mb-1">
            Stay & Room Particulars
          </span>
          <p className="text-xs font-semibold text-ink">
            Room {invoice.room_number} — <span className="text-skynest-accent">{invoice.room_type_name}</span>
          </p>
          <p className="text-xs text-ink/70 mt-0.5">
            Check-In: <strong className="text-ink">{formatDateClean(invoice.check_in_date)}</strong>
          </p>
          <p className="text-xs text-ink/70">
            Check-Out: <strong className="text-ink">{formatDateClean(invoice.check_out_date)}</strong> ({invoice.nights} Night{invoice.nights === 1 ? "" : "s"})
          </p>
        </div>
      </div>

      {/* 3. Itemized Charges Table */}
      <div className="mt-4">
        <h4 className="font-cinzel text-xs font-bold text-ink uppercase tracking-wider mb-2">
          Itemized Charges & Services
        </h4>
        <div className="border border-skynest-hairline rounded overflow-hidden">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-ink/[0.03] border-b border-skynest-hairline text-ink/60 uppercase tracking-wider font-semibold text-[10px]">
                <th className="py-2.5 px-3 w-8 text-center">#</th>
                <th className="py-2.5 px-3 w-24">Date</th>
                <th className="py-2.5 px-3 w-28">Category</th>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3 w-20 text-right">Unit Rate</th>
                <th className="py-2.5 px-3 w-12 text-center">Qty</th>
                <th className="py-2.5 px-3 w-24 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-skynest-hairline font-jakarta">
              {orderedLineItems.map((item) => (
                <tr key={item.id} className="hover:bg-ink/[0.01]">
                  <td className="py-2.5 px-3 text-center text-ink/40 font-mono text-[11px]">
                    {item.itemNumber}
                  </td>
                  <td className="py-2.5 px-3 text-ink/60 font-mono text-[11px] whitespace-nowrap">
                    {item.date}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-semibold uppercase tracking-wider ${
                      item.category === "Accommodation"
                        ? "bg-sky-50 text-sky-800"
                        : item.category === "Dining"
                        ? "bg-amber-50 text-amber-800"
                        : "bg-purple-50 text-purple-800"
                    }`}>
                      {item.category}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <p className="font-semibold text-ink">{item.description}</p>
                    {item.details && (
                      <p className="text-[11px] text-ink/50 italic mt-0.5">
                        {item.details}
                      </p>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-ink/70">
                    ${toNum(item.unitPrice).toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono">
                    {item.quantity}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold text-ink">
                    ${toNum(item.totalPrice).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Statutory 4-Tier Tax Cascade & Invoice Totals */}
      <div className="mt-6 flex flex-col sm:flex-row justify-end">
        <div className="w-full sm:w-80 space-y-2 text-xs font-jakarta bg-ink/[0.015] p-4 rounded border border-skynest-hairline">
          <div className="flex items-center justify-between pb-1.5 border-b border-skynest-hairline">
            <span className="text-ink/60">Base Subtotal (Room & Services):</span>
            <span className="font-mono font-semibold text-ink">${toNum(b.base_amount).toFixed(2)}</span>
          </div>

          <div className="flex items-center justify-between text-ink/70">
            <span>Service Charge (10%):</span>
            <span className="font-mono">+${toNum(b.service_charge_tax).toFixed(2)}</span>
          </div>

          <div className="flex items-center justify-between text-ink/70">
            <span>Tourism Dev. Levy (TDL 1%):</span>
            <span className="font-mono">+${toNum(b.tdl_amount).toFixed(2)}</span>
          </div>

          <div className="flex items-center justify-between text-ink/70">
            <span>SSCL (2.5%):</span>
            <span className="font-mono">+${toNum(b.ssc_amount).toFixed(2)}</span>
          </div>

          <div className="flex items-center justify-between text-ink/70 pb-2 border-b border-skynest-hairline">
            <span>VAT (18%):</span>
            <span className="font-mono">+${toNum(b.vat_amount).toFixed(2)}</span>
          </div>

          <div className="flex items-center justify-between pt-1 font-bold text-sm text-ink">
            <span className="font-cinzel">Total Invoice:</span>
            <span className="font-mono text-base text-ink">${toNum(b.total_amount).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* 5. Payments & Credits Ledger (Line by Line) */}
      <div className="mt-8 pt-6 border-t border-skynest-hairline">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-cinzel text-xs font-bold text-ink uppercase tracking-wider">
            Payments & Credits Ledger (Rule B12)
          </h4>
          <span className="text-[11px] text-ink/40">
            {invoice.payments.length} payment tranche{invoice.payments.length === 1 ? "" : "s"}
          </span>
        </div>

        {invoice.payments.length === 0 ? (
          <p className="text-xs text-ink/40 italic py-2">
            No payments or advance deposits recorded for this reservation.
          </p>
        ) : (
          <div className="border border-skynest-hairline rounded overflow-hidden">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-ink/[0.03] border-b border-skynest-hairline text-ink/60 uppercase tracking-wider font-semibold text-[10px]">
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Payment Method</th>
                  <th className="py-2 px-3">Reference</th>
                  <th className="py-2 px-3 text-right">Amount Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-skynest-hairline font-jakarta">
                {invoice.payments.map((p) => (
                  <tr key={p.payment_id} className="hover:bg-ink/[0.01]">
                    <td className="py-2 px-3 font-mono text-[11px] text-ink/70">
                      {formatDateClean(p.payment_date)}
                    </td>
                    <td className="py-2 px-3 font-semibold text-ink">
                      {p.payment_method.replace(/_/g, " ")}
                    </td>
                    <td className="py-2 px-3 font-mono text-[11px] text-ink/50">
                      {p.reference_number || "—"}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-semibold text-emerald-700">
                      ${toNum(p.amount).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded bg-ink/[0.02] border border-skynest-hairline">
          <div>
            <p className="text-xs text-ink/60">
              Total Payments Credited: <strong className="font-mono text-ink">${toNum(b.total_paid).toFixed(2)}</strong>
            </p>
            <p className="text-[11px] text-ink/40">
              Remaining Folio Balance: <strong className={`font-mono ${b.balance_due > 0 ? "text-skynest-accent font-bold" : "text-emerald-700"}`}>${toNum(b.balance_due).toFixed(2)}</strong>
            </p>
          </div>

          <div className="text-right">
            <p className="font-cinzel text-xs font-bold text-ink uppercase tracking-wider">
              {isPaidInFullAndSettled
                ? "Account Settled in Full"
                : isCurrentChargesClearedInHouse
                ? "Interim Charges Cleared"
                : b.balance_due > 0
                ? "Payment Due at Front Desk"
                : "Folio Balance Clear"}
            </p>
            <span className="font-jakarta text-[11px] text-ink/50">
              Authorized Hotel Cashier Signature Stamped
            </span>
          </div>
        </div>
      </div>

      {/* Official Legal Footer on Print */}
      <div className="mt-8 pt-4 border-t border-skynest-hairline text-center text-[10px] text-ink/40 space-y-0.5">
        <p>This document is an authentic computerized tax invoice issued under Inland Revenue Department regulations of Sri Lanka.</p>
        <p>Goods and services consumed during stay are charged in compliance with national tourism development provisions.</p>
        <p className="font-mono text-[9px] pt-1">Sky Nest Management System • System-Generated Final Folio • Reference: {invoice.invoice_id}</p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-ink/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      {/* Print Specific CSS to isolate the invoice sheet onto physical paper */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-invoice-container, #printable-invoice-container * {
            visibility: visible;
          }
          #printable-invoice-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
            background: white !important;
            color: black !important;
            border: none !important;
            box-shadow: none !important;
          }
          .print-hidden-element {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-paper border border-skynest-hairline rounded-[4px] shadow-2xl w-full max-w-4xl max-h-[96vh] flex flex-col overflow-hidden my-auto">
        {/* Modal Top Control Bar (Hidden on Print) */}
        <div className="px-6 py-3.5 border-b border-skynest-hairline bg-paper flex items-center justify-between shrink-0 print-hidden-element">
          <div className="flex items-center gap-3">
            <span className="p-1.5 rounded bg-skynest-accent/10 text-skynest-accent">
              <Receipt className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-cinzel text-sm font-bold text-ink tracking-wide">
                {activeTab === "pay" ? "Front Desk Payment Terminal" : "Official Tax Invoice"}
              </h3>
              <p className="font-jakarta text-[11px] text-ink/50">
                Room {booking.room_number || "—"} • {booking.guest_first_name} {booking.guest_last_name}
              </p>
            </div>
          </div>

          {/* Mode Switch Tabs */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 p-0.5 bg-ink/[0.04] rounded-[4px] border border-skynest-hairline">
              <button
                type="button"
                onClick={() => setActiveTab("invoice")}
                className={`px-3 py-1 rounded-[3px] font-jakarta text-xs font-semibold tracking-wider uppercase transition-all flex items-center gap-1.5 ${
                  activeTab === "invoice"
                    ? "bg-ink text-paper shadow-xs"
                    : "text-ink/60 hover:text-ink"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Invoice
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("pay")}
                className={`px-3 py-1 rounded-[3px] font-jakarta text-xs font-semibold tracking-wider uppercase transition-all flex items-center gap-1.5 ${
                  activeTab === "pay"
                    ? "bg-skynest-accent text-paper shadow-xs"
                    : "text-ink/60 hover:text-ink"
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                Pay
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-[3px] bg-paper border border-skynest-hairline text-ink hover:border-skynest-accent hover:text-skynest-accent transition-colors flex items-center gap-1.5 text-xs font-jakarta font-semibold tracking-wider uppercase shadow-xs"
              title="Print official tax invoice"
            >
              <Printer className="w-3.5 h-3.5 text-skynest-accent" />
              <span>Print</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded text-ink/40 hover:text-ink hover:bg-ink/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {statusMsg && (
            <div
              className={`p-3 rounded text-xs font-jakarta flex items-center gap-2 print-hidden-element ${
                statusMsg.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-rose-50 text-rose-800 border border-rose-200"
              }`}
            >
              {statusMsg.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {loading || !invoice || !b ? (
            <div className="py-24 text-center text-ink/40">
              <div className="w-6 h-6 border-2 border-skynest-accent border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="font-jakarta text-xs">Generating official guest invoice & tax cascade...</p>
            </div>
          ) : (
            <>
              {/* If in Pay mode: show Payment Processing first */}
              {activeTab === "pay" && (
                <>
                  {paymentFormComponent}
                  <div className="pt-2">
                    <h4 className="font-cinzel text-xs font-bold text-ink uppercase tracking-wider mb-3">
                      Accompanying Tax Cascade Invoice Breakdown
                    </h4>
                    {invoiceSheetComponent}
                  </div>
                </>
              )}

              {/* If in Invoice mode: show Invoice sheet first */}
              {activeTab === "invoice" && (
                <>
                  {invoiceSheetComponent}
                  <div className="pt-2">
                    {paymentFormComponent}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Modal Bottom Footer (Hidden on Print) */}
        <div className="px-6 py-3.5 border-t border-skynest-hairline bg-paper flex items-center justify-between shrink-0 print-hidden-element">
          <span className="font-jakarta text-xs text-ink/40">
            Sky Nest Hotel Billing Engine & Fiscal Accounting Ledger
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-ink text-paper rounded-[3px] font-jakarta text-xs font-semibold uppercase tracking-wider hover:bg-skynest-accent transition-colors flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Invoice
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-skynest-hairline text-ink/70 hover:text-ink rounded-[3px] font-jakarta text-xs font-medium hover:bg-ink/5 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
