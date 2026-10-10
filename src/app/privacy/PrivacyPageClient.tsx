'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Lock, FileText, UserCheck, Database, Scale, Eye, RefreshCw } from 'lucide-react';
import SkyNestFooter from '@/components/marketing/SkyNestFooter';

function MountainGlyph({ className = '' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 28 16" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M1 15 L10 3 L14 8 L18 2 L27 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const SECTIONS = [
  {
    id: 'commitment',
    title: '1. Our Privacy Commitment & Charter',
    icon: <ShieldCheck size={20} className="text-skynest-accent" />,
    content: (
      <>
        <p>
          At SkyNest Hotel Reservation &amp; Guest Services Management System (&ldquo;SkyNest&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;),
          safeguarding your personal confidentiality and travel identity is foundational to our philosophy of unhurried luxury.
        </p>
        <p className="mt-3">
          This Privacy Charter governs all personal information gathered through our central reservation platform (<code>skynesthotels.com</code>),
          guest self-service portals, front-desk registers across our three Sri Lankan sanctuaries (Colombo, Kandy, and Galle),
          and ancillary dining and spa usage logs.
        </p>
      </>
    ),
  },
  {
    id: 'data-collected',
    title: '2. Information We Collect & Relational Model',
    icon: <Database size={20} className="text-skynest-accent" />,
    content: (
      <>
        <p>
          In accordance with our system architecture and Sri Lanka statutory hotel registration requirements (Rule B6),
          we collect and securely store the following data points within our central PostgreSQL audit engine:
        </p>
        <ul className="list-disc pl-5 mt-3 space-y-2 text-ink/80">
          <li><strong>Guest Identity &amp; Profile:</strong> Full name, national identity card (NIC) number, foreign passport number, nationality, and digital residency records.</li>
          <li><strong>Contact Coordinates:</strong> Verified email address, telephone contact lines, and postal billing addresses.</li>
          <li><strong>Stay &amp; Reservation Metadata:</strong> Scheduled check-in/out intervals, assigned suite categories, frozen booking rates (Rule B8), and accompanying guest declarations.</li>
          <li><strong>Ancillary Consumption Logs:</strong> Itemized charges incurred during residency, including culinary dining plans (RO, BB, HB, FB), wellness therapies, and airport transfers.</li>
          <li><strong>Financial Audit Trail:</strong> Immutable folio invoices, statutory indirect tax remittances (SC, TDL, SSCL, VAT), transaction reference numbers, and encrypted settlement tokens.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'statutory-basis',
    title: '3. Legal Basis & Sri Lankan Statutory Compliance',
    icon: <Scale size={20} className="text-skynest-accent" />,
    content: (
      <>
        <p>
          Our data processing strictly complies with the <strong>Personal Data Protection Act (PDPA) No. 9 of 2022</strong> of the
          Democratic Socialist Republic of Sri Lanka, as well as hospitality guidelines mandated by the Sri Lanka Tourism Development
          Authority (SLTDA).
        </p>
        <div className="mt-4 p-4 border border-skynest-hairline bg-paper/60 text-xs text-ink/75 space-y-2">
          <p><strong>Statutory Lodging Requirements (Rule B6):</strong> The Sri Lanka Tourist Board mandates identity verification (NIC/Passport match) for all adult occupants prior to key hand-off.</p>
          <p><strong>Tax Audit Retention (Rule B13 &amp; B17):</strong> Finalized invoices and tax cascade breakdowns must be retained for financial auditing under the Inland Revenue Act No. 24 of 2017.</p>
        </div>
      </>
    ),
  },
  {
    id: 'security',
    title: '4. Cryptographic Security & Zero-Leakage Architecture',
    icon: <Lock size={20} className="text-skynest-accent" />,
    content: (
      <>
        <p>
          SkyNest employs enterprise-tier cryptographic protocols across every tier of our software pipeline:
        </p>
        <ul className="list-disc pl-5 mt-3 space-y-2 text-ink/80">
          <li><strong>Stateless RBAC &amp; JWT:</strong> User accounts utilize cryptographically signed JSON Web Tokens with strict role isolation (Guest, Receptionist, Manager, Administrator).</li>
          <li><strong>Password Hashing:</strong> Staff and guest credentials are salted and hashed utilizing the <code>bcrypt</code> algorithm (minimum factor 10).</li>
          <li><strong>Zero ORM Parameterized SQL:</strong> Database interactions use 100% parameterized SQL prepared statements to eliminate SQL injection vectors.</li>
          <li><strong>Transport Layer Security:</strong> All client-to-cloud communications are enforced over TLS 1.3 encryption.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'guest-rights',
    title: '5. Your Rights as a SkyNest Resident',
    icon: <UserCheck size={20} className="text-skynest-accent" />,
    content: (
      <>
        <p>
          Under statutory privacy protections and SkyNest policy, you maintain sovereign rights regarding your data:
        </p>
        <ul className="list-disc pl-5 mt-3 space-y-2 text-ink/80">
          <li><strong>Right of Rectification:</strong> Update contact coordinates, dining preferences, or emergency contacts via the guest portal or front-desk concierge.</li>
          <li><strong>Right of Access:</strong> Request a complete export of your stay history and itemized invoice records at any juncture.</li>
          <li><strong>Right to Deletion:</strong> Request erasure of non-statutory personal data upon departure, subject to mandatory tax retention periods.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'contact-officer',
    title: '6. Privacy Officer & Data Inquiries',
    icon: <Eye size={20} className="text-skynest-accent" />,
    content: (
      <>
        <p>
          For questions, data access requests, or regulatory communications regarding our data protection standards,
          please address our dedicated Data Protection Officer:
        </p>
        <div className="mt-4 p-5 border border-skynest-hairline bg-white space-y-1.5 text-xs text-ink/80 font-mono">
          <p className="font-sans font-semibold text-ink text-sm">Data Protection &amp; Compliance Officer</p>
          <p>SkyNest Hotels (Pvt) Ltd</p>
          <p>45 Galle Face Centre Road, Colombo 03, Sri Lanka</p>
          <p>Email: <a href="mailto:privacy@skynesthotels.com" className="text-skynest-accent underline font-mono">privacy@skynesthotels.com</a></p>
          <p>Hotline: +94 11 234 5600 (Extension: Legal &amp; Compliance)</p>
        </div>
      </>
    ),
  },
];

export default function PrivacyPageClient() {
  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col font-jakarta">
      {/* ── Top Navigation Bar ── */}
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
            <span className="text-skynest-accent font-semibold">Privacy Charter</span>
            <Link href="/contact" className="hover:text-skynest-accent transition-colors">Contact</Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/contact"
              className="px-5 py-2 text-[11px] font-semibold tracking-[0.15em] uppercase border border-ink text-ink hover:bg-ink hover:text-white transition-all duration-200"
            >
              Concierge Desk
            </Link>
          </div>
        </div>
      </header>

      {/* ── Header Title Strip ── */}
      <section className="py-16 md:py-24 border-b border-skynest-hairline bg-paper">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-skynest-accent/10 border border-skynest-accent/20 text-skynest-accent text-[11px] font-semibold tracking-[0.2em] uppercase">
              <ShieldCheck size={13} />
              <span>Sri Lanka PDPA Compliant · Legal &amp; Compliance</span>
            </div>
            <h1 className="font-cinzel italic text-4xl md:text-6xl text-ink leading-[1.05]">
              Privacy Policy &amp; Guest Data Charter
            </h1>
            <p className="font-jakarta text-ink-faded text-base md:text-lg leading-relaxed pt-2">
              Our uncompromising standard of hospitality extends to the integrity, sovereignty,
              and protection of your personal information across all SkyNest properties.
            </p>
            <div className="text-[11px] text-ink-faded font-mono pt-2">
              Effective Date: 1 January 2026 · Version 2.4 · Sri Lanka PDPA No. 9 (2022) Alignment
            </div>
          </div>
        </div>
      </section>

      {/* ── Policy Sections ── */}
      <section className="py-16 md:py-20 flex-1">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Table of contents sidebar */}
          <aside className="lg:col-span-4 space-y-6">
            <div className="sticky top-28 p-6 border border-skynest-hairline bg-white">
              <h2 className="font-cinzel text-sm uppercase tracking-wider text-ink font-bold mb-4">
                Policy Sections
              </h2>
              <ul className="space-y-2 text-xs text-ink/70">
                {SECTIONS.map((sec) => (
                  <li key={sec.id}>
                    <a
                      href={`#${sec.id}`}
                      className="hover:text-skynest-accent transition-colors block py-1 border-b border-skynest-hairline/50 last:border-0"
                    >
                      {sec.title}
                    </a>
                  </li>
                ))}
              </ul>

              <div className="mt-8 pt-6 border-t border-skynest-hairline text-[11px] text-ink-faded space-y-3">
                <p>Have specific privacy concerns regarding a booking?</p>
                <Link
                  href="/contact"
                  className="inline-block text-xs font-semibold text-skynest-accent hover:underline uppercase tracking-wider"
                >
                  Contact Data Officer &rarr;
                </Link>
              </div>
            </div>
          </aside>

          {/* Main content body */}
          <main className="lg:col-span-8 space-y-12">
            {SECTIONS.map((sec) => (
              <article
                key={sec.id}
                id={sec.id}
                className="p-8 border border-skynest-hairline bg-white/80 space-y-4 scroll-mt-28"
              >
                <div className="flex items-center gap-3">
                  {sec.icon}
                  <h2 className="font-cinzel text-xl text-ink font-bold">
                    {sec.title}
                  </h2>
                </div>
                <div className="text-sm text-ink/80 leading-relaxed font-jakarta">
                  {sec.content}
                </div>
              </article>
            ))}
          </main>

        </div>
      </section>

      {/* ── Footer ── */}
      <SkyNestFooter />
    </div>
  );
}
