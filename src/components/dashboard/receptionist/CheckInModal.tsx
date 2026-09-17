"use client";

import { useState } from "react";
import { X, Key, ShieldCheck, UserCheck, Plus, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import { apiFetch } from "@/lib/api-client";

interface CheckInModalProps {
  isOpen:         boolean;
  onClose:        () => void;
  booking:        any | null;
  onCheckInDone:  () => void;
}

export function CheckInModal({ isOpen, onClose, booking, onCheckInDone }: CheckInModalProps) {
  const [passportNo, setPassportNo]         = useState("");
  const [keycardNumber, setKeycardNumber]   = useState("");
  const [accompanying, setAccompanying]     = useState<Array<{ first_name: string; last_name: string; id_passport_no: string }>>([]);
  const [submitting, setSubmitting]         = useState(false);
  const [statusMsg, setStatusMsg]           = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (!isOpen || !booking) return null;

  const addAccompanyingRow = () => {
    setAccompanying((prev) => [...prev, { first_name: "", last_name: "", id_passport_no: "" }]);
  };

  const removeAccompanyingRow = (index: number) => {
    setAccompanying((prev) => prev.filter((_, i) => i !== index));
  };

  const updateAccompanying = (index: number, field: string, val: string) => {
    setAccompanying((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleConfirmCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setStatusMsg(null);

    try {
      const res = await apiFetch<{ success: boolean; message: string }>("/api/v1/dashboard/check-in", {
        method: "POST",
        body: JSON.stringify({
          bookingId:          booking.booking_id,
          roomNumber:         booking.room_number,
          keycardIssued:      true,
          accompanyingGuests: accompanying.filter((a) => a.first_name.trim() && a.last_name.trim()),
        }),
      });

      setStatusMsg({ type: "success", text: res.message || "Guest successfully checked in!" });
      setTimeout(() => {
        onCheckInDone();
        onClose();
      }, 1000);
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Failed to complete check-in." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-paper border border-skynest-hairline rounded-[4px] shadow-2xl w-full max-w-xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-skynest-hairline bg-paper flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded bg-emerald-50 text-emerald-700">
                <UserCheck className="w-4 h-4" />
              </span>
              <h3 className="font-cinzel text-lg font-bold text-ink tracking-wide">
                Guest Arrival & Check-In
              </h3>
            </div>
            <p className="font-jakarta text-xs text-ink/60 mt-1">
              Verify credentials and issue keycards for <span className="font-semibold text-ink">Room {booking.room_number}</span>
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
        <form onSubmit={handleConfirmCheckIn} className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
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
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* Guest & Room Summary */}
          <div className="p-3.5 rounded bg-ink/[0.02] border border-skynest-hairline grid grid-cols-2 gap-3 text-xs font-jakarta">
            <div>
              <span className="text-ink/40 text-[10px] uppercase tracking-wider block">Primary Guest</span>
              <span className="font-semibold text-ink">{booking.guest_first_name} {booking.guest_last_name}</span>
              <span className="text-[11px] text-ink/60 block">{booking.guest_email}</span>
            </div>
            <div>
              <span className="text-ink/40 text-[10px] uppercase tracking-wider block">Allocated Room</span>
              <span className="font-semibold text-ink">Room {booking.room_number}</span>
              <span className="text-[11px] text-skynest-accent block">{booking.room_type_name}</span>
            </div>
          </div>

          {/* Primary Guest Passport / ID Verification */}
          <div>
            <label className="block text-[11px] font-jakarta font-semibold uppercase tracking-wider text-ink/70 mb-1">
              Guest Passport / National ID Verification (Mandatory Rule B6)
            </label>
            <div className="relative">
              <input
                type="text"
                value={passportNo}
                onChange={(e) => setPassportNo(e.target.value)}
                placeholder="Enter passport number or Sri Lankan NIC (e.g. N1234567 / 942100123V)"
                className="w-full text-xs font-jakarta p-2.5 pl-9 rounded-[3px] border border-skynest-hairline bg-paper focus:outline-none focus:border-skynest-accent font-mono uppercase"
                required
              />
              <ShieldCheck className="w-4 h-4 text-emerald-600 absolute left-3 top-2.5" />
            </div>
          </div>

          {/* Keycard Issuance */}
          <div>
            <label className="block text-[11px] font-jakarta font-semibold uppercase tracking-wider text-ink/70 mb-1">
              RFID Keycard Allocation
            </label>
            <div className="relative">
              <input
                type="text"
                value={keycardNumber || `KEY-${booking.room_number}-A`}
                onChange={(e) => setKeycardNumber(e.target.value)}
                placeholder="Scan or enter RFID keycard code"
                className="w-full text-xs font-jakarta p-2.5 pl-9 rounded-[3px] border border-skynest-hairline bg-paper focus:outline-none focus:border-skynest-accent font-mono"
              />
              <Key className="w-4 h-4 text-skynest-accent absolute left-3 top-2.5" />
            </div>
          </div>

          {/* Accompanying Guests */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-jakarta font-semibold uppercase tracking-wider text-ink/70">
                Accompanying Resident Guests (Optional)
              </label>
              <button
                type="button"
                onClick={addAccompanyingRow}
                className="text-[11px] font-jakarta text-skynest-accent hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add Guest
              </button>
            </div>

            {accompanying.map((acc, idx) => (
              <div key={idx} className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  placeholder="First name"
                  value={acc.first_name}
                  onChange={(e) => updateAccompanying(idx, "first_name", e.target.value)}
                  className="flex-1 text-xs p-2 rounded border border-skynest-hairline font-jakarta"
                  required
                />
                <input
                  type="text"
                  placeholder="Last name"
                  value={acc.last_name}
                  onChange={(e) => updateAccompanying(idx, "last_name", e.target.value)}
                  className="flex-1 text-xs p-2 rounded border border-skynest-hairline font-jakarta"
                  required
                />
                <input
                  type="text"
                  placeholder="ID / Passport"
                  value={acc.id_passport_no}
                  onChange={(e) => updateAccompanying(idx, "id_passport_no", e.target.value)}
                  className="w-28 text-xs p-2 rounded border border-skynest-hairline font-jakarta font-mono uppercase"
                  required
                />
                <button
                  type="button"
                  onClick={() => removeAccompanyingRow(idx)}
                  className="p-1.5 text-ink/40 hover:text-rose-600 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Submit */}
          <div className="pt-4 border-t border-skynest-hairline flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-jakarta text-ink/60 hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !passportNo}
              className="py-2.5 px-6 bg-emerald-600 text-white rounded-[3px] font-jakarta text-xs font-semibold tracking-wider uppercase hover:bg-emerald-700 transition-colors disabled:opacity-40 flex items-center gap-1.5"
            >
              {submitting ? "Confirming..." : "Confirm & Check In"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
