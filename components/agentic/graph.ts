import type { AgentNodeId } from "@/content/data";

export type LayoutKind = "wide" | "tall";

export interface Point {
  x: number;
  y: number;
}

export interface EdgeDef {
  id: string;
  from: AgentNodeId;
  to: AgentNodeId;
  kind: "forward" | "feedback";
  label?: string;
}

export interface GraphLayout {
  viewBox: { w: number; h: number };
  node: { w: number; h: number };
  positions: Record<AgentNodeId, Point>;
  agentOrbit: number;
}

export const EDGES: EdgeDef[] = [
  { id: "e-input-router", from: "input", to: "router", kind: "forward", label: "request" },
  { id: "e-router-vector", from: "router", to: "vector", kind: "forward", label: "embed + filter" },
  { id: "e-vector-consensus", from: "vector", to: "consensus", kind: "forward", label: "top-k context" },
  { id: "e-consensus-action", from: "consensus", to: "action", kind: "forward", label: "signed plan" },
  { id: "e-consensus-router", from: "consensus", to: "router", kind: "feedback", label: "re-plan" },
];

export const LAYOUTS: Record<LayoutKind, GraphLayout> = {
  wide: {
    viewBox: { w: 1340, h: 580 },
    node: { w: 196, h: 72 },
    positions: {
      input: { x: 105, y: 300 },
      router: { x: 375, y: 300 },
      vector: { x: 650, y: 110 },
      consensus: { x: 925, y: 300 },
      action: { x: 1235, y: 300 },
    },
    agentOrbit: 118,
  },
  tall: {
    viewBox: { w: 420, h: 1120 },
    node: { w: 208, h: 68 },
    positions: {
      input: { x: 210, y: 70 },
      router: { x: 210, y: 270 },
      vector: { x: 250, y: 470 },
      consensus: { x: 210, y: 740 },
      action: { x: 210, y: 1040 },
    },
    agentOrbit: 112,
  },
};

const f = (n: number) => n.toFixed(1);

/** Cubic path between two nodes, leaving/entering on the sides that face each other. */
export function edgePath(edge: EdgeDef, layout: GraphLayout, kind: LayoutKind): string {
  const a = layout.positions[edge.from];
  const b = layout.positions[edge.to];
  const { w, h } = layout.node;

  if (edge.kind === "feedback") {
    if (kind === "wide") {
      // Swoops under the graph from Consensus back to Router.
      const sx = a.x, sy = a.y + h / 2;
      const ex = b.x, ey = b.y + h / 2;
      return `M${f(sx)},${f(sy)} C${f(sx)},${f(sy + 190)} ${f(ex)},${f(ey + 190)} ${f(ex)},${f(ey)}`;
    }
    const sx = a.x - w / 2, sy = a.y;
    const ex = b.x - w / 2, ey = b.y;
    return `M${f(sx)},${f(sy)} C${f(sx - 150)},${f(sy)} ${f(ex - 150)},${f(ey)} ${f(ex)},${f(ey)}`;
  }

  if (kind === "wide") {
    const sx = a.x + w / 2, sy = a.y;
    const ex = b.x - w / 2, ey = b.y;
    const dx = Math.max(60, (ex - sx) * 0.55);
    return `M${f(sx)},${f(sy)} C${f(sx + dx)},${f(sy)} ${f(ex - dx)},${f(ey)} ${f(ex)},${f(ey)}`;
  }
  const sx = a.x, sy = a.y + h / 2;
  const ex = b.x, ey = b.y - h / 2;
  const dy = Math.max(50, (ey - sy) * 0.55);
  return `M${f(sx)},${f(sy)} C${f(sx)},${f(sy + dy)} ${f(ex)},${f(ey - dy)} ${f(ex)},${f(ey)}`;
}

/** Three deliberating agents orbiting the consensus node, as a closed triangle. */
export function agentPositions(layout: GraphLayout): Point[] {
  const c = layout.positions.consensus;
  const r = layout.agentOrbit;
  return [-90, 150, 30].map((deg) => {
    const rad = (deg * Math.PI) / 180;
    return { x: c.x + Math.cos(rad) * r, y: c.y + Math.sin(rad) * r };
  });
}

export function trianglePath(pts: Point[]): string {
  const [a, b, c] = pts;
  return `M${f(a.x)},${f(a.y)} L${f(b.x)},${f(b.y)} L${f(c.x)},${f(c.y)} Z`;
}
