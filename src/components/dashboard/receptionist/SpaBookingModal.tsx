"use client";

import { useState, useEffect } from "react";
import { X, Sparkles, Clock, Calendar, AlertTriangle, CheckCircle2, User, Check, ShieldAlert } from "lucide-react";
import { apiFetch, toNum } from "@/lib/api-client";

interface SpaTreatment {
  id:              string;
  name:            string;
  category:        "Wellness";
  duration_mins:   number;
  price:           number;
  description:     string;
  therapist_types: string[];
}

interface SpaSlot {
  time:         string;
  is_available: boolean;
  booked_by?: {
    booking_id:     string;
    guest_name:     string;
    room_number:    string;
    treatment_name: string;
  };
}

interface SpaBookingModalProps {
  isOpen:        boolean;
  onClose:       () => void;
  booking:       any | null;
  onOrderPlaced: () => void;
}

export function SpaBookingModal({ isOpen, onClose, booking, onOrderPlaced }: SpaBookingModalProps) {
  const [catalogue, setCatalogue]         = useState<SpaTreatment[]>([]);
  const [slots, setSlots]                 = useState<SpaSlot[]>([]);
  const [selectedTreatment, setSelectedTreatment] = useState<SpaTreatment | null>(null);
  const [selectedDate, setSelectedDate]   = useState<string>(new Date().toISOString().split("T")[0]);
  const [selectedTime, setSelectedTime]   = useState<string>("");
  const [specialNotes, setSpecialNotes]   = useState("");
  const [loading, setLoading]             = useState(false);
  const [loadingSlots, setLoadingSlots]   = useState(false);
  const [submitting, setSubmitting]       = useState(false);
  const [statusMsg, setStatusMsg]         = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSelectedTreatment(null);
      setSelectedTime("");
      setSpecialNotes("");
      setStatusMsg(null);
      return;
    }

    const fetchCatalogue = async () => {
      setLoading(true);
      try {
        const res = await apiFetch<{ success: boolean; data: SpaTreatment[] }>("/api/v1/services/spa-catalogue");
        if (res.success && res.data) {
          setCatalogue(res.data);
          if (res.data.length > 0) {
            setSelectedTreatment(res.data[0]);
          }
        }
      } catch (err: any) {
        setStatusMsg({ type: "error", text: err.message || "Failed to load spa catalogue" });
      } finally {
        setLoading(false);
      }
    };

    fetchCatalogue();
  }, [isOpen]);

  // Fetch slots whenever selectedDate or isOpen changes
  useEffect(() => {
    if (!isOpen) return;

    const fetchSlots = async () => {
      setLoadingSlots(true);
      try {
        const branchParam = booking?.branch_id ? `&branchId=${booking.branch_id}` : "";
        const res = await apiFetch<{ success: boolean; data: SpaSlot[] }>(
          `/api/v1/services/spa-slots?date=${selectedDate}${branchParam}`
        );
        if (res.success && res.data) {
          setSlots(res.data);
          // If previously selected time is no longer available on this date, reset it
          const currentSlot = res.data.find((s) => s.time === selectedTime);
          if (currentSlot && !currentSlot.is_available) {
            setSelectedTime("");
          }
        }
      } catch (err: any) {
        console.error("Failed to load spa slots:", err);
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [isOpen, selectedDate, booking?.branch_id]);

  if (!isOpen || !booking) return null;

  const handleBookAppointment = async () => {
    if (!selectedTreatment) {
      setStatusMsg({ type: "error", text: "Please select a spa treatment." });
      return;
    }
    if (!selectedTime) {
      setStatusMsg({ type: "error", text: "Please select an available time slot." });
      return;
    }

    setSubmitting(true);
    setStatusMsg(null);

    try {
      const res = await apiFetch(`/api/v1/services/folio/${booking.booking_id}`, {
        method: "POST",
        body: JSON.stringify({
          service_name:     selectedTreatment.name,
          category:         "Wellness",
          quantity:         1,
          price_at_usage:   selectedTreatment.price,
          appointment_time: selectedTime,
          date:             selectedDate,
          notes:            specialNotes.trim() ? specialNotes.trim() : `Spa Session: ${selectedTreatment.name} at ${selectedTime}`,
        }),
      });

      setStatusMsg({ type: "success", text: `Spa suite reserved at ${selectedTime} and charged to Room ${booking.room_number}!` });
      setTimeout(() => {
        onOrderPlaced();
        onClose();
      }, 1000);
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Collision detected: Slot could not be booked." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-paper border border-skynest-hairline rounded-[4px] shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-skynest-hairline bg-paper flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded bg-skynest-accent/10 text-skynest-accent">
                <Sparkles className="w-4 h-4" />
              </span>
              <h3 className="font-cinzel text-lg font-bold text-ink tracking-wide">
                Ayurveda & Wellness Spa Reservation
              </h3>
            </div>
            <p className="font-jakarta text-xs text-ink/60 mt-1">
              Collision-Aware Scheduler for <span className="font-semibold text-ink">Room {booking.room_number}</span> — Guest: <span className="font-semibold text-ink">{booking.guest_first_name} {booking.guest_last_name}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-ink/40 hover:text-ink hover:bg-ink/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: Treatment Picker + Schedule Matrix */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-skynest-hairline">
          {/* Left: Treatments Catalogue (5 cols) */}
          <div className="lg:col-span-5 overflow-y-auto p-6 space-y-3">
            <h4 className="font-cinzel text-xs font-bold text-ink uppercase tracking-wider mb-2">
              1. Select Wellness Ritual
            </h4>

            {loading ? (
              <div className="py-12 text-center">
                <div className="w-6 h-6 border-2 border-skynest-accent border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="font-jakarta text-xs text-ink/40">Loading spa rituals...</p>
              </div>
            ) : (
              catalogue.map((item) => {
                const isSelected = selectedTreatment?.id === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedTreatment(item)}
                    className={`p-3.5 rounded-[4px] border cursor-pointer transition-all ${
                      isSelected
                        ? "border-skynest-accent bg-skynest-accent/[0.04] shadow-xs"
                        : "border-skynest-hairline bg-paper hover:border-ink/20"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h5 className="font-jakarta font-semibold text-ink text-xs leading-snug">
                        {item.name}
                      </h5>
                      <span className="font-cinzel font-bold text-skynest-accent text-xs whitespace-nowrap">
                        ${toNum(item.price).toFixed(2)}
                      </span>
                    </div>
                    <p className="font-jakarta text-[11px] text-ink/60 mt-1 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                    <div className="mt-2.5 flex items-center justify-between text-[10px] text-ink/40 font-jakarta">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {item.duration_mins} Minutes
                      </span>
                      {isSelected && (
                        <span className="text-skynest-accent font-semibold flex items-center gap-0.5">
                          <Check className="w-3 h-3" /> Selected
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right: Date & Time Slot Collision Matrix (7 cols) */}
          <div className="lg:col-span-7 overflow-y-auto p-6 flex flex-col justify-between space-y-6">
            <div>
              {/* Date Selector */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-cinzel text-xs font-bold text-ink uppercase tracking-wider">
                    2. Select Appointment Date
                  </h4>
                  <span className="font-jakarta text-[11px] text-ink/40">
                    Live schedule status
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full text-xs font-jakarta p-2.5 pl-9 rounded-[3px] border border-skynest-hairline bg-paper focus:outline-none focus:border-skynest-accent transition-colors"
                  />
                  <Calendar className="w-4 h-4 text-ink/40 absolute left-3 top-2.5" />
                </div>
              </div>

              {/* Time Slots Matrix with Collision Detection */}
              <div className="mt-5">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-cinzel text-xs font-bold text-ink uppercase tracking-wider">
                    3. Time Slot Collision Matrix
                  </h4>
                  <div className="flex items-center gap-3 text-[10px] font-jakarta">
                    <span className="flex items-center gap-1 text-emerald-700">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" /> Available
                    </span>
                    <span className="flex items-center gap-1 text-rose-700">
                      <span className="w-2 h-2 rounded-full bg-rose-500" /> Booked / Conflict
                    </span>
                  </div>
                </div>

                {loadingSlots ? (
                  <div className="py-8 text-center text-ink/40 font-jakarta text-xs">
                    Checking suite availability...
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {slots.map((slot) => {
                      const isSelected = selectedTime === slot.time;
                      const isBooked = !slot.is_available;

                      return (
                        <button
                          key={slot.time}
                          disabled={isBooked}
                          onClick={() => setSelectedTime(slot.time)}
                          className={`p-2.5 rounded-[3px] border text-left transition-all relative ${
                            isBooked
                              ? "bg-rose-50/70 border-rose-200 cursor-not-allowed text-rose-900 opacity-80"
                              : isSelected
                              ? "bg-ink text-paper border-ink shadow-xs"
                              : "bg-paper border-skynest-hairline hover:border-skynest-accent text-ink"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`font-mono text-xs font-bold ${isSelected ? "text-paper" : "text-ink"}`}>
                              {slot.time}
                            </span>
                            {isBooked ? (
                              <span className="text-[9px] font-jakarta font-semibold px-1 py-0.2 rounded bg-rose-200/80 text-rose-800 uppercase">
                                Booked
                              </span>
                            ) : (
                              <span className={`text-[9px] font-jakarta uppercase ${isSelected ? "text-skynest-accent" : "text-emerald-600 font-semibold"}`}>
                                Free
                              </span>
                            )}
                          </div>

                          {isBooked && slot.booked_by && (
                            <p className="font-jakarta text-[9px] text-rose-700/90 mt-1 line-clamp-1 truncate" title={`Room ${slot.booked_by.room_number}: ${slot.booked_by.treatment_name}`}>
                              Rm {slot.booked_by.room_number} ({slot.booked_by.guest_name.split(" ")[0]})
                            </p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Special Instructions & Therapist Notes */}
              <div className="mt-5">
                <label className="block font-jakarta text-[11px] font-semibold uppercase tracking-wider text-ink/60 mb-1.5">
                  4. Therapist & Treatment Specifics
                </label>
                <textarea
                  rows={2}
                  value={specialNotes}
                  onChange={(e) => setSpecialNotes(e.target.value)}
                  placeholder="e.g. Focus on lower back and shoulder tension, herbal lavender oil preference, gentle pressure requested..."
                  className="w-full text-xs font-jakarta p-2.5 rounded-[3px] border border-skynest-hairline bg-paper focus:outline-none focus:border-skynest-accent transition-colors resize-none placeholder:text-ink/30"
                />
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-skynest-hairline">
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
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                  )}
                  <span>{statusMsg.text}</span>
                </div>
              )}

              <div className="flex items-center justify-between gap-4">
                <div>
                  <span className="font-jakarta text-[10px] uppercase tracking-wider text-ink/40 block">
                    Total Treatment Fee
                  </span>
                  <span className="font-cinzel text-lg font-bold text-skynest-accent">
                    ${toNum(selectedTreatment?.price).toFixed(2)}
                  </span>
                </div>

                <button
                  onClick={handleBookAppointment}
                  disabled={!selectedTime || submitting}
                  className="py-2.5 px-6 bg-ink text-paper rounded-[3px] font-jakarta text-xs font-semibold tracking-wider uppercase hover:bg-skynest-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-paper border-t-transparent rounded-full animate-spin" />
                      Reserving Spa Suite...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Reserve & Charge to Folio
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
