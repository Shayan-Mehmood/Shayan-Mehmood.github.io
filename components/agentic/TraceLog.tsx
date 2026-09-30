"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { AgentNodeId } from "@/content/data";
import styles from "./Agentic.module.css";

export interface TraceLine {
  key: number;
  node: AgentNodeId;
  text: string;
  t: number;
}

const COLOR: Record<AgentNodeId, string> = {
  input: "#9aa0b4",
  router: "#00e5ff",
  vector: "#38bdf8",
  consensus: "#a78bfa",
  action: "#00ffa3",
};

export function TraceLog({ lines }: { lines: TraceLine[] }) {
  const origin = lines[0]?.t ?? 0;
  return (
    <div className={`glass ${styles.trace}`} aria-hidden>
      <div className={styles.traceHead}>
        <span className={styles.traceDot} />
        otel · live execution trace
      </div>
      <ul>
        <AnimatePresence initial={false}>
          {lines.map((l) => (
            <motion.li
              key={l.key}
              layout
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className={styles.traceTime}>+{((l.t - origin) / 1000).toFixed(2)}s</span>
              <span style={{ color: COLOR[l.node] }}>{l.text}</span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}
