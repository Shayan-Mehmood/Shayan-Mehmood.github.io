"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { useInView } from "@/lib/hooks";
import { roles } from "@/content/data";
import type { TunnelInput } from "./TunnelCanvas";
import { RoleCard } from "./RoleCard";
import styles from "./Timeline.module.css";

const TunnelCanvas = dynamic(() => import("./TunnelCanvas"), { ssr: false });

/** Distance between cards along the Z axis, in CSS px of perspective space. */
const DEPTH = 1600;
const LATERAL = [-1, 1, -1, 1];

export function SpatialTimeline() {
  const root = useRef<HTMLElement>(null);
  const cards = useRef<(HTMLDivElement | null)[]>([]);
  const tunnel = useRef<TunnelInput>({ progress: 0, accent: roles[0].accent });
  const [active, setActive] = useState(0);
  const running = useInView(root, "0px");
  const n = roles.length;

  useGSAP(
    () => {
      const lateral = () => Math.min(window.innerWidth * 0.12, 180);
      const place = (progress: number) => {
        const travel = progress * (n - 1) * DEPTH;
        cards.current.forEach((el, i) => {
          if (!el) return;
          const z = travel - i * DEPTH; // 0 = focal plane, negative = ahead, positive = behind camera
          const behind = z > 0;
          const opacity = behind ? gsap.utils.clamp(0, 1, 1 - z / (DEPTH * 0.45)) : gsap.utils.clamp(0, 1, 1 + z / (DEPTH * 1.8));
          const x = LATERAL[i % LATERAL.length] * lateral() * gsap.utils.clamp(0, 1, Math.abs(z) / DEPTH);
          const rotY = LATERAL[i % LATERAL.length] * gsap.utils.clamp(-18, 18, z / 90);
          gsap.set(el, {
            z,
            x,
            rotateY: rotY,
            autoAlpha: opacity,
            filter: `blur(${Math.min(Math.abs(z) / 220, 10).toFixed(2)}px)`,
            pointerEvents: Math.abs(z) < DEPTH * 0.3 ? "auto" : "none",
          });
        });
      };
      place(0);

      ScrollTrigger.create({
        trigger: root.current,
        start: "top top",
        end: () => `+=${window.innerHeight * n * 1.1}`,
        pin: `[data-timeline-stage]`,
        scrub: 1,
        snap: {
          snapTo: 1 / (n - 1),
          duration: { min: 0.35, max: 0.9 },
          delay: 0.08,
          ease: "power3.inOut",
        },
        onUpdate: (self) => {
          const p = self.progress;
          place(p);
          tunnel.current.progress = p;
          const idx = Math.round(p * (n - 1));
          tunnel.current.accent = roles[idx].accent;
          setActive((cur) => (cur === idx ? cur : idx));
        },
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} id="experience" className={styles.section} aria-label="Experience timeline">
      <div className={styles.stage} data-timeline-stage>
        <div className={styles.tunnel} aria-hidden>
          <TunnelCanvas input={tunnel} running={running} />
        </div>
        <div className={styles.vignette} aria-hidden />

        <div className={styles.heading}>
          <p className="kicker">04 — Spatial Timeline</p>
          <h2 className={styles.title}>Professional arsenal</h2>
        </div>

        <div className={styles.space}>
          {/* Rendered back-to-front so nearer cards paint over farther ones. */}
          {roles
            .map((r, i) => ({ r, i }))
            .reverse()
            .map(({ r, i }) => (
              <RoleCard
                key={r.company}
                ref={(el) => {
                  cards.current[i] = el;
                }}
                role={r}
                index={i}
                active={active === i}
              />
            ))}
        </div>

        <nav className={styles.rail} aria-label="Timeline progress">
          {roles.map((r, i) => (
            <div key={r.company} className={styles.railItem} data-active={active === i}>
              <motion.span
                className={styles.railTick}
                animate={{ scaleX: active === i ? 1 : 0.35, backgroundColor: active === i ? r.accent : "#3a3f52" }}
                transition={{ type: "spring", stiffness: 300, damping: 26 }}
              />
              <span className={styles.railLabel}>{r.company}</span>
            </div>
          ))}
          <div className={styles.depth}>
            z = <motion.b key={active}>{(-active * DEPTH).toLocaleString("en-US")}</motion.b>
          </div>
        </nav>
      </div>
    </section>
  );
}
