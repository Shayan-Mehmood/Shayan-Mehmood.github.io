import * as THREE from "three";
import type { Project } from "@/content/data";

const W = 1600;
const H = 1000;

type Ctx = CanvasRenderingContext2D;

function fontVar(name: string, fallback: string) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v ? `${v}, ${fallback}` : fallback;
}

/** Deterministic PRNG so every cover renders identically between visits. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function backdrop(ctx: Ctx, [a, b, bg]: Project["palette"]) {
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const g1 = ctx.createRadialGradient(W * 0.78, H * 0.2, 0, W * 0.78, H * 0.2, W * 0.7);
  g1.addColorStop(0, `${a}55`);
  g1.addColorStop(1, "transparent");
  ctx.fillStyle = g1;
  ctx.fillRect(0, 0, W, H);

  const g2 = ctx.createRadialGradient(W * 0.1, H * 0.95, 0, W * 0.1, H * 0.95, W * 0.6);
  g2.addColorStop(0, `${b}66`);
  g2.addColorStop(1, "transparent");
  ctx.fillStyle = g2;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = "rgba(255,255,255,0.045)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= W; x += 50) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, H);
    ctx.stroke();
  }
  for (let y = 0; y <= H; y += 50) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(W, y + 0.5);
    ctx.stroke();
  }
}

function glassCard(ctx: Ctx, x: number, y: number, w: number, h: number, accent: string, r = 22) {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  ctx.fill();
  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, accent);
  grad.addColorStop(0.4, "rgba(255,255,255,0.08)");
  grad.addColorStop(1, "rgba(255,255,255,0.02)");
  ctx.strokeStyle = grad;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

function bar(ctx: Ctx, x: number, y: number, w: number, h: number, color: string) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, h / 2);
  ctx.fillStyle = color;
  ctx.fill();
}

/* ── Motifs ─────────────────────────────────────────── */

function courseMotif(ctx: Ctx, [a, b]: Project["palette"]) {
  const r = rng(7);
  // Stacked chapter cards fanning out of a prompt bar.
  glassCard(ctx, 820, 150, 640, 86, a, 43);
  bar(ctx, 860, 184, 300, 18, "rgba(255,255,255,0.7)");
  ctx.beginPath();
  ctx.arc(1410, 193, 22, 0, Math.PI * 2);
  ctx.fillStyle = a;
  ctx.shadowColor = a;
  ctx.shadowBlur = 30;
  ctx.fill();
  ctx.shadowBlur = 0;

  for (let i = 0; i < 4; i++) {
    const x = 860 + i * 34;
    const y = 290 + i * 118;
    glassCard(ctx, x, y, 560, 96, i === 0 ? a : `${b}aa`);
    bar(ctx, x + 32, y + 28, 60, 14, i === 0 ? a : b);
    bar(ctx, x + 110, y + 28, 220 + r() * 160, 14, "rgba(255,255,255,0.55)");
    bar(ctx, x + 32, y + 58, 380 + r() * 100, 9, "rgba(255,255,255,0.18)");
  }
  // Narration waveform.
  ctx.strokeStyle = a;
  ctx.lineWidth = 3;
  ctx.shadowColor = a;
  ctx.shadowBlur = 16;
  for (let i = 0; i < 70; i++) {
    const x = 880 + i * 8;
    const amp = (Math.sin(i * 0.45) * 0.5 + 0.5) * 34 * (0.3 + r() * 0.7);
    ctx.beginPath();
    ctx.moveTo(x, 845 - amp);
    ctx.lineTo(x, 845 + amp);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
}

function mapMotif(ctx: Ctx, [a, b]: Project["palette"]) {
  const r = rng(21);
  // Contour lines.
  for (let k = 0; k < 16; k++) {
    ctx.beginPath();
    const cx = 1150, cy = 480;
    for (let t = 0; t <= Math.PI * 2 + 0.01; t += 0.05) {
      const rad = 60 + k * 32 + Math.sin(t * 3 + k * 0.4) * 18 + Math.cos(t * 5 - k) * 10;
      const x = cx + Math.cos(t) * rad * 1.35;
      const y = cy + Math.sin(t) * rad;
      if (t === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = k % 4 === 0 ? `${a}aa` : "rgba(255,255,255,0.08)";
    ctx.lineWidth = k % 4 === 0 ? 1.8 : 1;
    ctx.stroke();
  }
  // Heat clusters + pins.
  for (let i = 0; i < 26; i++) {
    const x = 760 + r() * 780;
    const y = 160 + r() * 700;
    const s = 6 + r() * 26;
    const g = ctx.createRadialGradient(x, y, 0, x, y, s * 3);
    g.addColorStop(0, i % 3 ? `${a}cc` : `${b}cc`);
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.fillRect(x - s * 3, y - s * 3, s * 6, s * 6);
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();
  }
  glassCard(ctx, 1180, 120, 300, 150, a);
  bar(ctx, 1210, 150, 120, 12, "rgba(255,255,255,0.5)");
  for (let i = 0; i < 8; i++) bar(ctx, 1210 + i * 32, 240 - (20 + r() * 60), 18, 20 + r() * 60, i % 2 ? a : b);
}

function videoMotif(ctx: Ctx, [a, b]: Project["palette"]) {
  glassCard(ctx, 780, 150, 720, 430, a, 26);
  const g = ctx.createLinearGradient(780, 150, 1500, 580);
  g.addColorStop(0, `${a}33`);
  g.addColorStop(1, `${b}22`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(781, 151, 718, 428, 26);
  ctx.fill();
  // Play glyph.
  ctx.beginPath();
  ctx.moveTo(1110, 310);
  ctx.lineTo(1110, 420);
  ctx.lineTo(1205, 365);
  ctx.closePath();
  ctx.fillStyle = "#fff";
  ctx.shadowColor = a;
  ctx.shadowBlur = 40;
  ctx.fill();
  ctx.shadowBlur = 0;
  // Scrubber.
  bar(ctx, 820, 540, 640, 6, "rgba(255,255,255,0.18)");
  bar(ctx, 820, 540, 380, 6, a);
  // Lock + tier cards.
  for (let i = 0; i < 3; i++) {
    glassCard(ctx, 780 + i * 246, 640, 226, 220, i === 1 ? a : `${b}99`);
    bar(ctx, 810 + i * 246, 680, 90, 12, i === 1 ? a : "rgba(255,255,255,0.4)");
    bar(ctx, 810 + i * 246, 720, 150, 30, "rgba(255,255,255,0.8)");
    for (let k = 0; k < 3; k++) bar(ctx, 810 + i * 246, 780 + k * 22, 120 + k * 12, 8, "rgba(255,255,255,0.18)");
  }
}

const MOTIFS: Record<string, (ctx: Ctx, p: Project["palette"]) => void> = {
  minilessons: courseMotif,
  alignography: mapMotif,
  bonusview: videoMotif,
};

export function createCoverTexture(project: Project): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const [a] = project.palette;
  const display = fontVar("--font-display", "system-ui, sans-serif");
  const mono = fontVar("--font-mono", "monospace");

  backdrop(ctx, project.palette);
  (MOTIFS[project.id] ?? courseMotif)(ctx, project.palette);

  // Oversized index numeral.
  ctx.font = `700 520px ${display}`;
  ctx.fillStyle = "rgba(255,255,255,0.035)";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(project.index, 40, 560);

  ctx.font = `500 22px ${mono}`;
  ctx.fillStyle = a;
  ctx.fillText(project.category.toUpperCase(), 90, 700);

  ctx.font = `700 96px ${display}`;
  ctx.fillStyle = "#ffffff";
  const words = project.name.split(" ");
  const lines = words.length > 1 ? [words.slice(0, -1).join(" "), words[words.length - 1]] : words;
  lines.forEach((l, i) => ctx.fillText(l, 84, 800 + i * 96));

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

export const COVER_ASPECT = W / H;
