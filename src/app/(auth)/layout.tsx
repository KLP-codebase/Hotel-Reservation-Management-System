'use client';

import React from 'react';
import Link from 'next/link';

function HairlineGrid({ count = 5 }: { count?: number }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex z-0">
      {Array.from({ length: count + 1 }).map((_, i) => (
        <div key={i} className="flex-1 border-l border-white/[0.06] last:border-r" />
      ))}
    </div>
  );
}

function MountainGlyph({ className = '' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 28 16" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M1 15 L10 3 L14 8 L18 2 L27 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#071C30] flex flex-col items-center justify-center p-4 md:p-6 relative overflow-hidden select-none">
      {/* Background Image matching landing page */}
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <img
          src="/sunset-at-a-swimming-pool-during-a-vacation-on-a-t-2026-03-17-05-37-28-utc.jpg"
          alt=""
          className="w-full h-full object-cover object-center scale-105"
          style={{ filter: 'brightness(0.6) contrast(1.15)' }}
        />
        {/* Navy Overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 120% 80% at 50% 30%, rgba(11,37,64,0.45) 0%, rgba(7,28,48,0.75) 60%, rgba(11,37,64,0.95) 100%)',
          }}
        />
      </div>

      {/* Hairline Grid */}
      <HairlineGrid count={5} />

      {/* Ambient Gold Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-amber-500/10 blur-[140px] rounded-full pointer-events-none z-0" />

      {/* Top Header Navigation back to landing page */}
      <header className="absolute top-6 left-6 right-6 flex items-center justify-between z-20">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[11px] font-jakarta font-medium uppercase tracking-[0.15em] text-white/70 hover:text-white border border-white/15 hover:border-white/40 px-4 py-2 rounded-full backdrop-blur-md bg-black/20 transition-all duration-200"
        >
          <span>← SkyNest Home</span>
        </Link>

        <div className="text-right hidden sm:block">
          <p className="font-cinzel italic text-white/60 text-xs">Three Branches. One Standard.</p>
        </div>
      </header>

      {/* Center Auth Container */}
      <div className="relative z-10 w-full max-w-md my-auto pt-16 pb-8">
        {/* Brand Header */}
        <div className="text-center mb-8 flex flex-col items-center">
          <Link href="/" className="group inline-flex flex-col items-center gap-1.5 focus:outline-none">
            <MountainGlyph className="w-8 h-auto text-amber-400 transition-transform duration-300 group-hover:scale-110" />
            <h1 className="font-cinzel text-xl font-normal text-white tracking-[0.35em] uppercase">
              SKYNEST
            </h1>
          </Link>
          <p className="font-cinzel italic text-amber-300/80 text-xs mt-1.5">
            Three Branches. One Standard of Hospitality.
          </p>
        </div>

        {/* Auth Content Card */}
        {children}
      </div>

      {/* Footer copyright */}
      <footer className="relative z-10 text-center text-[11px] font-jakarta tracking-[0.15em] uppercase text-white/40 pb-2">
        © {new Date().getFullYear()} SkyNest Hotels & Resorts. All Rights Reserved.
      </footer>
    </div>
  );
}
