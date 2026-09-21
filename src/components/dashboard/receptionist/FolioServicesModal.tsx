"use client";

import { useState, useEffect } from "react";
import { X, Receipt, Trash2, Utensils, Sparkles, Plus, AlertTriangle, CheckCircle2, Clock, Calendar } from "lucide-react";
import { apiFetch, toNum } from "@/lib/api-client";

interface FolioServiceItem {
  usage_id:         string;
  booking_id:       string;
  booking_room_id:  string;
  service_id:       number | string;
  service_name:     string;
  category:         string;
  meal_time?:       string | null;
  quantity:         number;
  price_at_usage:   number;
  total_price:      number;
  used_at:          string;
  notes?:           string | null;
  appointment_time?: string | null;
  is_active:        boolean;
}

interface FolioServicesModalProps {
  isOpen:        boolean;
  onClose:       () => void;
  booking:       any | null;
  onOpenDining:  () => void;
  onOpenSpa:     () => void;
  onFolioUpdated: () => void;
}

export function FolioServicesModal({
  isOpen,
  onClose,
  booking,
  onOpenDining,
  onOpenSpa,
  onFolioUpdated,
}: FolioServicesModalProps) {
  const [services, setServices]       = useState<FolioServiceItem[]>([]);
  const [loading, setLoading]         = useState(false);
  const [voidingId, setVoidingId]     = useState<string | null>(null);
  const [voidReason, setVoidReason]   = useState("");
  const [showVoidPrompt, setShowVoidPrompt] = useState<string | null>(null);
  const [statusMsg, setStatusMsg]     = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchFolio = async () => {
    if (!booking) return;
    setLoading(true);
    try {
      const res = await apiFetch<{ success: boolean; data: FolioServiceItem[] }>(
        `/api/v1/services/folio/${booking.booking_id}`
      );
      if (res.success && res.data) {
        setServices(res.data);
      }
    } catch (err: any) {
      console.error("Failed to load folio services:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && booking) {
      fetchFolio();
      setShowVoidPrompt(null);
      setVoidReason("");
      setStatusMsg(null);
    }
  }, [isOpen, booking]);

  if (!isOpen || !booking) return null;

  const handleConfirmVoid = async (usageId: string) => {
    setVoidingId(usageId);
    setStatusMsg(null);

    try {
      await apiFetch(`/api/v1/services/folio/${usageId}`, {
        method: "DELETE",
        body: JSON.stringify({ reason: voidReason.trim() || "Guest cancelled / no-show" }),
      });

      setStatusMsg({ type: "success", text: "Service charge voided and removed from room folio." });
      setShowVoidPrompt(null);
      setVoidReason("");
      await fetchFolio();
      onFolioUpdated();
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Failed to void service charge." });
    } finally {
      setVoidingId(null);
    }
  };

  const totalServicesAmount = services.reduce((sum, s) => sum + toNum(s.total_price), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-paper border border-skynest-hairline rounded-[4px] shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-skynest-hairline bg-paper flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded bg-skynest-accent/10 text-skynest-accent">
                <Receipt className="w-4 h-4" />
              </span>
              <h3 className="font-cinzel text-lg font-bold text-ink tracking-wide">
                Room Folio Services & Incidentals
              </h3>
            </div>
            <p className="font-jakarta text-xs text-ink/60 mt-1">
              Active charges for <span className="font-semibold text-ink">Room {booking.room_number}</span> — Guest: <span className="font-semibold text-ink">{booking.guest_first_name} {booking.guest_last_name}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-ink/40 hover:text-ink hover:bg-ink/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Actions Bar */}
        <div className="px-6 py-3 border-b border-skynest-hairline bg-ink/[0.015] flex items-center justify-between flex-wrap gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onOpenDining();
              }}
              className="px-3 py-1.5 bg-paper border border-skynest-hairline text-ink hover:border-skynest-accent rounded-[3px] font-jakarta text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Utensils className="w-3.5 h-3.5 text-skynest-accent" />
              Add In-Room Dining
            </button>
            <button
              onClick={() => {
                onClose();
                onOpenSpa();
              }}
              className="px-3 py-1.5 bg-paper border border-skynest-hairline text-ink hover:border-skynest-accent rounded-[3px] font-jakarta text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-skynest-accent" />
              Book Spa Treatment
            </button>
          </div>

          <div className="text-right">
            <span className="font-jakarta text-[10px] uppercase tracking-wider text-ink/40 block">
              Folio Services Subtotal
            </span>
            <span className="font-cinzel text-sm font-bold text-skynest-accent">
              ${totalServicesAmount.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Body / Services Table */}
        <div className="flex-1 overflow-y-auto p-6">
          {statusMsg && (
            <div
              className={`mb-4 p-3 rounded text-xs font-jakarta flex items-center gap-2 ${
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

          {loading ? (
            <div className="py-16 text-center text-ink/40">
              <div className="w-6 h-6 border-2 border-skynest-accent border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="font-jakarta text-xs">Loading room charges...</p>
            </div>
          ) : services.length === 0 ? (
            <div className="py-16 text-center text-ink/40">
              <Receipt className="w-10 h-10 mx-auto mb-3 opacity-25" />
              <p className="font-jakarta text-sm font-medium text-ink/60">No service charges on this folio</p>
              <p className="font-jakarta text-xs text-ink/40 mt-1">
                Use the buttons above to order in-room dining or schedule a spa treatment.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {services.map((item) => (
                <div
                  key={item.usage_id}
                  className="p-4 rounded-[4px] border border-skynest-hairline bg-paper hover:border-ink/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded border ${
                        item.category === "Dining"
                          ? "bg-amber-50 text-amber-800 border-amber-200"
                          : "bg-purple-50 text-purple-800 border-purple-200"
                      }`}>
                        {item.category}
                      </span>
                      <h4 className="font-jakarta font-semibold text-ink text-sm truncate">
                        {item.service_name}
                      </h4>
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink/60 font-jakarta">
                      <span>
                        Rate: <strong className="text-ink">${toNum(item.price_at_usage).toFixed(2)}</strong> × {item.quantity}
                      </span>
                      {item.appointment_time && (
                        <span className="flex items-center gap-1 text-skynest-accent font-medium">
                          <Clock className="w-3 h-3" /> Slot: {item.appointment_time}
                        </span>
                      )}
                      <span className="text-[11px] text-ink/40">
                        Added: {new Date(item.used_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                    {item.notes && (
                      <p className="mt-1.5 text-[11px] font-jakarta text-ink/60 italic bg-ink/[0.02] p-1.5 rounded border border-skynest-hairline">
                        "{item.notes}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-skynest-hairline">
                    <span className="font-cinzel text-base font-bold text-ink">
                      ${toNum(item.total_price).toFixed(2)}
                    </span>

                    {showVoidPrompt === item.usage_id ? (
                      <div className="flex items-center gap-2 animate-in fade-in">
                        <input
                          type="text"
                          value={voidReason}
                          onChange={(e) => setVoidReason(e.target.value)}
                          placeholder="Reason to void..."
                          className="text-xs p-1.5 border border-rose-300 rounded bg-rose-50/50 w-36 font-jakarta focus:outline-none"
                        />
                        <button
                          onClick={() => handleConfirmVoid(item.usage_id)}
                          disabled={voidingId === item.usage_id}
                          className="px-2.5 py-1 bg-rose-600 text-white rounded text-xs font-jakarta hover:bg-rose-700 transition-colors"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setShowVoidPrompt(null)}
                          className="text-xs text-ink/40 hover:text-ink px-1"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setShowVoidPrompt(item.usage_id);
                          setVoidReason("");
                        }}
                        title="Void / Remove charge from folio (e.g. cancellation or no-show)"
                        className="p-1.5 text-ink/40 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors flex items-center gap-1 text-xs font-jakarta"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="text-[11px]">Void</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-skynest-hairline bg-paper flex items-center justify-between shrink-0">
          <span className="font-jakarta text-xs text-ink/40">
            {services.length} recorded charge{services.length === 1 ? "" : "s"} on room folio
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-ink text-paper rounded-[3px] font-jakarta text-xs font-medium hover:bg-skynest-accent transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
