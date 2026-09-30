"use client";

import { useRef, type PointerEvent } from "react";
import { motion, useMotionValue, useSpring, useTransform, useVelocity } from "framer-motion";
import styles from "./Showcase.module.css";

/**
 * A chip that reacts to the *velocity* of the cursor sweeping across it:
 * fast horizontal swipes torque it around Z, vertical ones tip it in X — all spring-damped.
 */
export function PhysicsChip({ label, accent }: { label: string; accent: string }) {
  const ref = useRef<HTMLLIElement>(null);
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const vx = useVelocity(px);
  const vy = useVelocity(py);

  const spring = { stiffness: 260, damping: 11, mass: 0.7 };
  const rotateZ = useSpring(useTransform(vx, [-1800, 0, 1800], [-22, 0, 22], { clamp: true }), spring);
  const rotateX = useSpring(useTransform(vy, [-1400, 0, 1400], [28, 0, -28], { clamp: true }), spring);
  const offX = useMotionValue(0);
  const offY = useMotionValue(0);
  const x = useSpring(offX, { stiffness: 300, damping: 18 });
  const y = useSpring(offY, { stiffness: 300, damping: 18 });

  const onMove = (e: PointerEvent<HTMLLIElement>) => {
    px.set(e.clientX);
    py.set(e.clientY);
    const r = ref.current!.getBoundingClientRect();
    offX.set((e.clientX - (r.left + r.width / 2)) * 0.18);
    offY.set((e.clientY - (r.top + r.height / 2)) * 0.3);
  };
  const onLeave = () => {
    offX.set(0);
    offY.set(0);
  };

  return (
    <motion.li
      ref={ref}
      className={styles.chip}
      style={{ rotateZ, rotateX, x, y, ["--chip-accent" as string]: accent }}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      whileHover={{ scale: 1.08 }}
      transition={{ type: "spring", stiffness: 400, damping: 18 }}
    >
      {label}
    </motion.li>
  );
}
