"use client";

import { useState, useEffect } from "react";
import { X, LogOut, CheckCircle2, AlertTriangle, CreditCard, DollarSign, Receipt, Printer } from "lucide-react";
import { apiFetch, toNum } from "@/lib/api-client";

interface CheckOutModalProps {
  isOpen:          boolean;
  onClose:         () => void;
  booking:         any | null;
  onCheckOutDone:  () => void;
  onOpenTotalBill: () => void;
}

export function CheckOutModal({
  isOpen,
  onClose,
  booking,
  onCheckOutDone,
  onOpenTotalBill,
}: CheckOutModalProps) {
  const [invoice, setInvoice]       = useState<any | null>(null);
  const [loading, setLoading]       = useState(false);
  const [settleMethod, setSettleMethod] = useState<"CREDIT_CARD" | "CASH" | "BANK_TRANSFER">("CREDIT_CARD");
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg]   = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!isOpen || !booking) return;

    const fetchBill = async () => {
      setLoading(true);
      try {
        const res = await apiFetch<{ success: boolean; data: any }>(
          `/api/v1/invoices/${booking.booking_id}`
        );
        if (res.success && res.data) {
          setInvoice(res.data);
        }
      } catch (err: any) {
        console.error("Failed to load invoice for checkout:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchBill();
    setStatusMsg(null);
  }, [isOpen, booking]);

  if (!isOpen || !booking) return null;

  const balanceDue = toNum(invoice?.breakdown?.balance_due ?? 0);
  const isZeroBalance = balanceDue <= 0;

  const handleConfirmCheckOut = async () => {
    setSubmitting(true);
    setStatusMsg(null);

    try {
      const res = await apiFetch<{ success: boolean; message: string }>("/api/v1/dashboard/check-out", {
        method: "POST",
        body: JSON.stringify({
          bookingId:      booking.booking_id,
          paymentMethod:  settleMethod,
          settleBalance:  !isZeroBalance,
        }),
      });

      setStatusMsg({ type: "success", text: res.message || "Guest checkout completed and room released." });
      setTimeout(() => {
        onCheckOutDone();
        onClose();
      }, 1000);
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Checkout failed." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-paper border border-skynest-hairline rounded-[4px] shadow-2xl w-full max-w-lg flex flex-col overflow-hidden">
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
            className="p-1.5 rounded text-ink/40 hover:text-ink hover:bg-ink/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {statusMsg && (
            <div
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
          <div className="p-3.5 rounded bg-ink/[0.02] border border-skynest-hairline grid grid-cols-2 gap-3 text-xs font-jakarta">
            <div>
              <span className="text-ink/40 text-[10px] uppercase tracking-wider block">Resident Guest</span>
              <span className="font-semibold text-ink">{booking.guest_first_name} {booking.guest_last_name}</span>
              <span className="text-[11px] text-ink/60 block">{booking.guest_phone || booking.guest_email}</span>
            </div>
            <div>
              <span className="text-ink/40 text-[10px] uppercase tracking-wider block">Vacating Room</span>
              <span className="font-semibold text-ink">Room {booking.room_number}</span>
              <span className="text-[11px] text-skynest-accent block">{booking.room_type_name}</span>
            </div>
          </div>

          {/* Folio Financial Status */}
          {loading ? (
            <div className="py-6 text-center text-ink/40 text-xs font-jakarta">
              Computing final settlement balance...
            </div>
          ) : (
            <div className={`p-4 rounded border ${
              isZeroBalance ? "bg-emerald-50/50 border-emerald-200" : "bg-amber-50/60 border-amber-200"
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-jakarta text-[10px] uppercase tracking-wider text-ink/60 block">
                    Total Invoiced Charges
                  </span>
                  <span className="font-cinzel text-base font-bold text-ink">
                    ${toNum(invoice?.breakdown?.total_amount).toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="font-jakarta text-[10px] uppercase tracking-wider text-ink/60 block">
                    Total Paid
                  </span>
                  <span className="font-cinzel text-base font-bold text-emerald-700">
                    ${toNum(invoice?.breakdown?.total_paid).toFixed(2)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-jakarta text-[10px] uppercase tracking-wider text-ink/60 block">
                    Outstanding Due
                  </span>
                  <span className={`font-cinzel text-lg font-bold ${
                    isZeroBalance ? "text-emerald-700" : "text-skynest-accent"
                  }`}>
                    ${balanceDue.toFixed(2)}
                  </span>
                </div>
              </div>

              {!isZeroBalance && (
                <div className="mt-4 pt-3 border-t border-amber-200/80">
                  <label className="block text-[11px] font-jakarta font-semibold uppercase tracking-wider text-ink/80 mb-1.5">
                    Select Payment Method for Remaining Balance (${balanceDue.toFixed(2)}):
                  </label>
                  <select
                    value={settleMethod}
                    onChange={(e) => setSettleMethod(e.target.value as any)}
                    className="w-full text-xs font-jakarta p-2 rounded border border-skynest-hairline bg-paper focus:outline-none focus:border-skynest-accent"
                  >
                    <option value="CREDIT_CARD">Settle via Credit Card (Terminal)</option>
                    <option value="CASH">Settle via Cash (Front Desk Drawer)</option>
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
              <Printer className="w-3.5 h-3.5" />
              Print Invoice & View Itemized Taxes
            </button>
            <span className="text-ink/40 text-[11px]">
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
              disabled={submitting}
              className="py-2.5 px-6 bg-ink text-paper rounded-[3px] font-jakarta text-xs font-semibold tracking-wider uppercase hover:bg-skynest-accent transition-colors disabled:opacity-40 flex items-center gap-1.5"
            >
              {submitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-paper border-t-transparent rounded-full animate-spin" />
                  Finalizing Checkout...
                </>
              ) : (
                <>
                  <LogOut className="w-4 h-4" />
                  {!isZeroBalance ? "Settle & Check Out" : "Complete Check-Out"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
