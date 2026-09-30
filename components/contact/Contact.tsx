"use client";

import { useRef } from "react";
import { gsap, SplitText, useGSAP } from "@/lib/gsap";
import { profile } from "@/content/data";
import styles from "./Contact.module.css";

export function Contact() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const split = SplitText.create("[data-split='cta']", { type: "chars,words", mask: "words" });
      gsap.from(split.chars, {
        yPercent: 110,
        duration: 1.2,
        ease: "tension",
        stagger: 0.022,
        scrollTrigger: { trigger: root.current, start: "top 70%" },
      });
      return () => split.revert();
    },
    { scope: root },
  );

  const links = [
    { label: "Email", href: `mailto:${profile.email}`, value: profile.email },
    { label: "GitHub", href: profile.github, value: "github.com/Shayan-Mehmood" },
    { label: "LinkedIn", href: profile.linkedin, value: "in/shayan-mehmood" },
  ];

  return (
    <section ref={root} id="contact" className={styles.section} aria-label="Contact">
      <p className="kicker">05 — Open channel</p>
      <h2 className={styles.cta} data-split="cta">
        Let&apos;s architect the next system.
      </h2>
      <ul className={styles.links}>
        {links.map((l) => (
          <li key={l.label}>
            <a href={l.href} target={l.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className={`glass ${styles.link}`}>
              <span className={styles.linkLabel}>{l.label}</span>
              <span className={styles.linkValue}>{l.value}</span>
              <span className={styles.arrow} aria-hidden>
                ↗
              </span>
            </a>
          </li>
        ))}
      </ul>
      <footer className={styles.footer}>
        <span>© {new Date().getFullYear()} {profile.name}</span>
        <span>Next.js · React Three Fiber · GLSL · GSAP · Framer Motion</span>
      </footer>
    </section>
  );
}
