"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { useInView } from "@/lib/hooks";
import { projects } from "@/content/data";
import type { DistortInput } from "./DistortCanvas";
import { PhysicsChip } from "./PhysicsChip";
import styles from "./Showcase.module.css";

const DistortCanvas = dynamic(() => import("./DistortCanvas"), { ssr: false });

export function Showcase() {
  const root = useRef<HTMLElement>(null);
  const visual = useRef<HTMLDivElement>(null);
  const input = useRef<DistortInput>({ velocity: 0 });
  const [active, setActive] = useState(0);
  const running = useInView(root, "100px");

  useGSAP(
    () => {
      const panels = gsap.utils.toArray<HTMLElement>("[data-panel]");

      // Which project owns the pinned visual: the panel crossing the viewport centre.
      panels.forEach((panel, i) => {
        ScrollTrigger.create({
          trigger: panel,
          start: "top 55%",
          end: "bottom 55%",
          onToggle: (self) => self.isActive && setActive(i),
        });
      });

      // Feed scroll velocity into the shader for the bend / chroma smear.
      ScrollTrigger.create({
        trigger: root.current,
        start: "top bottom",
        end: "bottom top",
        onUpdate: (self) => {
          input.current.velocity = self.getVelocity();
        },
        onLeave: () => (input.current.velocity = 0),
        onLeaveBack: () => (input.current.velocity = 0),
      });

      const mm = gsap.matchMedia();
      mm.add("(min-width: 900px)", () => {
        ScrollTrigger.create({
          trigger: "[data-showcase-body]",
          start: "top top",
          end: "bottom bottom",
          pin: visual.current,
          pinSpacing: false,
        });
      });

      // Pipeline steps draw their connector and slide in as they are read.
      panels.forEach((panel) => {
        gsap.from(panel.querySelectorAll("[data-step]"), {
          autoAlpha: 0,
          x: 40,
          stagger: 0.08,
          ease: "snap",
          duration: 1,
          scrollTrigger: { trigger: panel.querySelector("[data-steps]"), start: "top 80%" },
        });
        gsap.from(panel.querySelector("[data-steps-line]"), {
          scaleY: 0,
          transformOrigin: "50% 0%",
          ease: "none",
          scrollTrigger: { trigger: panel.querySelector("[data-steps]"), start: "top 80%", end: "bottom 60%", scrub: true },
        });
      });

      return () => mm.revert();
    },
    { scope: root },
  );

  const current = projects[active];

  return (
    <section ref={root} id="work" className={styles.section} aria-label="Selected projects">
      <div className={styles.intro}>
        <p className="kicker">03 — Distorted Reality</p>
        <h2 className="section-title">
          SaaS, shipped
          <br />
          <span className="outline">end to end.</span>
        </h2>
      </div>

      <div className={styles.body} data-showcase-body>
        <div ref={visual} className={styles.visual}>
          <div className={styles.frame}>
            <DistortCanvas projects={projects} active={active} input={input} running={running} />
            <div className={styles.hud} aria-hidden>
              <span>
                {current.index} / {String(projects.length).padStart(2, "0")}
              </span>
              <span>{current.category}</span>
            </div>
            <div className={styles.progress} aria-hidden>
              {projects.map((p, i) => (
                <motion.i
                  key={p.id}
                  animate={{ scaleX: i === active ? 1 : 0.25, opacity: i === active ? 1 : 0.35 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  style={{ background: p.palette[0] }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className={styles.details}>
          {projects.map((p) => (
            <article key={p.id} data-panel className={styles.panel} style={{ ["--accent" as string]: p.palette[0] }}>
              <p className={styles.panelIndex}>
                <span>{p.index}</span> {p.category}
              </p>
              <h3 className={styles.panelTitle}>{p.name}</h3>
              <p className={styles.tagline}>{p.tagline}</p>
              <p className={styles.summary}>{p.summary}</p>

              <div className={styles.stats}>
                {p.stats.map((s) => (
                  <div key={s.label}>
                    <b>{s.value}</b>
                    <span>{s.label}</span>
                  </div>
                ))}
              </div>

              <h4 className={styles.subhead}>Generation pipeline</h4>
              <ol className={styles.steps} data-steps>
                <span className={styles.stepsLine} data-steps-line aria-hidden />
                {p.pipeline.map((s, i) => (
                  <li key={s.step} data-step>
                    <span className={styles.stepNum}>{String(i + 1).padStart(2, "0")}</span>
                    <div>
                      <strong>{s.step}</strong>
                      <p>{s.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>

              <h4 className={styles.subhead}>Stack</h4>
              <ul className={styles.chips}>
                {p.stack.map((s) => (
                  <PhysicsChip key={s} label={s} accent={p.palette[0]} />
                ))}
              </ul>

              {p.href && (
                <a className={styles.visit} href={p.href} target="_blank" rel="noreferrer">
                  <span>Visit live</span>
                  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
                    <path d="M3 11L11 3M11 3H5M11 3V9" stroke="currentColor" strokeWidth="1.4" fill="none" />
                  </svg>
                </a>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
