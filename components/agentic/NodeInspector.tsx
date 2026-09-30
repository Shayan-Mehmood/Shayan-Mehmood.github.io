"use client";

import type { CSSProperties } from "react";
import { motion } from "framer-motion";
import type { AgentNode } from "@/content/data";
import styles from "./Agentic.module.css";

const list = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045, delayChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 8, filter: "blur(6px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } },
};

export function NodeInspector({ node, style, floating = false }: { node: AgentNode; style?: CSSProperties; floating?: boolean }) {
  return (
    <motion.aside
      className={`glass ${styles.inspector} ${floating ? styles.inspectorFloating : ""}`}
      style={style}
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.98, transition: { duration: 0.18 } }}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
      aria-live="polite"
    >
      <div className={styles.inspectorHead}>
        <span>{node.kicker}</span>
        <span className={styles.metric}>
          {node.metric.label} <b>{node.metric.value}</b>
        </span>
      </div>
      <h3>{node.label}</h3>
      <p>{node.detail}</p>
      <motion.ul variants={list} initial="hidden" animate="show" className={styles.stack}>
        {node.stack.map((s) => (
          <motion.li key={s} variants={item}>
            {s}
          </motion.li>
        ))}
      </motion.ul>
    </motion.aside>
  );
}
