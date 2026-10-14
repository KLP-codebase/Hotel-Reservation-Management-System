"use client";

import { useState, useEffect } from "react";
import { X, Utensils, Coffee, Sun, Moon, Clock, Plus, Minus, CheckCircle2, AlertCircle } from "lucide-react";
import { apiFetch, toNum } from "@/lib/api-client";
import { formatLKR } from '@/lib/currency';

interface MenuItem {
  id:          string;
  name:        string;
  category:    "Dining";
  meal_time:   "BREAKFAST" | "LUNCH" | "DINNER";
  price:       number;
  description: string;
  prep_time:   string;
  popular?:    boolean;
}

interface MenuData {
  breakfast: MenuItem[];
  lunch:     MenuItem[];
  dinner:    MenuItem[];
}

interface InRoomDiningModalProps {
  isOpen:        boolean;
  onClose:       () => void;
  booking:       any | null;
  onOrderPlaced: () => void;
}

export function InRoomDiningModal({ isOpen, onClose, booking, onOrderPlaced }: InRoomDiningModalProps) {
  const [menus, setMenus]             = useState<MenuData | null>(null);
  const [activeTab, setActiveTab]     = useState<"breakfast" | "lunch" | "dinner">("breakfast");
  const [cart, setCart]               = useState<Record<string, { item: MenuItem; quantity: number }>>({});
  const [specialNotes, setSpecialNotes] = useState("");
  const [loading, setLoading]         = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [statusMsg, setStatusMsg]     = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setCart({});
      setSpecialNotes("");
      setStatusMsg(null);
      return;
    }

    // Auto-select tab based on current Sri Lanka / local hour
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 11) {
      setActiveTab("breakfast");
    } else if (hour >= 11 && hour < 17) {
      setActiveTab("lunch");
    } else {
      setActiveTab("dinner");
    }

    const fetchMenus = async () => {
      setLoading(true);
      try {
        const res = await apiFetch<{ success: boolean; data: MenuData }>("/api/v1/services/menus");
        if (res.success && res.data) {
          setMenus(res.data);
        }
      } catch (err: any) {
        setStatusMsg({ type: "error", text: err.message || "Could not load dining menus" });
      } finally {
        setLoading(false);
      }
    };

    fetchMenus();
  }, [isOpen]);

  if (!isOpen || !booking) return null;

  const updateQuantity = (item: MenuItem, delta: number) => {
    setCart((prev) => {
      const current = prev[item.id]?.quantity || 0;
      const next = current + delta;
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[item.id];
        return copy;
      }
      return {
        ...prev,
        [item.id]: { item, quantity: next },
      };
    });
  };

  const cartItems = Object.values(cart);
  const traySubtotal = cartItems.reduce((sum, { item, quantity }) => sum + toNum(item.price) * quantity, 0);

  const handleChargeToFolio = async () => {
    if (cartItems.length === 0) return;
    setSubmitting(true);
    setStatusMsg(null);

    try {
      // Add each item in tray to folio
      for (const { item, quantity } of cartItems) {
        await apiFetch(`/api/v1/services/folio/${booking.booking_id}`, {
          method: "POST",
          body: JSON.stringify({
            booking_room_id: booking.booking_room_id || undefined,
            service_name:   item.name,
            category:       "Dining",
            meal_time:      item.meal_time,
            quantity:       quantity,
            price_at_usage: item.price,
            notes:          specialNotes.trim() ? specialNotes.trim() : `In-room delivery to Room ${booking.room_number}`,
          }),
        });
      }

      setStatusMsg({ type: "success", text: `Order charged to Room ${booking.room_number} folio!` });
      setTimeout(() => {
        onOrderPlaced();
        onClose();
      }, 1000);
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Failed to charge order to room folio." });
    } finally {
      setSubmitting(false);
    }
  };

  const activeMenuList = menus ? menus[activeTab] : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-paper border border-skynest-hairline rounded-[4px] shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-skynest-hairline bg-paper flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded bg-skynest-accent/10 text-skynest-accent">
                <Utensils className="w-4 h-4" />
              </span>
              <h3 className="font-cinzel text-lg font-bold text-ink tracking-wide">
                In-Room Dining Service Order
              </h3>
            </div>
            <p className="font-jakarta text-xs text-ink/60 mt-1">
              Charging to <span className="font-semibold text-ink">Room {booking.room_number}</span> — Guest: <span className="font-semibold text-ink">{booking.guest_first_name} {booking.guest_last_name}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-ink/40 hover:text-ink hover:bg-ink/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Meal Period Navigation Tabs */}
        <div className="flex items-center border-b border-skynest-hairline bg-ink/[0.02] px-6 shrink-0">
          <button
            onClick={() => setActiveTab("breakfast")}
            className={`flex items-center gap-2 py-3 px-4 font-jakarta text-xs font-semibold tracking-wider uppercase border-b-2 transition-all ${
              activeTab === "breakfast"
                ? "border-skynest-accent text-skynest-accent bg-paper"
                : "border-transparent text-ink/60 hover:text-ink"
            }`}
          >
            <Coffee className="w-3.5 h-3.5" />
            Breakfast <span className="text-[10px] opacity-60">(06:30–11:00)</span>
          </button>
          <button
            onClick={() => setActiveTab("lunch")}
            className={`flex items-center gap-2 py-3 px-4 font-jakarta text-xs font-semibold tracking-wider uppercase border-b-2 transition-all ${
              activeTab === "lunch"
                ? "border-skynest-accent text-skynest-accent bg-paper"
                : "border-transparent text-ink/60 hover:text-ink"
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            Lunch <span className="text-[10px] opacity-60">(12:00–16:30)</span>
          </button>
          <button
            onClick={() => setActiveTab("dinner")}
            className={`flex items-center gap-2 py-3 px-4 font-jakarta text-xs font-semibold tracking-wider uppercase border-b-2 transition-all ${
              activeTab === "dinner"
                ? "border-skynest-accent text-skynest-accent bg-paper"
                : "border-transparent text-ink/60 hover:text-ink"
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
            Dinner <span className="text-[10px] opacity-60">(18:30–23:00)</span>
          </button>
        </div>

        {/* Content Body: Menu Grid + Tray Cart */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-skynest-hairline">
          {/* Menu Items (2 cols on desktop) */}
          <div className="lg:col-span-2 overflow-y-auto p-6 space-y-4">
            {loading ? (
              <div className="py-16 text-center">
                <div className="w-6 h-6 border-2 border-skynest-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="font-jakarta text-xs text-ink/40">Loading culinary selections...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {activeMenuList.map((item) => {
                  const qty = cart[item.id]?.quantity || 0;
                  return (
                    <div
                      key={item.id}
                      className="p-4 rounded-[4px] border border-skynest-hairline bg-paper hover:border-skynest-accent/40 transition-colors flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-jakarta font-semibold text-ink text-sm leading-snug">
                            {item.name}
                          </h4>
                          <span className="font-cinzel font-bold text-skynest-accent text-sm whitespace-nowrap">
                            {formatLKR(toNum(item.price))}
                          </span>
                        </div>
                        <p className="font-jakarta text-xs text-ink/60 mt-1.5 line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-skynest-hairline flex items-center justify-between">
                        <span className="flex items-center gap-1 text-[11px] font-jakarta text-ink/40">
                          <Clock className="w-3 h-3" /> {item.prep_time}
                        </span>

                        {qty === 0 ? (
                          <button
                            onClick={() => updateQuantity(item, 1)}
                            className="px-3 py-1 bg-ink text-paper rounded-[2px] font-jakarta text-xs font-medium hover:bg-skynest-accent transition-colors"
                          >
                            + Add
                          </button>
                        ) : (
                          <div className="flex items-center gap-2 bg-ink/5 rounded px-1.5 py-0.5 border border-skynest-hairline">
                            <button
                              onClick={() => updateQuantity(item, -1)}
                              className="w-5 h-5 flex items-center justify-center text-ink/70 hover:text-ink hover:bg-ink/10 rounded"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="font-jakarta text-xs font-bold text-ink w-4 text-center">
                              {qty}
                            </span>
                            <button
                              onClick={() => updateQuantity(item, 1)}
                              className="w-5 h-5 flex items-center justify-center text-ink/70 hover:text-ink hover:bg-ink/10 rounded"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Tray / Order Summary Panel (1 col on desktop) */}
          <div className="p-6 bg-ink/[0.015] flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-skynest-hairline">
                <span className="font-cinzel text-xs font-bold text-ink uppercase tracking-wider">
                  Order Tray
                </span>
                <span className="font-jakarta text-xs text-ink/50">
                  {cartItems.length} item{cartItems.length === 1 ? "" : "s"}
                </span>
              </div>

              {cartItems.length === 0 ? (
                <div className="py-12 text-center text-ink/40">
                  <Utensils className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="font-jakarta text-xs">Your tray is empty.</p>
                  <p className="font-jakarta text-[11px] text-ink/30 mt-0.5">
                    Select culinary items from the menu.
                  </p>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {cartItems.map(({ item, quantity }) => (
                    <div key={item.id} className="flex items-center justify-between text-xs">
                      <div className="flex-1 pr-2">
                        <p className="font-jakarta font-medium text-ink truncate">{item.name}</p>
                        <p className="text-[11px] text-ink/40 font-jakarta">
                          {formatLKR(toNum(item.price))} × {quantity}
                        </p>
                      </div>
                      <span className="font-cinzel font-semibold text-ink">
                        {formatLKR((toNum(item.price) * quantity))}
                      </span>
                    </div>
                  ))}

                  <div className="pt-3 border-t border-skynest-hairline flex items-center justify-between">
                    <span className="font-jakarta text-xs font-semibold text-ink uppercase tracking-wider">
                      Subtotal
                    </span>
                    <span className="font-cinzel text-base font-bold text-skynest-accent">
                      {formatLKR(traySubtotal)}
                    </span>
                  </div>
                </div>
              )}

              {/* Special Dietary & Delivery Notes */}
              <div className="mt-6">
                <label className="block font-jakarta text-[11px] font-semibold uppercase tracking-wider text-ink/60 mb-1.5">
                  Guest Dietary & Delivery Instructions
                </label>
                <textarea
                  rows={3}
                  value={specialNotes}
                  onChange={(e) => setSpecialNotes(e.target.value)}
                  placeholder="e.g. Deliver at 07:45 AM, no shellfish, gluten-free toast, extra seeni sambol, hot water with lemon..."
                  className="w-full text-xs font-jakarta p-2.5 rounded-[3px] border border-skynest-hairline bg-paper focus:outline-none focus:border-skynest-accent transition-colors resize-none placeholder:text-ink/30"
                />
              </div>
            </div>

            {/* Bottom Status & Submit Button */}
            <div className="mt-6 pt-4 border-t border-skynest-hairline">
              {statusMsg && (
                <div
                  className={`mb-3 p-2.5 rounded text-xs font-jakarta flex items-center gap-2 ${
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

              <button
                onClick={handleChargeToFolio}
                disabled={cartItems.length === 0 || submitting}
                className="w-full py-2.5 px-4 bg-ink text-paper rounded-[3px] font-jakarta text-xs font-semibold tracking-wider uppercase hover:bg-skynest-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-paper border-t-transparent rounded-full animate-spin" />
                    Charging Room Folio...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Confirm & Charge to Folio
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
