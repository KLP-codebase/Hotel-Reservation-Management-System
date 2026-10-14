'use client';

import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowUpRight, ChevronDown, Clock, Mail, MapPin, Phone } from 'lucide-react';
import SkyNestFooter from '@/components/marketing/SkyNestFooter';
import SkyNestNav from '@/components/marketing/SkyNestNav';
import { apiFetch, ApiError } from '@/lib/api-client';

gsap.registerPlugin(ScrollTrigger);

interface SanctuaryInfo {
  id: string;
  name: string;
  cardTitle: React.ReactNode;
  region: string;
  tagline: string;
  image: string;
  address: string;
  phone: string;
  email: string;
  hours: string;
}

const SANCTUARIES: SanctuaryInfo[] = [
  {
    id: 'colombo',
    name: 'Colombo Sky Tower',
    cardTitle: (
      <>
        Colombo Sky<br />Tower
      </>
    ),
    region: 'Western Province',
    tagline: 'Marine promenade, rooftop horizon',
    image: '/Colombo.webp',
    address: '45 Galle Face Centre Road, Colombo 03',
    phone: '+94 11 234 5600',
    email: 'colombo@skynesthotels.com',
    hours: '24-hour front desk · Check-in 14:00',
  },
  {
    id: 'kandy',
    name: 'Kandy Misty Peak',
    cardTitle: (
      <>
        Kandy Misty<br />Peak
      </>
    ),
    region: 'Central Highlands',
    tagline: 'Tea valleys, mountain stillness',
    image: '/Kandy_hotel.webp',
    address: '12 Hantana Mountain Road, Kandy 20000',
    phone: '+94 81 234 5610',
    email: 'kandy@skynesthotels.com',
    hours: '24-hour concierge · Mountain transfers',
  },
  {
    id: 'galle',
    name: 'Galle Coastal Villa',
    cardTitle: (
      <>
        Galle Coastal<br />Villa
      </>
    ),
    region: 'Southern Coast',
    tagline: 'Historic ramparts, open ocean',
    image: '/Galle.webp',
    address: '88 Lighthouse Street, Galle Fort',
    phone: '+94 91 234 5620',
    email: 'galle@skynesthotels.com',
    hours: '24-hour residence team · Ocean pier access',
  },
];

const ENQUIRY_DEPARTMENTS = [
  { id: 'reservations', label: 'Suite Reservations & Stays' },
  { id: 'concierge', label: 'Curated Experiences & Dining' },
  { id: 'events', label: 'Weddings & Private Retreats' },
  { id: 'press', label: 'Media & Corporate Relations' },
];

// Matches the API's contact schema field names (backend/src/routes/contact.routes.ts).
const FIELD_LABELS: Record<string, string> = {
  firstName: 'first name',
  lastName: 'last name',
  email: 'a valid email address',
  phone: 'phone number',
  department: 'enquiry type',
  sanctuary: 'sanctuary',
  message: 'your enquiry (at least 5 characters)',
};

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  department: 'reservations',
  sanctuary: 'any',
  message: '',
};

const fieldClass =
  'w-full bg-transparent border-0 border-b border-ink/20 px-0 py-3 text-[15px] text-ink placeholder:text-ink/30 focus:border-skynest-accent focus:outline-none focus:ring-0 transition-colors duration-300';
const labelClass =
  'block font-jakarta text-[10px] font-semibold uppercase tracking-[0.24em] text-ink/50';

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    (notify) => {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      mq.addEventListener('change', notify);
      return () => mq.removeEventListener('change', notify);
    },
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false,
  );
}

/** Thin gold-orange rule with a centred diamond — editorial divider */
function Ornament({ className = '' }: { className?: string }) {
  return (
    <div aria-hidden className={`flex items-center gap-4 ${className}`}>
      <span className="h-px w-12 bg-skynest-accent/60" />
      <span className="block h-1 w-1 rotate-45 bg-skynest-accent" />
      <span className="h-px w-12 bg-skynest-accent/60" />
    </div>
  );
}

export default function ContactPageClient() {
  const rootRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  const [form, setForm] = useState(EMPTY_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // GSAP: scroll reveals
  useEffect(() => {
    if (reducedMotion || !rootRef.current) return;
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
        gsap.from(el, {
          y: 40,
          opacity: 0,
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        });
      });

    }, rootRef);
    return () => ctx.revert();
  }, [reducedMotion]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.email || !form.message || loading) return;
    setLoading(true);
    setError(null);
    try {
      await apiFetch('/contact', { method: 'POST', body: JSON.stringify(form) });
      setSubmitted(true);
    } catch (err) {
      // A 422 lists the rejected fields; name them instead of a bare "Validation failed".
      const fields = err instanceof ApiError && err.errors ? Object.keys(err.errors) : [];
      setError(
        fields.length > 0
          ? `Please check: ${fields.map((f) => FIELD_LABELS[f] ?? f).join(', ')}.`
          : err instanceof Error && err.message
            ? err.message
            : 'We could not send your enquiry. Please try again shortly.',
      );
    } finally {
      setLoading(false);
    }
  };

  const departmentLabel =
    ENQUIRY_DEPARTMENTS.find((d) => d.id === form.department)?.label ?? 'concierge';

  return (
    <div ref={rootRef} className="min-h-screen bg-paper text-ink flex flex-col font-jakarta">
      <SkyNestNav navProgress={1} />
      <div aria-hidden className="h-14 md:h-16" />

      {/* ── 3. Sanctuaries ────────────────────────────────────────────── */}
      <section className="py-24 md:py-32">
        <div className="mx-auto max-w-[1440px] px-6 md:px-12">
          <div data-reveal className="mx-auto max-w-2xl text-center">
            <p className="font-cinzel italic text-[15px] tracking-[0.12em] text-skynest-accent">
              Our island sanctuaries
            </p>
            <h2 className="mt-4 font-cinzel italic font-normal leading-[1.1] text-ink text-[clamp(2rem,4vw,3.5rem)]">
              Speak with the team on the ground
            </h2>
            <Ornament className="mt-8 justify-center" />
          </div>

          <div className="mt-16 grid grid-cols-1 gap-8 lg:grid-cols-3">
            {SANCTUARIES.map((s) => (
              <article
                key={s.id}
                data-reveal
                className="group flex flex-col border border-skynest-hairline bg-white transition-colors duration-500 hover:border-skynest-accent/50"
              >
                <div className="relative h-64 overflow-hidden bg-ink">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={s.image}
                    alt={`${s.name} exterior`}
                    className="h-full w-full object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-105"
                  />
                  <div
                    aria-hidden
                    className="absolute inset-0"
                    style={{
                      background:
                        'linear-gradient(to top, rgba(11,37,64,0.7) 0%, rgba(11,37,64,0) 60%)',
                    }}
                  />
                  <p className="absolute bottom-4 left-6 right-6 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/80">
                    {s.region}
                  </p>
                </div>

                <div className="flex flex-1 flex-col p-8">
                  <h3 className="font-cinzel italic text-[clamp(1.5rem,2.5vw,2rem)] leading-[1.2] text-ink min-h-[2.4em]">
                    {s.cardTitle}
                  </h3>
                  <p className="mt-2 text-sm text-ink/50">{s.tagline}</p>

                  <dl className="mt-8 space-y-4 border-t border-skynest-hairline pt-8 text-sm text-ink/70">
                    <div className="flex gap-4">
                      <MapPin size={16} strokeWidth={1.25} className="mt-0.5 shrink-0 text-skynest-accent" />
                      <dd>{s.address}</dd>
                    </div>
                    <div className="flex gap-4">
                      <Phone size={16} strokeWidth={1.25} className="mt-0.5 shrink-0 text-skynest-accent" />
                      <dd>
                        <a href={`tel:${s.phone.replace(/\s+/g, '')}`} className="transition-colors hover:text-skynest-accent">
                          {s.phone}
                        </a>
                      </dd>
                    </div>
                    <div className="flex gap-4">
                      <Mail size={16} strokeWidth={1.25} className="mt-0.5 shrink-0 text-skynest-accent" />
                      <dd>
                        <a href={`mailto:${s.email}`} className="break-all transition-colors hover:text-skynest-accent">
                          {s.email}
                        </a>
                      </dd>
                    </div>
                    <div className="flex gap-4">
                      <Clock size={16} strokeWidth={1.25} className="mt-0.5 shrink-0 text-skynest-accent" />
                      <dd className="text-ink/50">{s.hours}</dd>
                    </div>
                  </dl>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. Enquiry — dark editorial panel + form ──────────────────── */}
      <section id="enquiry" className="relative isolate scroll-mt-16 bg-ink">
        <div className="mx-auto max-w-[1440px] px-6 md:px-12 py-24 md:py-32 grid grid-cols-1 gap-16 lg:grid-cols-12 lg:gap-24">
          {/* Left: invitation */}
          <div data-reveal className="lg:col-span-5 text-white">
            <p className="font-cinzel italic text-[15px] tracking-[0.12em] text-skynest-accent">
              Concierge Desk
            </p>
            <h2 className="mt-4 font-cinzel italic font-normal leading-[1.1] text-[clamp(2rem,4vw,3.5rem)]">
              Send an unhurried enquiry
            </h2>
            <Ornament className="mt-8" />
            <p className="mt-8 max-w-md text-[17px] leading-relaxed text-white/60">
              Share your preferred dates, party size and the occasion. A dedicated hospitality
              specialist will craft a considered reply within twelve hours.
            </p>

            <figure className="mt-16 border-l border-skynest-accent/60 pl-8">
              <blockquote className="font-cinzel italic text-xl leading-relaxed text-white/80">
                &ldquo;Luxury is the quiet certainty that everything has already been taken care of.&rdquo;
              </blockquote>
              <figcaption className="mt-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/40">
                The SkyNest Standard
              </figcaption>
            </figure>
          </div>

          {/* Right: form on paper */}
          <div data-reveal className="lg:col-span-7">
            <div className="bg-paper p-8 md:p-16">
              {submitted ? (
                <div className="py-8 text-center">
                  <Ornament className="justify-center" />
                  <h3 className="mt-8 font-cinzel italic text-[clamp(1.5rem,2.5vw,2rem)] text-ink">
                    Thank you, {form.firstName}
                  </h3>
                  <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-ink/60">
                    Your enquiry has been passed to our {departmentLabel.toLowerCase()} team.
                    We will reply to{' '}
                    <span className="font-semibold text-ink">{form.email}</span> shortly.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSubmitted(false);
                      setForm(EMPTY_FORM);
                    }}
                    className="mt-12 border border-ink px-8 py-4 text-[11px] font-medium uppercase tracking-[0.2em] text-ink transition-colors duration-300 hover:bg-ink hover:text-white"
                  >
                    Send another enquiry
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-12">
                  <div className="grid grid-cols-1 gap-12 sm:grid-cols-2">
                    <div>
                      <label htmlFor="firstName" className={labelClass}>
                        First name <span className="text-skynest-accent">*</span>
                      </label>
                      <input
                        id="firstName"
                        type="text"
                        required
                        value={form.firstName}
                        onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                        placeholder="Kasun"
                        className={fieldClass}
                      />
                    </div>
                    <div>
                      <label htmlFor="lastName" className={labelClass}>
                        Last name
                      </label>
                      <input
                        id="lastName"
                        type="text"
                        value={form.lastName}
                        onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                        placeholder="Perera"
                        className={fieldClass}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-12 sm:grid-cols-2">
                    <div>
                      <label htmlFor="email" className={labelClass}>
                        Email address <span className="text-skynest-accent">*</span>
                      </label>
                      <input
                        id="email"
                        type="email"
                        required
                        maxLength={200}
                        pattern="[^@ ]+@[^@ ]+[.][^@ ]+"
                        title="Enter an email address like you@example.com"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="you@example.com"
                        className={fieldClass}
                      />
                    </div>
                    <div>
                      <label htmlFor="phone" className={labelClass}>
                        Contact phone
                      </label>
                      <input
                        id="phone"
                        type="tel"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        placeholder="+94 77 123 4567"
                        className={fieldClass}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-12 sm:grid-cols-2">
                    <div>
                      <label htmlFor="department" className={labelClass}>
                        Department
                      </label>
                      <div className="relative">
                        <select
                          id="department"
                          value={form.department}
                          onChange={(e) => setForm({ ...form, department: e.target.value })}
                          className={`${fieldClass} appearance-none pr-8 cursor-pointer`}
                        >
                          {ENQUIRY_DEPARTMENTS.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="sanctuary" className={labelClass}>
                        Sanctuary of interest
                      </label>
                      <div className="relative">
                        <select
                          id="sanctuary"
                          value={form.sanctuary}
                          onChange={(e) => setForm({ ...form, sanctuary: e.target.value })}
                          className={`${fieldClass} appearance-none pr-8 cursor-pointer`}
                        >
                          <option value="any">All sanctuaries / general</option>
                          {SANCTUARIES.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="message" className={labelClass}>
                      Your enquiry <span className="text-skynest-accent">*</span>
                    </label>
                    <textarea
                      id="message"
                      required
                      minLength={5}
                      maxLength={4000}
                      rows={4}
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      placeholder="Preferred dates, party size, celebrations, dining wishes…"
                      className={`${fieldClass} resize-none`}
                    />
                  </div>

                  {error && (
                    <p role="alert" className="border-l-2 border-skynest-accent pl-4 text-sm text-ink/70">
                      {error}
                    </p>
                  )}

                  <div className="flex flex-col items-start gap-8 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="max-w-xs text-xs leading-relaxed text-ink/50">
                      By submitting you agree to our{' '}
                      <Link href="/privacy" className="underline underline-offset-4 transition-colors hover:text-skynest-accent">
                        Privacy Charter
                      </Link>
                      .
                    </p>
                    <button
                      type="submit"
                      disabled={loading}
                      className="group inline-flex w-full items-center justify-center gap-4 bg-ink px-12 py-4 text-[11px] font-medium uppercase tracking-[0.2em] text-white transition-colors duration-300 hover:bg-skynest-accent disabled:opacity-50 sm:w-auto"
                    >
                      {loading ? 'Sending…' : 'Dispatch enquiry'}
                      <ArrowUpRight
                        size={14}
                        className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                      />
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      <SkyNestFooter />
    </div>
  );
}
