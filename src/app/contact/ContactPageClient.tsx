'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, Phone, MapPin, Clock, Send, CheckCircle2, ChevronRight, ChevronDown, Globe2, Compass } from 'lucide-react';
import SkyNestFooter from '@/components/marketing/SkyNestFooter';

function MountainGlyph({ className = '' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 28 16" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M1 15 L10 3 L14 8 L18 2 L27 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const SANCTUARIES = [
  {
    name: 'Colombo Sky Tower',
    region: 'Western Province · Marine Promenade',
    address: '45 Galle Face Centre Road, Colombo 03, Sri Lanka',
    phone: '+94 11 234 5600',
    email: 'colombo@skynesthotels.com',
    hours: '24/7 Front Desk · Check-in 14:00',
  },
  {
    name: 'Kandy Misty Peak',
    region: 'Central Highlands · Tea Valleys',
    address: '12 Hantana Mountain Road, Kandy 20000, Sri Lanka',
    phone: '+94 81 234 5610',
    email: 'kandy@skynesthotels.com',
    hours: '24/7 Concierge · Mountain Transfer Hub',
  },
  {
    name: 'Galle Coastal Villa',
    region: 'Southern Coast · Historic Ramparts',
    address: '88 Lighthouse Street, Galle Fort, Sri Lanka',
    phone: '+94 91 234 5620',
    email: 'galle@skynesthotels.com',
    hours: '24/7 Residence Team · Ocean Pier Access',
  },
];

const ENQUIRY_DEPARTMENTS = [
  { id: 'reservations', label: 'Suite Reservations & Stays', email: 'reservations@skynesthotels.com' },
  { id: 'concierge', label: 'Curated Experiences & Dining', email: 'concierge@skynesthotels.com' },
  { id: 'events', label: 'Weddings & Private Retreats', email: 'events@skynesthotels.com' },
  { id: 'press', label: 'Media & Corporate Relations', email: 'press@skynesthotels.com' },
];

export default function ContactPageClient() {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    department: 'reservations',
    sanctuary: 'any',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.email || !form.message) return;
    setLoading(true);
    // Simulate submission
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 700);
  };

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col font-jakarta">
      {/* ── Top Floating Navigation Bar ── */}
      <header className="sticky top-0 z-50 bg-paper/90 backdrop-blur-md border-b border-skynest-hairline">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <MountainGlyph className="w-6 h-auto text-ink group-hover:text-skynest-accent transition-colors" />
            <span className="font-cinzel text-base tracking-[0.3em] uppercase text-ink font-bold">
              SKYNEST
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-[12px] font-medium tracking-[0.12em] uppercase text-ink/75">
            <Link href="/" className="hover:text-skynest-accent transition-colors">Home</Link>
            <Link href="/book" className="hover:text-skynest-accent transition-colors">Sanctuaries & Suites</Link>
            <Link href="/privacy" className="hover:text-skynest-accent transition-colors">Privacy Charter</Link>
            <span className="text-skynest-accent font-semibold">Contact</span>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/book"
              className="px-5 py-2 text-[11px] font-semibold tracking-[0.15em] uppercase border border-ink text-ink hover:bg-ink hover:text-white transition-all duration-200"
            >
              Reserve A Suite
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero / Editorial Title Strip ── */}
      <section className="relative py-16 md:py-24 border-b border-skynest-hairline bg-paper">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-skynest-accent/10 border border-skynest-accent/20 text-skynest-accent text-[11px] font-semibold tracking-[0.2em] uppercase">
              <Compass size={13} />
              <span>Direct Concierge & Sanctuary Inquiries</span>
            </div>
            <h1 className="font-cinzel italic text-4xl md:text-6xl text-ink leading-[1.05]">
              Begin Your Journey to Unhurried Luxury
            </h1>
            <p className="font-jakarta text-ink-faded text-base md:text-lg leading-relaxed pt-2">
              Whether you are planning a bespoke coastal residency, arranging private tea-plantation expeditions,
              or inquiring with our executive reservations desk, our team is at your unhurried service.
            </p>
          </div>
        </div>
      </section>

      {/* ── Main Dual-Column Content (Directory & Inquiry Form) ── */}
      <section className="py-16 md:py-20 flex-1">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          
          {/* Column 1: Sanctuary Properties Directory (5 cols) */}
          <div className="lg:col-span-5 space-y-8">
            <div>
              <span className="font-cinzel italic text-sm text-skynest-accent block mb-1">
                Our Island Sanctuaries
              </span>
              <h2 className="font-cinzel text-2xl text-ink font-semibold">
                Direct Property Contacts
              </h2>
              <p className="text-xs text-ink-faded mt-1">
                Reach out directly to front-desk management at any of our three Sri Lankan properties.
              </p>
            </div>

            <div className="space-y-6">
              {SANCTUARIES.map((s) => (
                <div
                  key={s.name}
                  className="p-6 border border-skynest-hairline bg-white/70 hover:border-skynest-accent/50 transition-all duration-200 group"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-cinzel text-lg text-ink font-bold group-hover:text-skynest-accent transition-colors">
                        {s.name}
                      </h3>
                      <p className="text-[11px] tracking-wider uppercase text-skynest-accent font-semibold mt-0.5">
                        {s.region}
                      </p>
                    </div>
                    <MapPin size={18} className="text-ink-faded group-hover:text-skynest-accent transition-colors shrink-0" />
                  </div>

                  <div className="mt-4 space-y-2 text-xs text-ink/75">
                    <p className="flex items-center gap-2">
                      <Globe2 size={13} className="text-ink-faded shrink-0" />
                      <span>{s.address}</span>
                    </p>
                    <p className="flex items-center gap-2 font-mono">
                      <Phone size={13} className="text-ink-faded shrink-0" />
                      <a href={`tel:${s.phone.replace(/\s+/g, '')}`} className="hover:text-skynest-accent transition-colors">
                        {s.phone}
                      </a>
                    </p>
                    <p className="flex items-center gap-2 font-mono">
                      <Mail size={13} className="text-ink-faded shrink-0" />
                      <a href={`mailto:${s.email}`} className="hover:text-skynest-accent transition-colors">
                        {s.email}
                      </a>
                    </p>
                    <p className="flex items-center gap-2 text-[11px] text-ink-faded pt-1">
                      <Clock size={13} className="shrink-0" />
                      <span>{s.hours}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Support Badge */}
            <div className="p-6 border border-ink/10 bg-ink text-white">
              <h4 className="font-cinzel italic text-base">Central Operations Hotline</h4>
              <p className="text-xs text-white/60 mt-1 leading-relaxed">
                For instant assistance with active stays or urgent guest logistics:
              </p>
              <div className="mt-3 font-mono text-lg font-bold text-skynest-accent">
                +94 11 234 5600
              </div>
              <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Available 24 Hours Daily</p>
            </div>
          </div>

          {/* Column 2: Interactive Inquiries Form (7 cols) */}
          <div className="lg:col-span-7">
            <div className="border border-skynest-hairline bg-white p-8 md:p-12 shadow-sm">
              <span className="font-cinzel italic text-sm text-skynest-accent block mb-1">
                Concierge Desk
              </span>
              <h2 className="font-cinzel text-2xl md:text-3xl text-ink font-semibold">
                Send an Unhurried Enquiry
              </h2>
              <p className="text-xs md:text-sm text-ink-faded mt-2 leading-relaxed">
                Complete the dispatch details below. A dedicated hospitality specialist will curate a response
                within 12 hours.
              </p>

              {submitted ? (
                <div className="mt-8 p-8 border border-emerald-500/30 bg-emerald-50/50 text-center space-y-4">
                  <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                    <CheckCircle2 size={24} />
                  </div>
                  <h3 className="font-cinzel text-xl text-ink font-semibold">
                    Thank You, {form.firstName}
                  </h3>
                  <p className="text-xs text-ink/70 max-w-md mx-auto leading-relaxed">
                    Your enquiry has been dispatched to our {form.department} team. A confirmation receipt
                    has been transmitted to <span className="font-mono text-ink font-semibold">{form.email}</span>.
                  </p>
                  <button
                    onClick={() => {
                      setSubmitted(false);
                      setForm({ firstName: '', lastName: '', email: '', phone: '', department: 'reservations', sanctuary: 'any', message: '' });
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 border border-skynest-hairline text-xs font-semibold uppercase tracking-wider text-ink hover:border-ink transition-colors"
                  >
                    Submit Another Inquiry
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                  {/* Row 1: Name */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-ink/70">
                        First Name <span className="text-skynest-accent">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={form.firstName}
                        onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                        placeholder="e.g. Kasun"
                        className="w-full px-4 py-3 bg-paper border border-skynest-hairline text-ink text-sm focus:border-skynest-accent focus:outline-none transition-colors"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-ink/70">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={form.lastName}
                        onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                        placeholder="e.g. Perera"
                        className="w-full px-4 py-3 bg-paper border border-skynest-hairline text-ink text-sm focus:border-skynest-accent focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  {/* Row 2: Email & Phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-ink/70">
                        Email Address <span className="text-skynest-accent">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="you@example.com"
                        className="w-full px-4 py-3 bg-paper border border-skynest-hairline text-ink text-sm focus:border-skynest-accent focus:outline-none transition-colors"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-ink/70">
                        Contact Phone
                      </label>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        placeholder="+94 77 123 4567"
                        className="w-full px-4 py-3 bg-paper border border-skynest-hairline text-ink text-sm focus:border-skynest-accent focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  {/* Row 3: Department & Preferred Property */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-ink/70">
                        Department
                      </label>
                      <div className="relative">
                        <select
                          value={form.department}
                          onChange={(e) => setForm({ ...form, department: e.target.value })}
                          className="w-full h-[46px] pl-4 pr-10 appearance-none bg-paper border border-skynest-hairline text-ink text-sm focus:border-skynest-accent focus:outline-none transition-colors cursor-pointer"
                        >
                          {ENQUIRY_DEPARTMENTS.map((d) => (
                            <option key={d.id} value={d.id}>{d.label}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/60 pointer-events-none" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-ink/70">
                        Property of Interest
                      </label>
                      <div className="relative">
                        <select
                          value={form.sanctuary}
                          onChange={(e) => setForm({ ...form, sanctuary: e.target.value })}
                          className="w-full h-[46px] pl-4 pr-10 appearance-none bg-paper border border-skynest-hairline text-ink text-sm focus:border-skynest-accent focus:outline-none transition-colors cursor-pointer"
                        >
                          <option value="any">All Sanctuaries / General</option>
                          <option value="colombo">Colombo Sky Tower</option>
                          <option value="kandy">Kandy Misty Peak</option>
                          <option value="galle">Galle Coastal Villa</option>
                        </select>
                        <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/60 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Row 4: Message */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-ink/70">
                      Enquiry Details <span className="text-skynest-accent">*</span>
                    </label>
                    <textarea
                      required
                      rows={5}
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      placeholder="Please share your preferred dates, party size, bespoke requirements, or dining expectations..."
                      className="w-full px-4 py-3 bg-paper border border-skynest-hairline text-ink text-sm focus:border-skynest-accent focus:outline-none transition-colors resize-y"
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-[11px] text-ink-faded">
                      By submitting, you agree to SkyNest’s{' '}
                      <Link href="/privacy" className="underline hover:text-ink">Privacy Charter</Link>.
                    </p>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full sm:w-auto px-8 py-3.5 bg-skynest-accent hover:bg-[#c46322] text-white text-xs font-semibold uppercase tracking-[0.15em] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <span>{loading ? 'Transmitting...' : 'Dispatch Inquiry'}</span>
                      <Send size={13} />
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

        </div>
      </section>

      {/* ── Footer ── */}
      <SkyNestFooter />
    </div>
  );
}
