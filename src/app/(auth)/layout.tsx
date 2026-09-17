'use client';

import React from 'react';
import Link from 'next/link';
import Cloudscape from '@/components/ui/cloudscape';

function MountainGlyph({ className = '' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 28 16" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M1 15 L10 3 L14 8 L18 2 L27 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white flex flex-col relative overflow-hidden select-none">
      {/* Layer 0: Colorful Buildings & Pool Reflection Backdrop */}
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <img
          src="/colorful-buildings-reflect-in-pool-on-a-sunny-day-2026-03-24-04-06-42-utc.jpg"
          alt="SkyNest Resort Sanctuary"
          className="w-full h-full object-cover object-[25%_center]"
          style={{ filter: 'brightness(0.98) contrast(1.02)' }}
        />
        {/* Low-opacity overlay to soften daylight and enrich tone */}
        <div className="absolute inset-0 bg-ink/20 pointer-events-none" />
        {/* Soft, natural gradient transition into pure white starting around ~35%-45% under the clouds */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to right, transparent 0%, transparent 32%, rgba(255,255,255,0.03) 38%, rgba(255,255,255,0.18) 48%, rgba(255,255,255,0.58) 64%, rgba(255,255,255,0.92) 75%, #ffffff 80%, #ffffff 100%)',
          }}
        />
      </div>

      {/* Layer 1: Multi-Scale Randomized Atmospheric Cloud Composite (Reaching ~30%-45% from left) */}
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none z-1 overflow-hidden">

        {/* [PNG Layer 1A]: Distant Deep Ambient Cumulus (Scale 1.30, Opacity 35%) */}
        <div
          className="absolute top-[-10%] left-[34%] w-[72vw] max-w-[1350px] h-[118vh] pointer-events-none opacity-35 filter blur-[1.5px]"
          style={{
            animation: 'cloudDriftDistant 18s ease-in-out infinite',
            WebkitMaskImage:
              'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.15) 10%, rgba(0,0,0,0.75) 28%, black 48%, black 100%)',
            maskImage:
              'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.15) 10%, rgba(0,0,0,0.75) 28%, black 48%, black 100%)',
          }}
        >
          <img
            src="/clouds/cloud_fluffy_3d.png"
            alt=""
            className="w-full h-full object-contain object-center"
          />
        </div>

        {/* [PNG Layer 1B]: High-Altitude Rising Cumulus Domes (Scale 1.12, Opacity 75%) */}
        <div
          className="absolute top-[-6%] left-[38%] w-[60vw] max-w-[1100px] h-[82vh] pointer-events-none opacity-75"
          style={{
            animation: 'cloudDriftHighCumulus 14s ease-in-out infinite',
            WebkitMaskImage:
              'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.2) 8%, black 28%, black 100%)',
            maskImage:
              'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.2) 8%, black 28%, black 100%)',
          }}
        >
          <img
            src="/clouds/cloud_billows.png"
            alt=""
            className="w-full h-full object-contain object-top drop-shadow-[0_12px_44px_rgba(255,255,255,0.45)]"
          />
        </div>

        {/* [PNG Layer 1C]: Primary Sculptural 3D Cloud Mass (Scale 1.00, Opacity 95% — Dense Body at ~42%-45%) */}
        <div
          className="absolute top-[-3%] left-[36%] w-[66vw] max-w-[1250px] h-[110vh] pointer-events-none opacity-95"
          style={{
            animation: 'cloudDriftCoreFluffy 12s ease-in-out infinite',
            WebkitMaskImage:
              'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.22) 10%, black 30%, black 100%)',
            maskImage:
              'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.22) 10%, black 30%, black 100%)',
          }}
        >
          <img
            src="/clouds/cloud_fluffy_3d.png"
            alt=""
            className="w-full h-full object-contain object-center drop-shadow-[0_16px_48px_rgba(255,255,255,0.55)]"
          />
        </div>

        {/* [PNG Layer 1D]: Mid-Altitude Volumetric Cloud Bank (Scale 0.95, Opacity 80%) */}
        <div
          className="absolute top-[20%] left-[40%] w-[54vw] max-w-[960px] h-[66vh] pointer-events-none opacity-80"
          style={{
            animation: 'cloudDriftMidBank 15s ease-in-out infinite',
            WebkitMaskImage:
              'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.2) 10%, black 32%, black 100%)',
            maskImage:
              'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.2) 10%, black 32%, black 100%)',
          }}
        >
          <img
            src="/clouds/cloud_bank.png"
            alt=""
            className="w-full h-full object-contain object-center"
          />
        </div>

        {/* [PNG Layer 1E]: Far-Left Delicate Cirrus Wisps (Scale 0.85, Opacity 70% — Extending into ~28%-35%) */}
        <div
          className="absolute top-[8%] left-[28%] w-[48vw] max-w-[850px] h-[55vh] pointer-events-none opacity-70"
          style={{
            animation: 'cloudDriftWispsLeft 10s ease-in-out infinite',
            WebkitMaskImage:
              'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.25) 12%, black 40%, black 100%)',
            maskImage:
              'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.25) 12%, black 40%, black 100%)',
          }}
        >
          <img
            src="/clouds/cloud_wisps.png"
            alt=""
            className="w-full h-full object-contain object-center"
          />
        </div>

        {/* [PNG Layer 1F]: Secondary Mid-Level Feathers (Scale 0.72, Opacity 60% — Asymmetric depth) */}
        <div
          className="absolute top-[36%] left-[32%] w-[42vw] max-w-[720px] h-[48vh] pointer-events-none opacity-60"
          style={{
            animation: 'cloudDriftSecondaryWisps 9s ease-in-out infinite',
            WebkitMaskImage:
              'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.2) 12%, black 38%, black 100%)',
            maskImage:
              'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.2) 12%, black 38%, black 100%)',
          }}
        >
          <img
            src="/clouds/cloud_wisps.png"
            alt=""
            className="w-full h-full object-contain object-center"
          />
        </div>

        {/* [PNG Layer 1G]: Low-Rolling Pool Deck Mist (Scale 1.08, Opacity 85% — Water-level rolling fog) */}
        <div
          className="absolute bottom-[-5%] left-[32%] w-[66vw] max-w-[1150px] h-[50vh] pointer-events-none opacity-85"
          style={{
            animation: 'cloudDriftPoolMist 13s ease-in-out infinite',
            WebkitMaskImage:
              'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.2) 10%, black 32%, black 100%)',
            maskImage:
              'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.2) 10%, black 32%, black 100%)',
          }}
        >
          <img
            src="/clouds/cloud_realistic.png"
            alt=""
            className="w-full h-full object-contain object-bottom drop-shadow-[0_8px_28px_rgba(255,255,255,0.5)]"
          />
        </div>

        {/* [PNG Layer 1H]: Upper Atmospheric Canopy Billows (Scale 0.98, Opacity 65%) */}
        <div
          className="absolute top-[-8%] left-[48%] w-[52vw] max-w-[950px] h-[70vh] pointer-events-none opacity-65"
          style={{
            animation: 'cloudDriftAtmosphere 16s ease-in-out infinite',
            WebkitMaskImage:
              'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.2) 10%, black 35%, black 100%)',
            maskImage:
              'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.2) 10%, black 35%, black 100%)',
          }}
        >
          <img
            src="/clouds/cloud_billows.png"
            alt=""
            className="w-full h-full object-contain object-top"
          />
        </div>

        {/* [CODED CLOUDS ON TOP OF PNG CLOUDS]: Living WebGL Procedural Cloud Drift */}
        <div
          className="absolute inset-0 pointer-events-none opacity-45 z-10"
          style={{
            WebkitMaskImage:
              'linear-gradient(to right, transparent 0%, transparent 28%, rgba(0,0,0,0.15) 34%, rgba(0,0,0,0.6) 45%, black 60%, rgba(0,0,0,0.9) 75%, transparent 84%, transparent 100%)',
            maskImage:
              'linear-gradient(to right, transparent 0%, transparent 28%, rgba(0,0,0,0.15) 34%, rgba(0,0,0,0.6) 45%, black 60%, rgba(0,0,0,0.9) 75%, transparent 84%, transparent 100%)',
          }}
        >
          <Cloudscape
            transparent={true}
            colorBottom="#ffffff"
            colorMid="#ffffff"
            colorTop="#ffffff"
            speed={1.4}
            height="100%"
            className="w-full h-full bg-transparent"
          />
        </div>

        {/* Seamless Solid White Merge on the Right (Solid #ffffff behind Card) */}
        <div
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            background:
              'linear-gradient(to right, transparent 0%, transparent 44%, rgba(255,255,255,0.06) 52%, rgba(255,255,255,0.45) 65%, rgba(255,255,255,0.92) 75%, #ffffff 80%, #ffffff 100%)',
          }}
        />
      </div>

      {/* Layer 2: Top Navigation Header with Back Button (Top-Left) & Centered Brand Wordmark */}
      <header className="absolute top-6 left-0 right-0 px-6 sm:px-10 flex items-center justify-between z-50 pointer-events-none">
        {/* Back Button on Top Left — Landing Page Transparent Glass Style */}
        <Link
          href="/"
          className="pointer-events-auto group flex items-center gap-2.5 px-6 py-2.5 text-[11px] md:text-[12px] font-jakarta font-medium tracking-[0.12em] uppercase rounded-none border border-white/30 hover:border-white/70 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white transition-all duration-200"
        >
          <svg className="w-3.5 h-3.5 transition-transform duration-200 group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          <span>Back</span>
        </Link>

        {/* Centered Brand Wordmark */}
        <div className="pointer-events-auto absolute left-1/2 -translate-x-1/2">
          <Link href="/" className="group flex flex-col items-center gap-1 focus:outline-none">
            <MountainGlyph className="w-5 h-auto text-ink/80 transition-transform duration-300 group-hover:scale-105" />
            <span className="font-cinzel text-xs font-semibold text-ink/90 tracking-[0.3em] uppercase">
              SKYNEST
            </span>
          </Link>
        </div>

        {/* Spacer to preserve flex balance */}
        <div className="w-[72px] hidden sm:block pointer-events-none" aria-hidden="true" />
      </header>

      {/* Layer 3: Main Content Viewport */}
      <main className="relative z-10 flex-1 flex flex-col justify-center w-full min-h-screen pt-16 pb-8">
        {children}
      </main>
    </div>
  );
}
