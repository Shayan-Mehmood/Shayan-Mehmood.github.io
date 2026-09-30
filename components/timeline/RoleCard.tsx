"use client";

import { forwardRef } from "react";
import { motion, type Variants } from "framer-motion";
import type { Role } from "@/content/data";
import styles from "./Timeline.module.css";

const cascade: Variants = {
  hidden: { transition: { staggerChildren: 0.03, staggerDirection: -1 } },
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.12 } },
};
const line: Variants = {
  hidden: { opacity: 0, y: 18, filter: "blur(8px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};
const chip: Variants = {
  hidden: { opacity: 0, scale: 0.6 },
  show: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 420, damping: 22 } },
};

export const RoleCard = forwardRef<HTMLDivElement, { role: Role; index: number; active: boolean }>(function RoleCard(
  { role, index, active },
  ref,
) {
  return (
    <div ref={ref} className={styles.cardSlot} data-card>
      <article
        className={`glass ${styles.card}`}
        style={{ ["--glow" as string]: role.accent, ["--glow-2" as string]: "rgba(255,255,255,0.12)" }}
        aria-current={active}
      >
        <div className={styles.cardGlow} style={{ background: role.accent }} aria-hidden />
        <header className={styles.cardHead}>
          <span className={styles.cardIndex} style={{ color: role.accent }}>
            {String(index + 1).padStart(2, "0")}
          </span>
          <span>{role.period}</span>
          <span className={styles.mode}>{role.mode}</span>
        </header>

        <h3 className={styles.role}>{role.role}</h3>
        <p className={styles.company} style={{ color: role.accent }}>
          @ {role.company}
        </p>

        <motion.div variants={cascade} initial="hidden" animate={active ? "show" : "hidden"}>
          <motion.p variants={line} className={styles.headline}>
            {role.headline}
          </motion.p>

          <motion.div variants={line} className={styles.sysLabel}>
            Systems architected
          </motion.div>
          <ul className={styles.systems}>
            {role.systems.map((s) => (
              <motion.li key={s.name} variants={line}>
                <span className={styles.sysDot} style={{ background: role.accent, boxShadow: `0 0 12px ${role.accent}` }} />
                <div>
                  <strong>{s.name}</strong>
                  <p>{s.detail}</p>
                </div>
              </motion.li>
            ))}
          </ul>

          <motion.ul className={styles.stack} variants={cascade}>
            {role.stack.map((s) => (
              <motion.li key={s} variants={chip}>
                {s}
              </motion.li>
            ))}
          </motion.ul>
        </motion.div>
      </article>
    </div>
  );
});
