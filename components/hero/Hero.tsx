"use client";

import dynamic from "next/dynamic";
import { useRef } from "react";
import { gsap, SplitText, useGSAP } from "@/lib/gsap";
import { useInView } from "@/lib/hooks";
import { profile } from "@/content/data";
import { ScrollCue } from "./ScrollCue";
import styles from "./Hero.module.css";

const NeuralField = dynamic(() => import("./NeuralField"), { ssr: false });

export function Hero() {
  const root = useRef<HTMLElement>(null);
  const inView = useInView(root, "0px");

  useGSAP(
    () => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const nameSplit = SplitText.create("[data-split='name']", { type: "chars,words", mask: "words" });
      const titleSplit = SplitText.create("[data-split='title']", { type: "chars" });
      const subSplit = SplitText.create("[data-split='sub']", { type: "words" });

      gsap.set("[data-hero-fade]", { autoAlpha: 0, y: 24 });
      if (reduce) {
        gsap.set("[data-hero-fade]", { autoAlpha: 1, y: 0 });
        return;
      }

      const tl = gsap.timeline({ delay: 0.35, defaults: { ease: "tension" } });
      tl.from(nameSplit.chars, {
        yPercent: 118,
        rotateX: -92,
        transformOrigin: "50% 100% -40px",
        duration: 1.55,
        stagger: { each: 0.042, from: "start" },
      })
        .from(
          titleSplit.chars,
          {
            autoAlpha: 0,
            yPercent: 60,
            scaleY: 2.4,
            filter: "blur(14px)",
            duration: 1.25,
            stagger: { each: 0.035, from: "center" },
          },
          "-=1.05",
        )
        .fromTo(
          "[data-hero-rule]",
          { scaleX: 0 },
          { scaleX: 1, duration: 1.3, transformOrigin: "0% 50%" },
          "-=1.0",
        )
        .from(subSplit.words, { autoAlpha: 0, y: 14, duration: 0.9, stagger: 0.018, ease: "snap" }, "-=0.9")
        .to("[data-hero-fade]", { autoAlpha: 1, y: 0, duration: 1, stagger: 0.08, ease: "snap" }, "-=0.8");

      // Scroll-out: typography recedes into the field as the camera dollies forward.
      gsap.to("[data-hero-content]", {
        yPercent: -18,
        autoAlpha: 0,
        filter: "blur(10px)",
        ease: "none",
        scrollTrigger: { trigger: root.current, start: "top top", end: "60% top", scrub: true },
      });

      return () => {
        nameSplit.revert();
        titleSplit.revert();
        subSplit.revert();
      };
    },
    { scope: root },
  );

  return (
    <section ref={root} id="hero" className={styles.hero} aria-label="Introduction">
      <div className={styles.sticky}>
        <div className={styles.canvas} aria-hidden>
          <NeuralField active={inView} />
        </div>
        <div className={styles.scrim} aria-hidden />

        <header className={styles.topbar} data-hero-fade>
          <span className={styles.logo}>
            SM<span>/</span>27
          </span>
          <nav className={styles.nav}>
            <a href="#agentic">Systems</a>
            <a href="#work">Work</a>
            <a href="#experience">Experience</a>
            <a href="#contact">Contact</a>
          </nav>
          <span className={styles.status}>
            <i /> Available · Q4
          </span>
        </header>

        <div className={styles.content} data-hero-content>
          <p className={`kicker ${styles.kicker}`} data-hero-fade>
            {profile.subtitle}
          </p>
          <h1 className={styles.name} data-split="name">
            {profile.name}
          </h1>
          <div className={styles.titleRow}>
            <span className={styles.rule} data-hero-rule aria-hidden />
            <span className={styles.title} data-split="title">
              {profile.title}
            </span>
          </div>
          <p className={styles.pitch} data-split="sub">
            {profile.pitch}
          </p>
          <div className={styles.meta} data-hero-fade>
            <span>
              <b>LLM</b> orchestration
            </span>
            <span>
              <b>RAG</b> · Qdrant
            </span>
            <span>
              <b>SaaS</b> · multi-tenant
            </span>
            <span className={styles.hint}>move · click the field</span>
          </div>
        </div>

        <ScrollCue />
      </div>
    </section>
  );
}
