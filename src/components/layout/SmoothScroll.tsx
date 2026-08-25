"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

declare global {
  interface Window {
    __lenis?: Lenis;
  }
}

const LenisContext = createContext<Lenis | null>(null);

export function useLenis() {
  return useContext(LenisContext);
}

/**
 * SmoothScroll — Ultra-smooth momentum scrolling provider powered by Lenis v1.3+.
 * Synchronized with GSAP ticker loop and ScrollTrigger for buttery 60/120fps performance.
 */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const [lenisInstance, setLenisInstance] = useState<Lenis | null>(null);
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    // Instantiate Lenis with classic silky inertia physics
    const lenis = new Lenis({
      lerp: 0.075, // Silky liquid inertia for continuous smooth momentum
      wheelMultiplier: 1.1, // Responsive initial scroll with luxurious coasting
      touchMultiplier: 1.8,
      syncTouch: true, // Enable smooth momentum on touchpads & touch devices
      syncTouchLerp: 0.075,
      autoRaf: false, // Driven synchronously via GSAP ticker
      anchors: true,
      autoResize: true,
      overscroll: true,
      respectReducedMotion: false, // Prevent OS animation setting from disabling smooth scroll
    });

    lenisRef.current = lenis;
    window.__lenis = lenis;
    setLenisInstance(lenis);

    // Synchronize Lenis scroll position with GSAP ScrollTrigger
    const onScroll = () => {
      ScrollTrigger.update();
    };
    lenis.on("scroll", onScroll);

    // Drive Lenis inside GSAP's unified requestAnimationFrame loop
    const tickerHandler = (time: number) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(tickerHandler);
    gsap.ticker.lagSmoothing(0);

    // Global anchor click interceptor for silky smooth scrolling to in-page anchors
    const handleAnchorClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;
      const href = target.getAttribute("href");
      if (href && href.startsWith("#") && href.length > 1) {
        const el = document.querySelector(href);
        if (el) {
          e.preventDefault();
          lenis.scrollTo(el as HTMLElement, {
            offset: 0,
            duration: 1.2,
          });
        }
      }
    };

    document.addEventListener("click", handleAnchorClick, { capture: true });

    return () => {
      document.removeEventListener("click", handleAnchorClick, { capture: true });
      lenis.off("scroll", onScroll);
      gsap.ticker.remove(tickerHandler);
      lenis.destroy();
      lenisRef.current = null;
      delete window.__lenis;
    };
  }, []);

  return (
    <LenisContext.Provider value={lenisInstance}>
      {children}
    </LenisContext.Provider>
  );
}

