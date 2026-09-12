'use client';

import React from 'react';
import Link from 'next/link';

function MountainGlyph({ className = '' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 28 16" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M1 15 L10 3 L14 8 L18 2 L27 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex select-none">
      {/* ── Left Panel: Hotel Image ───────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[58%] relative overflow-hidden">
        <img
          src="/Kandy_hotel.jpg"
          alt="SkyNest Hotel"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        {/* Subtle gradient blend into white right panel */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to right, rgba(11,37,64,0.10) 0%, rgba(11,37,64,0.04) 55%, rgba(253,252,250,0.30) 100%)',
          }}
        />
        {/* Back button */}
        <div className="absolute top-6 left-6 z-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[11px] font-jakarta font-semibold uppercase tracking-[0.15em] text-white bg-black/30 hover:bg-black/50 backdrop-blur-md px-4 py-2 transition-all duration-200"
          >
            ← Back
          </Link>
        </div>
        {/* Wordmark over photo */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
          <MountainGlyph className="w-5 h-auto text-white" />
          <span className="font-cinzel text-sm tracking-[0.3em] text-white uppercase">SkyNest</span>
        </div>
      </div>

      {/* ── Right Panel: Form ────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-center items-center bg-bg-paper px-8 md:px-14 py-12 relative">
        {/* Mobile back link */}
        <div className="lg:hidden absolute top-6 left-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[11px] font-jakarta font-semibold uppercase tracking-[0.12em] text-text-ink-faded hover:text-text-ink transition-colors"
          >
            ← Back
          </Link>
        </div>

        <div className="w-full max-w-sm">
          {/* Brand mark — logo above form */}
          <Link href="/" className="group flex flex-col items-center gap-1.5 mb-8 focus:outline-none">
            <MountainGlyph className="w-8 h-auto text-skynest-accent transition-transform duration-300 group-hover:scale-110" />
            <h1 className="font-cinzel text-lg font-normal text-text-ink tracking-[0.35em] uppercase">
              SkyNest
            </h1>
          </Link>

          {children}
        </div>

        <footer className="absolute bottom-4 left-0 right-0 text-center text-[10px] font-jakarta tracking-[0.12em] uppercase text-text-ink-faded/50">
          © {new Date().getFullYear()} SkyNest Hotels &amp; Resorts. All Rights Reserved.
        </footer>
      </div>
    </div>
  );
}
