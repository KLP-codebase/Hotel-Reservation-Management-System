"use client";
import { printTaxInvoice } from '@/lib/invoice-print';

import { useState, useEffect } from "react";
import {
  X, Receipt, CreditCard, DollarSign, Printer, Download, CheckCircle2,
  AlertCircle, Building, Calendar, User, ShieldCheck, Check,
  Hotel, FileText, Clock, Phone, Mail, Layers
} from "lucide-react";
import { apiFetch, toNum } from "@/lib/api-client";
import { formatLKR } from '@/lib/currency';

interface PaymentRecord {
  payment_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference_number?: string | null;
  notes?: string | null;
}

interface TaxCascadeBreakdown {
  room_charges: number;
  service_charges: number;
  base_amount: number;
  service_charge_tax: number;
  tdl_amount: number;
  ssc_amount: number;
  vat_amount: number;
  total_amount: number;
  total_paid: number;
  balance_due: number;
  status: "OPEN" | "PARTIALLY_PAID" | "SETTLED";
}

interface RoomSummaryItem {
  booking_room_id: string;
  room_id: string;
  room_number: string;
  room_type_name: string;
  meal_plan: string;
  meal_price_per_night: number;
  nights: number;
  rate_at_booking: number;
  room_tariff: number;
  meal_charges: number;
  room_charges: number;
  service_charges: number;
  base_amount: number;
  total_amount: number;
}

interface InvoiceData {
  invoice_id: string;
  booking_id: string;
  booking_room_id: string;
  is_consolidated?: boolean;
  view_mode?: "consolidated" | "single_room";
  rooms_count?: number;
  guest_name: string;
  guest_email: string;
  guest_phone?: string | null;
  room_number: string;
  room_type_name: string;
  meal_plan?: string;
  meal_price_per_night?: number;
  check_in_date: string;
  check_out_date: string;
  nights: number;
  rate_at_booking: number;
  breakdown: TaxCascadeBreakdown;
  rooms?: RoomSummaryItem[];
  all_rooms?: Array<{
    booking_room_id: string;
    room_number: string;
    room_type_name: string;
    meal_plan: string;
    total_amount: number;
  }>;
  services: Array<{
    usage_id: string;
    booking_room_id?: string;
    room_number?: string | null;
    service_name: string;
    category: string;
    quantity: number;
    price_at_usage: number;
    total_price: number;
    used_at: string;
    notes?: string | null;
    meal_time?: string | null;
    appointment_time?: string | null;
  }>;
  payments: PaymentRecord[];
}

interface TotalBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: any | null;
  onPaymentSaved: () => void;
  initialMode?: "invoice" | "pay";
}

interface OrderedLineItem {
  id: string;
  itemNumber: number;
  date: string;
  category: string;
  description: string;
  details?: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
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
  } catch { }
  return String(dStr).replace("T", " ").replace("Z", "").split(".")[0];
}

export function TotalBillModal({ isOpen, onClose, booking, onPaymentSaved, initialMode = "invoice" }: TotalBillModalProps) {
  const [activeTab, setActiveTab] = useState<"invoice" | "pay">(initialMode);
  const [selectedScope, setSelectedScope] = useState<"ALL" | string>("ALL");
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [generatingBill, setGeneratingBill] = useState(false);
  const [payAmount, setPayAmount] = useState<string>("");
  const [payMethod, setPayMethod] = useState<"CREDIT_CARD" | "CASH" | "BANK_TRANSFER" | "ONLINE">("CREDIT_CARD");
  const [payRef, setPayRef] = useState<string>("");
  const [payNotes, setPayNotes] = useState<string>("");
  const [submittingPay, setSubmittingPay] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchInvoice = async (scope: "ALL" | string = selectedScope) => {
    if (!booking) return;
    setLoading(true);
    try {
      const url = scope === "ALL"
        ? `/api/v1/invoices/${booking.booking_id}`
        : `/api/v1/invoices/${booking.booking_id}?booking_room_id=${scope}`;

      const res = await apiFetch<{ success: boolean; data: InvoiceData }>(url);
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
      setSelectedScope("ALL");
      fetchInvoice("ALL");
      setStatusMsg(null);
      setPayRef(`REC-${Date.now().toString().slice(-6)}`);
      setPayNotes("");
    }
  }, [isOpen, booking, initialMode]);

  if (!isOpen || !booking) return null;

  const handleScopeChange = (newScope: "ALL" | string) => {
    setSelectedScope(newScope);
    setStatusMsg(null);
    fetchInvoice(newScope);
  };

  const handleGenerateBill = async () => {
    if (!booking) return;
    setGeneratingBill(true);
    setStatusMsg(null);
    try {
      const url = selectedScope === "ALL"
        ? `/api/v1/invoices/${booking.booking_id}/generate`
        : `/api/v1/invoices/${booking.booking_id}/generate?booking_room_id=${selectedScope}`;

      const res = await apiFetch<{ success: boolean; message: string; data: InvoiceData }>(url, {
        method: "POST",
      });

      if (res.success && res.data) {
        setInvoice(res.data);
        setStatusMsg({
          type: "success",
          text: res.message || "Official final bill generated with statutory tax cascade!",
        });
        onPaymentSaved();
      }
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Failed to formalize bill." });
    } finally {
      setGeneratingBill(false);
    }
  };

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
          amount: amountNum,
          payment_method: payMethod,
          reference_number: payRef.trim() || undefined,
          notes: payNotes.trim() || undefined,
          booking_room_id: selectedScope !== "ALL" ? selectedScope : undefined,
        }),
      });

      setStatusMsg({ type: "success", text: `Payment of ${formatLKR(toNum(amountNum))} recorded successfully!` });
      await fetchInvoice(selectedScope);
      onPaymentSaved();
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Failed to record payment." });
    } finally {
      setSubmittingPay(false);
    }
  };


  const handlePrint = () => {
    if (!invoice || !b) return;

    const isConsolidated = invoice.is_consolidated || invoice.view_mode === "consolidated";
    const roomNumber = isConsolidated
      ? (invoice.rooms && invoice.rooms.length > 0 ? invoice.rooms.map(r => r.room_number).join(', ') : invoice.room_number)
      : invoice.room_number;
    const roomType = isConsolidated ? 'Consolidated Stay' : invoice.room_type_name;

    printTaxInvoice({
      invoice_id: invoice.invoice_id,
      booking_id: invoice.booking_id,
      booking_room_id: invoice.booking_room_id,
      guest_name: invoice.guest_name,
      guest_email: invoice.guest_email || 'guest@skynest.lk',
      guest_phone: invoice.guest_phone,
      room_number: roomNumber,
      room_type_name: roomType,
      branch_name: booking?.branch_name || 'Sky Nest Hotel & Luxury Residences',
      check_in_date: invoice.check_in_date,
      check_out_date: invoice.check_out_date,
      nights: invoice.nights,
      base_amount: b.base_amount,
      sc_amount: b.service_charge_tax,
      tdl_amount: b.tdl_amount,
      sscl_amount: b.ssc_amount,
      vat_amount: b.vat_amount,
      total_amount: b.total_amount,
      total_paid: b.total_paid,
      balance_due: b.balance_due,
      status: b.status,
      line_items: orderedLineItems.length > 0 ? orderedLineItems.map(item => ({
        description: item.description,
        details: item.details,
        category: item.category,
        amount: item.totalPrice,
        quantity: item.quantity,
        unitRate: item.unitPrice,
      })) : undefined,
    });
  };

  const handleSavePdf = () => {
    handlePrint();
  };


  const b = invoice?.breakdown;
  const todayStr = new Date().toISOString().split("T")[0];
  const isDepartingToday = invoice ? (
    invoice.check_out_date <= todayStr ||
    booking?.booking_status === "CHECKED_OUT"
  ) : false;

  const isPaidInFullAndSettled = isDepartingToday && (b?.status === "SETTLED" || (b && b.balance_due <= 0 && b.total_paid > 0));
  const isCurrentChargesClearedInHouse = !isDepartingToday && b && b.balance_due <= 0 && b.total_paid > 0;

  // ── Construct One-by-One Ordered Line Items ─────────────────────────────────
  const orderedLineItems: OrderedLineItem[] = [];
  if (invoice && b) {
    if (invoice.is_consolidated && invoice.rooms && invoice.rooms.length > 0) {
      // 1. Consolidated Accommodation & Meal Plan Breakdown per Room
      invoice.rooms.forEach((rm) => {
        orderedLineItems.push({
          id: `room-tariff-${rm.booking_room_id}`,
          itemNumber: orderedLineItems.length + 1,
          date: formatDateClean(invoice.check_in_date),
          category: "Accommodation",
          description: `Room Accommodation — Room ${rm.room_number} (${rm.room_type_name})`,
          details: `${rm.nights} Night${rm.nights === 1 ? "" : "s"} (${formatDateClean(invoice.check_in_date)} to ${formatDateClean(invoice.check_out_date)}) @ ${formatLKR(rm.rate_at_booking, 0)}/nt`,
          unitPrice: rm.rate_at_booking,
          quantity: rm.nights,
          totalPrice: rm.room_tariff,
        });

        if (rm.meal_charges > 0) {
          orderedLineItems.push({
            id: `room-meal-${rm.booking_room_id}`,
            itemNumber: orderedLineItems.length + 1,
            date: formatDateClean(invoice.check_in_date),
            category: "Dining",
            description: `Meal Plan: ${rm.meal_plan} — Room ${rm.room_number}`,
            details: `${rm.nights} Night${rm.nights === 1 ? "" : "s"} @ ${formatLKR(rm.meal_price_per_night, 0)}/nt`,
            unitPrice: rm.meal_price_per_night,
            quantity: rm.nights,
            totalPrice: rm.meal_charges,
          });
        }
      });
    } else {
      // Single Room Accommodation Line
      orderedLineItems.push({
        id: "room-tariff-charge",
        itemNumber: 1,
        date: formatDateClean(invoice.check_in_date),
        category: "Accommodation",
        description: `Room Accommodation — ${invoice.room_type_name} (Room ${invoice.room_number})`,
        details: `${invoice.nights} Night${invoice.nights === 1 ? "" : "s"} (${formatDateClean(invoice.check_in_date)} to ${formatDateClean(invoice.check_out_date)}) @ ${formatLKR(invoice.rate_at_booking, 0)}/nt`,
        unitPrice: invoice.rate_at_booking,
        quantity: invoice.nights,
        totalPrice: b.room_charges,
      });

      if (invoice.meal_plan && invoice.meal_plan !== "Room Only" && (invoice.meal_price_per_night ?? 0) > 0) {
        orderedLineItems.push({
          id: "room-meal-charge",
          itemNumber: 2,
          date: formatDateClean(invoice.check_in_date),
          category: "Dining",
          description: `Meal Plan: ${invoice.meal_plan} (Room ${invoice.room_number})`,
          details: `${invoice.nights} Night${invoice.nights === 1 ? "" : "s"} @ ${formatLKR(invoice.meal_price_per_night, 0)}/nt`,
          unitPrice: invoice.meal_price_per_night ?? 0,
          quantity: invoice.nights,
          totalPrice: (invoice.meal_price_per_night ?? 0) * invoice.nights,
        });
      }
    }

    // 2. Ancillary services line items
    invoice.services.forEach((s) => {
      let details = "";
      const isSpa = s.category?.toUpperCase() === "SPA";
      const dateFormatted = formatDateClean(s.used_at);
      if (s.appointment_time) {
        details = `Appointment: ${s.appointment_time}${dateFormatted && dateFormatted !== "—" ? ` on ${dateFormatted}` : ""}`;
      } else if (isSpa && dateFormatted && dateFormatted !== "—") {
        details = `Booked Spa Date: ${dateFormatted}`;
      } else if (s.meal_time) {
        details = `Meal Service: ${s.meal_time}${dateFormatted && dateFormatted !== "—" ? ` (${dateFormatted})` : ""}`;
      } else if (dateFormatted && dateFormatted !== "—") {
        details = `Service Date: ${dateFormatted}`;
      }
      if (s.notes) {
        details = details ? `${details} | ${s.notes}` : s.notes;
      }

      const serviceDesc = s.room_number ? `${s.service_name} (Room ${s.room_number})` : s.service_name;

      orderedLineItems.push({
        id: s.usage_id,
        itemNumber: orderedLineItems.length + 1,
        date: formatDateClean(s.used_at),
        category: s.category,
        description: serviceDesc,
        details: details || undefined,
        unitPrice: s.price_at_usage,
        quantity: s.quantity,
        totalPrice: s.total_price,
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
              {selectedScope === "ALL"
                ? "Payment Processing — Consolidated Booking Folio"
                : `Payment Processing — Room ${invoice?.room_number}`}
            </h4>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-jakarta text-ink/60">
              Total Invoiced: <strong className="font-mono text-ink">{formatLKR(toNum(b.total_amount))}</strong>
            </span>
            <span className={`text-xs font-jakarta font-semibold px-2 py-0.5 rounded ${b.balance_due > 0 ? "bg-amber-100 text-amber-900 border border-amber-200" : "bg-emerald-100 text-emerald-900 border border-emerald-200"
              }`}>
              Balance Due: {formatLKR(toNum(b.balance_due))}
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
                Amount (Rs)
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
      {/* Receptionist Browser PDF Notice */}
      <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded flex items-center justify-between text-xs text-ink/80 print-hidden-element">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-skynest-accent shrink-0" />
          <span>
            Official Tax Invoice ready. Click <strong>&quot;Save as PDF&quot;</strong> and select your browser&apos;s <strong>&quot;Save as PDF&quot;</strong> printer destination to download.
          </span>
        </div>
        <button
          type="button"
          onClick={handleSavePdf}
          className="px-3 py-1 bg-ink text-white rounded text-[11px] font-semibold tracking-wider uppercase flex items-center gap-1.5 hover:bg-skynest-accent transition-colors shrink-0 ml-3 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-skynest-accent" />
          <span>Save as PDF</span>
        </button>
      </div>

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
            {invoice.is_consolidated ? "Official Consolidated Tax Invoice" : "Official Single Room Tax Invoice"}
          </span>
          <p className="font-mono text-sm font-bold text-ink">
            INV-{invoice.booking_id.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase()}{invoice.is_consolidated ? "-ALL" : `-${invoice.room_number}`}
          </p>
          <p className="text-xs text-ink/60 mt-1">
            Date of Issue: <span className="font-medium text-ink">{new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</span>
          </p>
          <p className="text-xs text-ink/60">
            Folio Ref: <span className="font-mono font-medium text-ink">{invoice.is_consolidated ? `FOL-BOOKING-${invoice.rooms_count || 1}RMS` : `FOL-ROOM-${invoice.room_number || "101"}`}</span>
          </p>
          <div className="mt-2">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded border ${isPaidInFullAndSettled
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
            {invoice.is_consolidated ? (
              <span>All Rooms: <strong className="text-skynest-accent">{invoice.room_number}</strong> ({invoice.rooms_count || 1} Rooms Booked)</span>
            ) : (
              <span>Room <strong className="text-skynest-accent">{invoice.room_number}</strong> — {invoice.room_type_name}</span>
            )}
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
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-cinzel text-xs font-bold text-ink uppercase tracking-wider">
            {invoice.is_consolidated ? "Itemized Charges & Services Across All Rooms" : "Itemized Charges & Services For This Room"}
          </h4>
          <span className="text-[10px] font-jakarta text-ink/40 uppercase">
            {orderedLineItems.length} Folio Items
          </span>
        </div>
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
                    <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-semibold uppercase tracking-wider ${item.category === "Accommodation"
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
                    {formatLKR(toNum(item.unitPrice))}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono">
                    {item.quantity}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold text-ink">
                    {formatLKR(toNum(item.totalPrice))}
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
            <span className="font-mono font-semibold text-ink">{formatLKR(toNum(b.base_amount))}</span>
          </div>

          <div className="flex items-center justify-between text-ink/70">
            <span>Service Charge (10%):</span>
            <span className="font-mono">+{formatLKR(toNum(b.service_charge_tax))}</span>
          </div>

          <div className="flex items-center justify-between text-ink/70">
            <span>Tourism Dev. Levy (TDL 1%):</span>
            <span className="font-mono">+{formatLKR(toNum(b.tdl_amount))}</span>
          </div>

          <div className="flex items-center justify-between text-ink/70">
            <span>SSCL (2.5%):</span>
            <span className="font-mono">+{formatLKR(toNum(b.ssc_amount))}</span>
          </div>

          <div className="flex items-center justify-between text-ink/70 pb-2 border-b border-skynest-hairline">
            <span>VAT (18%):</span>
            <span className="font-mono">+{formatLKR(toNum(b.vat_amount))}</span>
          </div>

          <div className="flex items-center justify-between pt-1 font-bold text-sm text-ink">
            <span className="font-cinzel">Total Invoice:</span>
            <span className="font-mono text-base text-ink">{formatLKR(toNum(b.total_amount))}</span>
          </div>

          {b.total_paid > 0 && (
            <div className="flex items-center justify-between text-sky-700 font-semibold text-xs mt-2 pt-1 border-t border-skynest-hairline">
              <span>Amount Paid{b.status === 'PARTIALLY_PAID' ? ' (Deposit)' : ''}:</span>
              <span className="font-mono">&#8722; {formatLKR(toNum(b.total_paid))}</span>
            </div>
          )}

          <div className={`flex items-center justify-between text-xs mt-1 font-semibold ${b.balance_due > 0.01 ? 'text-rose-700' : 'text-emerald-700'}`}>
            <span>Balance Due:</span>
            <span className="font-mono">{formatLKR(toNum(b.balance_due))}</span>
          </div>
        </div>
      </div>

      {/* 5. Payments & Credits Ledger */}
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
          <p className="text-xs text-ink/50 italic py-2">
            No payments or deposits recorded on this invoice yet.
          </p>
        ) : (
          <div className="border border-skynest-hairline rounded overflow-hidden">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-ink/[0.03] border-b border-skynest-hairline text-ink/60 uppercase tracking-wider font-semibold text-[10px]">
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Method</th>
                  <th className="py-2 px-3 text-right">Amount Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-skynest-hairline font-jakarta">
                {invoice.payments.map((p) => (
                  <tr key={p.payment_id}>
                    <td className="py-2 px-3 font-mono text-[11px] text-ink/70">
                      {formatDateClean(p.payment_date)}
                    </td>
                    <td className="py-2 px-3 text-ink font-medium">
                      {p.payment_method.replace(/_/g, " ")}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-semibold text-emerald-700">
                      {formatLKR(toNum(p.amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cashier Sign-off */}
      <div className="mt-8 pt-6 border-t border-skynest-hairline flex flex-col sm:flex-row items-end justify-between gap-6">
        <div className="text-xs text-ink/60 space-y-1">
          <p>Payment Currency: LKR (Rs)</p>
          <p>Thank you for choosing Sky Nest Hotels & Resorts.</p>
        </div>

        <div className="text-right">
          <div className="w-48 border-b border-ink/40 pb-1 mb-1">
            <p className="font-cinzel text-xs text-ink/80 italic text-center">
              Front Desk Cashier
            </p>
          </div>
          <span className="font-jakarta text-[10px] text-ink/40">
            Authorized Cashier Signature & Stamp
          </span>
        </div>
      </div>

      {/* Official Legal Footer */}
      <div className="mt-8 pt-4 border-t border-skynest-hairline text-center text-[10px] text-ink/40 space-y-0.5">
        <p>This document is an authentic computerized tax invoice issued under Inland Revenue Department regulations of Sri Lanka.</p>
        <p>Goods and services consumed during stay are charged in compliance with national tourism development provisions.</p>
        <p className="font-mono text-[9px] pt-1">Sky Nest Management System • Folio Reference: {invoice.invoice_id}</p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-ink/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      

      <div className="bg-paper border border-skynest-hairline rounded-[4px] shadow-2xl w-full max-w-4xl max-h-[96vh] flex flex-col overflow-hidden my-auto">
        {/* Modal Top Control Bar */}
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
                {selectedScope === "ALL"
                  ? `All Rooms (${invoice?.all_rooms?.length || 1} Rooms) • ${booking.guest_first_name || ""} ${booking.guest_last_name || ""}`
                  : `Room ${invoice?.room_number || "—"} • ${booking.guest_first_name || ""} ${booking.guest_last_name || ""}`}
              </p>
            </div>
          </div>

          {/* Mode Switch Tabs & Actions */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 p-0.5 bg-ink/[0.04] rounded-[4px] border border-skynest-hairline">
              <button
                type="button"
                onClick={() => setActiveTab("invoice")}
                className={`px-3 py-1 rounded-[3px] font-jakarta text-xs font-semibold tracking-wider uppercase transition-all flex items-center gap-1.5 ${activeTab === "invoice"
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
                className={`px-3 py-1 rounded-[3px] font-jakarta text-xs font-semibold tracking-wider uppercase transition-all flex items-center gap-1.5 ${activeTab === "pay"
                  ? "bg-skynest-accent text-paper shadow-xs"
                  : "text-ink/60 hover:text-ink"
                  }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                Pay
              </button>
            </div>

            <button
              type="button"
              onClick={handleSavePdf}
              className="px-3.5 py-1.5 rounded-[3px] bg-skynest-accent text-white hover:bg-skynest-accent/90 transition-colors flex items-center gap-1.5 text-xs font-jakarta font-semibold tracking-wider uppercase shadow-xs cursor-pointer"
              title="Generate PDF using your browser's built-in Save as PDF destination"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Save as PDF</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-[3px] bg-paper border border-skynest-hairline text-ink hover:border-skynest-accent hover:text-skynest-accent transition-colors flex items-center gap-1.5 text-xs font-jakarta font-semibold tracking-wider uppercase shadow-xs cursor-pointer"
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

        {/* Room Switcher & Bill Generation Scope Bar (When multiple rooms exist) */}
        {invoice?.all_rooms && invoice.all_rooms.length > 1 && (
          <div className="px-6 py-2.5 bg-ink/[0.02] border-b border-skynest-hairline flex flex-wrap items-center justify-between gap-3 text-xs print-hidden-element shrink-0">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <span className="text-[10px] font-jakarta font-bold uppercase tracking-wider text-ink/50 mr-1 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-skynest-accent" />
                Bill Scope:
              </span>
              <button
                type="button"
                onClick={() => handleScopeChange("ALL")}
                className={`px-3 py-1 font-jakarta text-xs font-semibold rounded-[3px] border transition-all ${selectedScope === "ALL"
                  ? "bg-ink text-white border-ink shadow-xs"
                  : "bg-paper text-ink/70 border-skynest-hairline hover:border-ink/40 hover:text-ink"
                  }`}
              >
                All Rooms (Consolidated Booking)
              </button>
              {invoice.all_rooms.map((rm) => (
                <button
                  key={rm.booking_room_id}
                  type="button"
                  onClick={() => handleScopeChange(rm.booking_room_id)}
                  className={`px-3 py-1 font-jakarta text-xs font-semibold rounded-[3px] border transition-all ${selectedScope === rm.booking_room_id
                    ? "bg-skynest-accent text-white border-skynest-accent shadow-xs"
                    : "bg-paper text-ink/70 border-skynest-hairline hover:border-ink/40 hover:text-ink"
                    }`}
                >
                  Room {rm.room_number} ({rm.room_type_name})
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleGenerateBill}
              disabled={generatingBill}
              className="px-3 py-1 text-xs font-jakarta font-semibold uppercase tracking-wider rounded-[3px] border border-skynest-accent/50 bg-skynest-accent/10 text-skynest-accent hover:bg-skynest-accent hover:text-white transition-all flex items-center gap-1.5 disabled:opacity-50"
              title="Generate computerized statutory bill"
            >
              <Receipt className="w-3.5 h-3.5" />
              {generatingBill ? "Generating…" : selectedScope === "ALL" ? "Formalize Consolidated Bill" : "Formalize Room Bill"}
            </button>
          </div>
        )}

        {/* Scrollable Body Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {statusMsg && (
            <div
              className={`p-3 rounded text-xs font-jakarta flex items-center gap-2 print-hidden-element ${statusMsg.type === "success"
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
              <p className="font-jakarta text-xs">Generating computerized tax cascade bill...</p>
            </div>
          ) : (
            <>
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

        {/* Modal Bottom Footer */}
        <div className="px-6 py-3.5 border-t border-skynest-hairline bg-paper flex items-center justify-between shrink-0 print-hidden-element">
          <span className="font-jakarta text-xs text-ink/40">
            Sky Nest Hotel Billing Engine & Fiscal Accounting Ledger • {selectedScope === "ALL" ? "Consolidated Booking Folio" : `Single Room Folio (Room ${invoice?.room_number})`}
          </span>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2 border border-skynest-hairline text-ink/80 hover:text-ink rounded-[3px] font-jakarta text-xs font-medium hover:bg-ink/5 transition-colors"
            >
              Close
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
