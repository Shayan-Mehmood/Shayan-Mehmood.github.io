"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { useMediaQuery } from "@/lib/hooks";
import { agentNodes, consensusAgents, type AgentNodeId } from "@/content/data";
import { EDGES, LAYOUTS, agentPositions, edgePath, trianglePath, type LayoutKind } from "./graph";
import { NodeInspector } from "./NodeInspector";
import { TraceLog, type TraceLine } from "./TraceLog";
import styles from "./Agentic.module.css";

const ROUTE: string[] = ["e-input-router", "e-router-vector", "e-vector-consensus", "e-consensus-action"];
const HOP_DURATION = 0.95;

const TRACE_TEXT: Record<AgentNodeId, (id: string) => string> = {
  input: (id) => `req ${id} ← POST /v1/agent  stream=true`,
  router: (id) => `req ${id} → intent=research  queue=bullmq:tier-2`,
  vector: (id) => `req ${id} ⇢ qdrant.search k=24 → rerank → 8 ctx`,
  consensus: (id) => `req ${id} ⟲ planner/critic/verifier  agree=0.92`,
  action: (id) => `req ${id} ✓ tool.exec committed  (idempotent)`,
};

export function AgenticGraph() {
  const root = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const isWide = useMediaQuery("(min-width: 900px)");
  const kind: LayoutKind = isWide ? "wide" : "tall";
  const layout = LAYOUTS[kind];

  const [active, setActive] = useState<AgentNodeId | null>(null);
  const [trace, setTrace] = useState<TraceLine[]>([]);
  const traceSeq = useRef(0);

  const paths = useMemo(
    () => EDGES.map((e) => ({ ...e, d: edgePath(e, layout, kind) })),
    [layout, kind],
  );
  const agents = useMemo(() => agentPositions(layout), [layout]);
  const triangle = useMemo(() => trianglePath(agents), [agents]);

  const pushTrace = useCallback((node: AgentNodeId, reqId: string) => {
    traceSeq.current += 1;
    const line: TraceLine = { key: traceSeq.current, node, text: TRACE_TEXT[node](reqId), t: performance.now() };
    setTrace((prev) => [...prev.slice(-6), line]);
  }, []);

  useGSAP(
    () => {
      const svg = svgRef.current;
      if (!svg) return;
      const q = gsap.utils.selector(svg);
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      // ── Construction timeline: scrubbed by scroll ──
      const edgeEls = q<SVGPathElement>("[data-edge]");
      edgeEls.forEach((p) => {
        const len = p.getTotalLength();
        gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
      });
      gsap.set(q("[data-node]"), { scale: 0, autoAlpha: 0, transformOrigin: "50% 50%", transformBox: "fill-box" });
      gsap.set(q("[data-agent]"), { scale: 0, autoAlpha: 0, transformOrigin: "50% 50%", transformBox: "fill-box" });
      gsap.set(q("[data-triangle]"), { autoAlpha: 0 });
      gsap.set(q("[data-edge-label]"), { autoAlpha: 0 });
      gsap.set(q("[data-packets]"), { autoAlpha: 0 });

      const order: AgentNodeId[] = ["input", "router", "vector", "consensus", "action"];
      const build = gsap.timeline({ defaults: { ease: "none" } });
      order.forEach((id, i) => {
        build.to(q(`[data-node='${id}']`), { scale: 1, autoAlpha: 1, duration: 0.5, ease: "back.out(2.2)" }, i * 0.8);
        const outgoing = EDGES.find((e) => e.from === id && e.kind === "forward");
        if (outgoing) {
          build.to(q(`[data-edge='${outgoing.id}']`), { strokeDashoffset: 0, duration: 0.8 }, i * 0.8 + 0.3);
          build.to(q(`[data-edge-label='${outgoing.id}']`), { autoAlpha: 1, duration: 0.3 }, i * 0.8 + 0.7);
        }
        if (id === "consensus") {
          build.to(q("[data-agent]"), { scale: 1, autoAlpha: 1, duration: 0.4, stagger: 0.12, ease: "back.out(3)" }, i * 0.8 + 0.2);
          build.to(q("[data-triangle]"), { autoAlpha: 1, duration: 0.4 }, i * 0.8 + 0.5);
        }
      });
      build.to(q("[data-edge='e-consensus-router']"), { strokeDashoffset: 0, duration: 0.9 }, ">-0.2");
      build.to(q("[data-edge-label='e-consensus-router']"), { autoAlpha: 1, duration: 0.3 }, ">-0.2");
      build.to(q("[data-packets]"), { autoAlpha: 1, duration: 0.4 }, ">");

      if (reduce) {
        build.progress(1);
      } else {
        ScrollTrigger.create(
          isWide
            ? {
                trigger: root.current,
                start: "top top",
                end: "+=160%",
                pin: true,
                scrub: 0.8,
                animation: build,
                anticipatePin: 1,
              }
            : { trigger: svg, start: "top 80%", end: "bottom 60%", scrub: 0.8, animation: build },
        );
      }

      // ── Live data packets travelling the route ──
      const edgeById = (id: string) => q<SVGPathElement>(`[data-edge='${id}']`)[0];
      const nodeFlash = (id: AgentNodeId) => {
        const ring = q(`[data-node='${id}'] [data-ring]`);
        gsap.fromTo(ring, { attr: { "stroke-opacity": 1 }, strokeWidth: 3 }, { attr: { "stroke-opacity": 0.35 }, strokeWidth: 1, duration: 0.9, ease: "power2.out" });
      };

      const packets = q<SVGGElement>("[data-packet]");
      packets.forEach((pkt, i) => {
        const tl = gsap.timeline({ repeat: -1, delay: i * 1.35, repeatDelay: 0.6 });
        const reqId = () => (0x1f00 + Math.floor(Math.random() * 0xdf)).toString(16);
        let id = reqId();
        tl.call(() => {
          id = reqId();
          pushTrace("input", id);
          nodeFlash("input");
        });
        tl.set(pkt, { autoAlpha: 1 });
        ROUTE.forEach((edgeId) => {
          const edge = EDGES.find((e) => e.id === edgeId)!;
          const path = edgeById(edgeId);
          tl.to(pkt, {
            duration: HOP_DURATION,
            ease: "power1.inOut",
            motionPath: { path, align: path, alignOrigin: [0.5, 0.5], autoRotate: true },
          });
          tl.call(() => {
            pushTrace(edge.to, id);
            nodeFlash(edge.to);
          });
          if (edge.to === "consensus") tl.to({}, { duration: 0.45 }); // deliberation dwell
        });
        tl.to(pkt, { autoAlpha: 0, duration: 0.2 });
      });

      // Occasional re-plan packet along the feedback loop.
      const fb = q<SVGGElement>("[data-feedback-packet]")[0];
      const fbPath = edgeById("e-consensus-router");
      if (fb && fbPath) {
        gsap
          .timeline({ repeat: -1, delay: 3.2, repeatDelay: 4.5 })
          .set(fb, { autoAlpha: 1 })
          .to(fb, { duration: 1.6, ease: "power2.inOut", motionPath: { path: fbPath, align: fbPath, alignOrigin: [0.5, 0.5] } })
          .call(() => nodeFlash("router"))
          .to(fb, { autoAlpha: 0, duration: 0.2 });
      }

      // Agents passing messages around the deliberation triangle.
      const tri = q<SVGPathElement>("[data-triangle-path]")[0];
      q<SVGCircleElement>("[data-agent-packet]").forEach((dot, i) => {
        gsap.to(dot, {
          duration: 2.4,
          repeat: -1,
          ease: "none",
          delay: i * 0.8,
          motionPath: { path: tri, align: tri, alignOrigin: [0.5, 0.5], start: i / 3, end: i / 3 + 1 },
        });
      });

      // This pin is (re)created after sibling sections registered theirs; re-order and re-measure all of them.
      ScrollTrigger.sort();
      ScrollTrigger.refresh();
    },
    { scope: root, dependencies: [kind], revertOnUpdate: true },
  );

  const { w: nw, h: nh } = layout.node;
  const vb = layout.viewBox;
  const activeNode = agentNodes.find((n) => n.id === active) ?? null;

  return (
    <div ref={root} className={styles.stage}>
      <div className={styles.header}>
        <p className="kicker">02 — Agentic Execution</p>
        <h2 className="section-title">
          Systems that <span className="outline">think</span>
          <br />
          in loops.
        </h2>
        <p className={styles.lede}>
          A production request path from one of my orchestration stacks. Hover a node to inspect the machinery underneath.
        </p>
      </div>

      <div className={styles.canvas}>
        <svg
          ref={svgRef}
          key={kind}
          viewBox={`0 0 ${vb.w} ${vb.h}`}
          className={styles.svg}
          role="img"
          aria-label="Agent workflow: User Input, Query Routing, Vector Search on Qdrant, Multi-Agent Consensus, Action Execution, with a re-plan loop from consensus back to routing."
        >
          <defs>
            <linearGradient id="edge-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#00e5ff" stopOpacity="0.9" />
              <stop offset="1" stopColor="#8b5cf6" stopOpacity="0.9" />
            </linearGradient>
            <radialGradient id="packet-grad">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="0.35" stopColor="#00e5ff" />
              <stop offset="1" stopColor="#00e5ff" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="packet-grad-fb">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="0.35" stopColor="#ff3bff" />
              <stop offset="1" stopColor="#ff3bff" stopOpacity="0" />
            </radialGradient>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="glow-strong" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="9" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M40 0H0V40" fill="none" stroke="rgba(255,255,255,0.035)" strokeWidth="1" />
            </pattern>
          </defs>

          <rect width={vb.w} height={vb.h} fill="url(#grid)" />

          {/* Edges: faint rail + animated drawn stroke */}
          {paths.map((e) => (
            <g key={e.id}>
              <path d={e.d} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
              <path
                data-edge={e.id}
                d={e.d}
                fill="none"
                stroke={e.kind === "feedback" ? "#ff3bff" : "url(#edge-grad)"}
                strokeOpacity={e.kind === "feedback" ? 0.55 : 0.85}
                strokeWidth={e.kind === "feedback" ? 1.2 : 1.6}
                filter="url(#glow)"
                strokeLinecap="round"
              />
            </g>
          ))}

          {/* Edge labels at path midpoints (approximated from endpoints) */}
          {paths.map((e) => {
            const a = layout.positions[e.from];
            const b = layout.positions[e.to];
            let x = (a.x + b.x) / 2;
            let y = (a.y + b.y) / 2 - 14;
            if (e.kind === "feedback") {
              if (kind === "wide") y = a.y + nh / 2 + 150;
              else x = Math.min(a.x, b.x) - nw / 2 - 90;
            } else if (kind === "tall") {
              x += 70;
              y += 14;
            }
            return (
              <text
                key={`${e.id}-l`}
                data-edge-label={e.id}
                x={x}
                y={y}
                textAnchor="middle"
                className={styles.edgeLabel}
                fill={e.kind === "feedback" ? "#ff8dff" : "#6f7a96"}
              >
                {e.label}
              </text>
            );
          })}

          {/* Deliberation triangle + agents */}
          <g data-triangle>
            <path data-triangle-path d={triangle} fill="none" stroke="rgba(139,92,246,0.35)" strokeWidth={1} strokeDasharray="3 5" />
            {[0, 1, 2].map((i) => (
              <circle key={i} data-agent-packet r={2.6} fill="#c4b5fd" filter="url(#glow)" />
            ))}
          </g>
          {agents.map((p, i) => (
            <g key={consensusAgents[i]} data-agent>
              <circle cx={p.x} cy={p.y} r={17} fill="#07071a" stroke="#8b5cf6" strokeOpacity={0.7} />
              <circle cx={p.x} cy={p.y} r={4} fill="#a78bfa" filter="url(#glow)" />
              <text x={p.x} y={p.y + (i === 0 ? -26 : 34)} textAnchor="middle" className={styles.agentLabel}>
                {consensusAgents[i]}
              </text>
            </g>
          ))}

          {/* Nodes */}
          {agentNodes.map((n) => {
            const p = layout.positions[n.id];
            const isActive = active === n.id;
            return (
              <g
                key={n.id}
                data-node={n.id}
                className={styles.node}
                tabIndex={0}
                role="button"
                aria-label={`${n.label}: ${n.stack.join(", ")}`}
                onPointerEnter={() => setActive(n.id)}
                onPointerLeave={() => isWide && setActive(null)}
                onFocus={() => setActive(n.id)}
                onBlur={() => setActive(null)}
                onClick={() => setActive((cur) => (cur === n.id && !isWide ? null : n.id))}
              >
                <motion.rect
                  x={p.x - nw / 2 - 8}
                  y={p.y - nh / 2 - 8}
                  width={nw + 16}
                  height={nh + 16}
                  rx={22}
                  fill="none"
                  stroke="#00e5ff"
                  filter="url(#glow-strong)"
                  initial={false}
                  animate={{ opacity: isActive ? 0.55 : 0, strokeWidth: isActive ? 2 : 0 }}
                  transition={{ duration: 0.35 }}
                />
                <rect
                  x={p.x - nw / 2}
                  y={p.y - nh / 2}
                  width={nw}
                  height={nh}
                  rx={16}
                  fill={isActive ? "rgba(0,229,255,0.09)" : "rgba(10,10,24,0.82)"}
                  style={{ transition: "fill .35s" }}
                />
                <rect
                  data-ring
                  x={p.x - nw / 2}
                  y={p.y - nh / 2}
                  width={nw}
                  height={nh}
                  rx={16}
                  fill="none"
                  stroke={isActive ? "#00e5ff" : "#6b7cff"}
                  strokeOpacity={0.35}
                  strokeWidth={1}
                />
                <circle cx={p.x - nw / 2 + 20} cy={p.y} r={4} fill="#00e5ff" filter="url(#glow)" />
                <text x={p.x - nw / 2 + 36} y={p.y - 8} className={styles.nodeKicker}>
                  {n.kicker}
                </text>
                <text x={p.x - nw / 2 + 36} y={p.y + 14} className={styles.nodeLabel}>
                  {n.label}
                </text>
              </g>
            );
          })}

          {/* Packets (hidden until the graph is constructed) */}
          <g data-packets pointerEvents="none">
            {[0, 1, 2].map((i) => (
              <g key={i} data-packet opacity={0}>
                <circle r={14} fill="url(#packet-grad)" />
                <rect x={-7} y={-1.5} width={14} height={3} rx={1.5} fill="#ffffff" />
              </g>
            ))}
            <g data-feedback-packet opacity={0}>
              <circle r={12} fill="url(#packet-grad-fb)" />
            </g>
          </g>
        </svg>

        {/* Desktop: floating inspector anchored to the hovered node */}
        {isWide && (
          <AnimatePresence>
            {activeNode && (
              <NodeInspector
                key={activeNode.id}
                node={activeNode}
                style={{
                  left: `${(layout.positions[activeNode.id].x / vb.w) * 100}%`,
                  top: `${((layout.positions[activeNode.id].y + nh / 2 + 18) / vb.h) * 100}%`,
                }}
                floating
              />
            )}
          </AnimatePresence>
        )}
      </div>

      {!isWide && (
        <AnimatePresence mode="wait">
          {activeNode && <NodeInspector key={activeNode.id} node={activeNode} />}
        </AnimatePresence>
      )}

      <TraceLog lines={trace} />
    </div>
  );
}
