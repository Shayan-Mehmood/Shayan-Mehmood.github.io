"use client";

import { useEffect, type ReactNode } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger } from "@/lib/gsap";

/**
 * Lenis drives the scroll; GSAP's ticker drives Lenis. One RAF loop for the whole page,
 * so ScrollTrigger pins, WebGL uniforms and DOM transforms all sample the same frame.
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Late webfonts shift layout; re-measure every trigger once they land.
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.9, touchMultiplier: 1.4 });
    lenis.on("scroll", ScrollTrigger.update);

    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    const onAnchor = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest<HTMLAnchorElement>("a[href^='#']");
      if (!a) return;
      const target = document.querySelector(a.getAttribute("href")!);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target as HTMLElement, { duration: 1.6 });
    };
    document.addEventListener("click", onAnchor);

    return () => {
      document.removeEventListener("click", onAnchor);
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
