"use client";

import { useEffect, useState, type RefObject } from "react";

/** True while the element intersects the viewport (with margin). Used to park offscreen WebGL loops. */
export function useInView<T extends Element>(ref: RefObject<T | null>, rootMargin = "200px"): boolean {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootMargin]);
  return inView;
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const update = () => setMatches(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, [query]);
  return matches;
}

export const usePrefersReducedMotion = () => useMediaQuery("(prefers-reduced-motion: reduce)");
