"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";

/* Icosahedron — 12 vertices, 30 edges. Projected into SVG space every frame. */
const PHI = (1 + Math.sqrt(5)) / 2;
const ICO_V: [number, number, number][] = [
  [-1, PHI, 0], [1, PHI, 0], [-1, -PHI, 0], [1, -PHI, 0],
  [0, -1, PHI], [0, 1, PHI], [0, -1, -PHI], [0, 1, -PHI],
  [PHI, 0, -1], [PHI, 0, 1], [-PHI, 0, -1], [-PHI, 0, 1],
].map(([x, y, z]) => {
  const l = Math.hypot(x, y, z);
  return [x / l, y / l, z / l] as [number, number, number];
});
const ICO_E: [number, number][] = (() => {
  const edges: [number, number][] = [];
  for (let a = 0; a < ICO_V.length; a++)
    for (let b = a + 1; b < ICO_V.length; b++) {
      const [ax, ay, az] = ICO_V[a];
      const [bx, by, bz] = ICO_V[b];
      if (Math.abs(Math.hypot(ax - bx, ay - by, az - bz) - 1.0515) < 0.01) edges.push([a, b]);
    }
  return edges;
})();

const SIZE = 64;
const C = SIZE / 2;
const MAGNET_RADIUS = 140;

function project(v: [number, number, number], rx: number, ry: number, radius: number) {
  const [x0, y0, z0] = v;
  const cy = Math.cos(ry), sy = Math.sin(ry);
  const x1 = x0 * cy + z0 * sy;
  const z1 = -x0 * sy + z0 * cy;
  const cx = Math.cos(rx), sx = Math.sin(rx);
  const y2 = y0 * cx - z1 * sx;
  const z2 = y0 * sx + z1 * cx;
  const persp = 3 / (3 + z2);
  return { x: C + x1 * radius * persp, y: C + y2 * radius * persp, z: z2 };
}

/**
 * A magnetic capsule that follows the cursor when near, then — as the page scrolls —
 * travels down, dissolves its capsule and assembles into a rotating 3D icosahedron wireframe.
 */
export function ScrollCue() {
  const ref = useRef<HTMLAnchorElement>(null);
  const edgesRef = useRef<(SVGLineElement | null)[]>([]);
  const [hidden, setHidden] = useState(false);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useSpring(mx, { stiffness: 220, damping: 16, mass: 0.6 });
  const y = useSpring(my, { stiffness: 220, damping: 16, mass: 0.6 });

  const { scrollY } = useScroll();
  const [vh, setVh] = useState(900);
  useEffect(() => {
    const onResize = () => setVh(window.innerHeight);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const progress = useTransform(scrollY, [0, vh * 0.6], [0, 1], { clamp: true });
  const smooth = useSpring(progress, { stiffness: 120, damping: 24 });

  const travel = useTransform(smooth, [0, 1], [0, vh * 0.22]);
  const yTotal = useTransform(() => y.get() + travel.get());
  const capsuleOpacity = useTransform(smooth, [0, 0.45], [1, 0]);
  const capsuleScale = useTransform(smooth, [0, 0.45], [1, 0.4]);
  const wireOpacity = useTransform(smooth, [0.2, 0.6, 0.92, 1], [0, 1, 1, 0]);
  const wireScale = useTransform(smooth, [0.2, 0.7], [0.3, 1.25]);
  const labelOpacity = useTransform(smooth, [0, 0.25], [1, 0]);

  useMotionValueEvent(smooth, "change", (v) => setHidden(v > 0.995));

  // Magnetic pull toward the cursor.
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2 - x.get();
      const cy = r.top + r.height / 2 - y.get();
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const d = Math.hypot(dx, dy);
      if (d < MAGNET_RADIUS) {
        const pull = (1 - d / MAGNET_RADIUS) * 0.55;
        mx.set(dx * pull);
        my.set(dy * pull);
      } else {
        mx.set(0);
        my.set(0);
      }
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [mx, my, x, y]);

  // Wireframe rotation is driven by time + scroll so it spins faster as it forms.
  useEffect(() => {
    let raf = 0;
    const tick = (now: number) => {
      const p = smooth.get();
      const t = now / 1000;
      const rx = t * 0.6 + p * 3.2;
      const ry = t * 0.9 + p * 5.4;
      const radius = 22;
      const pts = ICO_V.map((v) => project(v, rx, ry, radius));
      ICO_E.forEach(([a, b], i) => {
        const line = edgesRef.current[i];
        if (!line) return;
        const pa = pts[a], pb = pts[b];
        line.setAttribute("x1", pa.x.toFixed(2));
        line.setAttribute("y1", pa.y.toFixed(2));
        line.setAttribute("x2", pb.x.toFixed(2));
        line.setAttribute("y2", pb.y.toFixed(2));
        const depth = (pa.z + pb.z) / 2;
        line.style.opacity = (0.35 + (1 - (depth + 1) / 2) * 0.65).toFixed(2);
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [smooth]);

  return (
    <motion.a
      ref={ref}
      href="#agentic"
      aria-label="Scroll to next section"
      style={{
        x,
        y: yTotal,
        position: "absolute",
        left: "50%",
        bottom: "4vh",
        marginLeft: -SIZE / 2,
        width: SIZE,
        zIndex: 20,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 14,
        pointerEvents: hidden ? "none" : "auto",
      }}
      initial={{ opacity: 0, filter: "blur(8px)" }}
      animate={{ opacity: 1, filter: "blur(0px)" }}
      transition={{ delay: 2.1, duration: 1.2 }}
    >
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id="cue-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#00e5ff" />
            <stop offset="1" stopColor="#8b5cf6" />
          </linearGradient>
          <filter id="cue-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Capsule state */}
        <motion.g style={{ opacity: capsuleOpacity, scale: capsuleScale, originX: "50%", originY: "50%" }}>
          <rect x={C - 11} y={C - 20} width={22} height={40} rx={11} fill="none" stroke="url(#cue-grad)" strokeWidth={1.2} />
          <motion.circle
            cx={C}
            r={2.6}
            fill="#00e5ff"
            filter="url(#cue-glow)"
            animate={{ cy: [C - 11, C + 9, C - 11], opacity: [1, 0.2, 1] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: [0.84, 0, 0.06, 1] }}
          />
        </motion.g>

        {/* Wireframe state */}
        <motion.g
          style={{ opacity: wireOpacity, scale: wireScale, originX: "50%", originY: "50%" }}
          stroke="url(#cue-grad)"
          strokeWidth={0.9}
          filter="url(#cue-glow)"
        >
          {ICO_E.map((_, i) => (
            <line key={i} ref={(el) => { edgesRef.current[i] = el; }} strokeLinecap="round" />
          ))}
        </motion.g>
      </svg>
      <motion.span
        style={{
          opacity: labelOpacity,
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.34em",
          textTransform: "uppercase",
          color: "var(--text-dim)",
          whiteSpace: "nowrap",
        }}
      >
        Scroll
      </motion.span>
    </motion.a>
  );
}
