"use client";

import { useState, useEffect } from "react";
import { X, LogOut, CheckCircle2, AlertTriangle, Printer, CalendarClock } from "lucide-react";
import { apiFetch, toNum } from "@/lib/api-client";

interface CheckOutModalProps {
  isOpen:          boolean;
  onClose:         () => void;
  booking:         any | null;
  onCheckOutDone:  () => void;
  onOpenTotalBill: () => void;
}

/** GET /api/v1/dashboard/check-out/preview — the bill as it will be if the guest leaves now. */
interface CheckOutPreview {
  departure: {
    departure_date: string;
    early: boolean;
    nights_booked: number;
    nights_billed: number;
    cancelled_services: { service_name: string; used_at: string; amount: number }[];
  };
  invoice: { breakdown: { total_amount: number; total_paid: number } };
  amount_due: number;
  refund_due: number;
}

const money = (n: number | string | null | undefined) => `$${toNum(n).toFixed(2)}`;

export function CheckOutModal({
  isOpen,
  onClose,
  booking,
  onCheckOutDone,
  onOpenTotalBill,
}: CheckOutModalProps) {
  const [preview, setPreview]       = useState<CheckOutPreview | null>(null);
  const [loading, setLoading]       = useState(false);
  const [settleMethod, setSettleMethod] = useState<"CREDIT_CARD" | "CASH" | "BANK_TRANSFER">("CREDIT_CARD");
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg]   = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!isOpen || !booking) return;

    const fetchPreview = async () => {
      setLoading(true);
      setPreview(null);
      try {
        const res = await apiFetch<{ success: boolean; data: CheckOutPreview }>(
          `/api/v1/dashboard/check-out/preview?bookingId=${encodeURIComponent(booking.booking_id)}`
        );
        setPreview(res.data);
      } catch (err: any) {
        setStatusMsg({ type: "error", text: err.message || "Could not calculate the final bill." });
      } finally {
        setLoading(false);
      }
    };

    setStatusMsg(null);
    fetchPreview();
  }, [isOpen, booking]);

  if (!isOpen || !booking) return null;

  const amountDue = toNum(preview?.amount_due);
  const refundDue = toNum(preview?.refund_due);
  const departure = preview?.departure;

  const handleConfirmCheckOut = async () => {
    setSubmitting(true);
    setStatusMsg(null);

    try {
      const res = await apiFetch<{ success: boolean; message: string }>("/api/v1/dashboard/check-out", {
        method: "POST",
        body: JSON.stringify({
          bookingId:      booking.booking_id,
          paymentMethod:  settleMethod,
          settleBalance:  amountDue > 0,
        }),
      });

      setStatusMsg({ type: "success", text: res.message || "Guest checkout completed and room released." });
      setTimeout(() => {
        onCheckOutDone();
        onClose();
      }, 1500);
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Checkout failed." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-paper border border-skynest-hairline rounded-[4px] shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-skynest-hairline bg-paper flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded bg-amber-50 text-amber-800">
                <LogOut className="w-4 h-4" />
              </span>
              <h3 className="font-cinzel text-lg font-bold text-ink tracking-wide">
                Guest Departure & Check-Out
              </h3>
            </div>
            <p className="font-jakarta text-xs text-ink/60 mt-1">
              Finalize folio and release <span className="font-semibold text-ink">Room {booking.room_number}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded text-ink/40 hover:text-ink hover:bg-ink/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {statusMsg && (
            <div
              role={statusMsg.type === "error" ? "alert" : "status"}
              className={`p-3 rounded text-xs font-jakarta flex items-center gap-2 ${
                statusMsg.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-rose-50 text-rose-800 border border-rose-200"
              }`}
            >
              {statusMsg.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* Stay Info */}
          <div className="p-4 rounded bg-ink/[0.02] border border-skynest-hairline grid grid-cols-2 gap-4 text-xs font-jakarta">
            <div>
              <span className="text-ink/60 text-[10px] uppercase tracking-wider block">Resident Guest</span>
              <span className="font-semibold text-ink">{booking.guest_first_name} {booking.guest_last_name}</span>
              <span className="text-[11px] text-ink/60 block">{booking.guest_phone || booking.guest_email}</span>
            </div>
            <div>
              <span className="text-ink/60 text-[10px] uppercase tracking-wider block">Vacating Room</span>
              <span className="font-semibold text-ink">Room {booking.room_number}</span>
              <span className="text-[11px] text-ink/60 block">{booking.room_type_name}</span>
            </div>
          </div>

          {/* Early departure */}
          {departure?.early && (
            <div className="p-4 rounded border border-sky-200 bg-sky-50/60 font-jakarta text-xs text-ink space-y-2">
              <p className="flex items-center gap-2 font-semibold">
                <CalendarClock className="w-4 h-4 text-sky-700 shrink-0" />
                Early departure on {departure.departure_date}
              </p>
              <p className="text-ink/70">
                Billed for {departure.nights_billed} of {departure.nights_booked} booked night
                {departure.nights_booked === 1 ? "" : "s"}. The room is released for the remaining nights.
              </p>
              {departure.cancelled_services.length > 0 && (
                <div>
                  <p className="text-ink/70">Removed from the folio (scheduled after departure):</p>
                  <ul className="mt-1 space-y-1">
                    {departure.cancelled_services.map((s, i) => (
                      <li key={i} className="flex justify-between gap-4">
                        <span>{s.service_name}</span>
                        <span className="tabular-nums text-ink/70">{money(s.amount)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Folio Financial Status */}
          {loading ? (
            <div className="py-6 text-center text-ink/60 text-xs font-jakarta">
              Computing final settlement balance...
            </div>
          ) : preview && (
            <div className={`p-4 rounded border ${
              amountDue > 0 ? "bg-amber-50/60 border-amber-200" : "bg-emerald-50/50 border-emerald-200"
            }`}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <span className="font-jakarta text-[10px] uppercase tracking-wider text-ink/60 block">
                    {departure?.early ? "Recalculated Bill" : "Total Invoiced Charges"}
                  </span>
                  <span className="font-cinzel text-base font-bold text-ink tabular-nums">
                    {money(preview.invoice.breakdown.total_amount)}
                  </span>
                </div>
                <div>
                  <span className="font-jakarta text-[10px] uppercase tracking-wider text-ink/60 block">
                    Total Paid
                  </span>
                  <span className="font-cinzel text-base font-bold text-emerald-700 tabular-nums">
                    {money(preview.invoice.breakdown.total_paid)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-jakarta text-[10px] uppercase tracking-wider text-ink/60 block">
                    {refundDue > 0 ? "Refund to Guest" : "Outstanding Due"}
                  </span>
                  <span className={`font-cinzel text-lg font-bold tabular-nums ${
                    amountDue > 0 ? "text-skynest-accent" : "text-emerald-700"
                  }`}>
                    {money(refundDue > 0 ? refundDue : amountDue)}
                  </span>
                </div>
              </div>

              {(amountDue > 0 || refundDue > 0) && (
                <div className={`mt-4 pt-4 border-t ${amountDue > 0 ? "border-amber-200/80" : "border-emerald-200/80"}`}>
                  <label htmlFor="checkout-method" className="block text-[11px] font-jakarta font-semibold uppercase tracking-wider text-ink/80 mb-2">
                    {amountDue > 0
                      ? `Payment method for the remaining balance (${money(amountDue)})`
                      : `Refund method for the overpayment (${money(refundDue)})`}
                  </label>
                  <select
                    id="checkout-method"
                    value={settleMethod}
                    onChange={(e) => setSettleMethod(e.target.value as any)}
                    className="w-full text-xs font-jakarta p-2 rounded border border-skynest-hairline bg-paper focus:outline-none focus:border-skynest-accent"
                  >
                    <option value="CREDIT_CARD">Credit Card (Terminal)</option>
                    <option value="CASH">Cash (Front Desk Drawer)</option>
                    <option value="BANK_TRANSFER">Bank Wire / Electronic Transfer</option>
                  </select>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between text-xs font-jakarta pt-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenTotalBill();
              }}
              className="text-skynest-accent hover:underline flex items-center gap-1"
            >
              <Printer className="w-4 h-4" />
              Print Invoice & View Itemized Taxes
            </button>
            <span className="text-ink/60 text-[11px]">
              Keycard returned & verified
            </span>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-skynest-hairline flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-jakarta text-ink/60 hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmCheckOut}
              disabled={submitting || loading || !preview}
              className="py-2 px-6 bg-ink text-paper rounded-[4px] font-jakarta text-xs font-semibold tracking-wider uppercase hover:bg-skynest-accent transition-colors disabled:opacity-40 flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-paper border-t-transparent rounded-full animate-spin" />
                  Finalizing Checkout...
                </>
              ) : (
                <>
                  <LogOut className="w-4 h-4" />
                  {amountDue > 0 ? "Settle & Check Out" : refundDue > 0 ? "Refund & Check Out" : "Complete Check-Out"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
