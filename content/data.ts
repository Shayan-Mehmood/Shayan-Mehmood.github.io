export const profile = {
  name: "Shayan Mehmood",
  title: "AI Architect",
  subtitle: "Full Stack AI Engineer · LLM Systems Builder · SaaS Architect",
  pitch:
    "I design agentic LLM pipelines, retrieval systems and multi-tenant SaaS platforms — from the vector index to the last pixel.",
  email: "shayanshehzad12@gmail.com",
  github: "https://github.com/Shayan-Mehmood",
  linkedin: "https://www.linkedin.com/in/shayan-mehmood-b4048b257/",
} as const;

/* ───────────────────────── Agentic workflow graph ───────────────────────── */

export type AgentNodeId = "input" | "router" | "vector" | "consensus" | "action";

export interface AgentNode {
  id: AgentNodeId;
  label: string;
  kicker: string;
  detail: string;
  stack: string[];
  metric: { label: string; value: string };
}

export const agentNodes: AgentNode[] = [
  {
    id: "input",
    label: "User Input",
    kicker: "01 · Ingress",
    detail: "Streaming edge endpoint normalises prompt, attachments and session memory into a typed request envelope.",
    stack: ["Next.js Route Handlers", "Zod", "Server-Sent Events", "Edge Runtime"],
    metric: { label: "p95 ingress", value: "38ms" },
  },
  {
    id: "router",
    label: "Query Routing",
    kicker: "02 · Classify",
    detail: "A small, fast model classifies intent and cost tier, then dispatches the job onto the right queue with a retry budget.",
    stack: ["BullMQ", "Redis Streams", "LangGraph", "gpt-4o-mini"],
    metric: { label: "route accuracy", value: "97.4%" },
  },
  {
    id: "vector",
    label: "Vector Search",
    kicker: "03 · Retrieve",
    detail: "Hybrid dense + sparse retrieval in Qdrant with payload filters per tenant, re-ranked before it touches a prompt.",
    stack: ["Qdrant", "HNSW", "Cohere Rerank", "Redis Cache"],
    metric: { label: "recall@10", value: "0.93" },
  },
  {
    id: "consensus",
    label: "Multi-Agent Consensus",
    kicker: "04 · Deliberate",
    detail: "Planner, Critic and Verifier agents debate a draft; low-agreement outputs loop back to routing for a re-plan.",
    stack: ["LangGraph", "Claude", "GPT-4o", "Structured Outputs"],
    metric: { label: "hallucination ↓", value: "−71%" },
  },
  {
    id: "action",
    label: "Action Execution",
    kicker: "05 · Commit",
    detail: "Idempotent tool calls run inside BullMQ workers; results stream back to the client and persist to Postgres.",
    stack: ["BullMQ Workers", "PostgreSQL", "Stripe / Webhooks", "OpenTelemetry"],
    metric: { label: "exactly-once", value: "✓" },
  },
];

export const consensusAgents = ["Planner", "Critic", "Verifier"] as const;

/* ───────────────────────── Projects ───────────────────────── */

export interface Project {
  id: string;
  index: string;
  name: string;
  tagline: string;
  category: string;
  href?: string;
  palette: [string, string, string];
  summary: string;
  pipeline: { step: string; detail: string }[];
  stack: string[];
  stats: { label: string; value: string }[];
}

export const projects: Project[] = [
  {
    id: "minilessons",
    index: "01",
    name: "MiniLessons Academy",
    tagline: "One prompt → a publishable course.",
    category: "AI · EdTech SaaS · Flagship",
    href: "https://minilessonsacademy.com",
    palette: ["#00e5ff", "#7c3aed", "#030314"],
    summary:
      "An AI course-generation platform: a single prompt fans out into chapters, quizzes, narrated audio and cover art, then lands in an editor where teachers refine, price and sell.",
    pipeline: [
      { step: "Outline synthesis", detail: "LLM drafts a structured syllabus validated against a JSON schema before any content is generated." },
      { step: "Parallel chapter generation", detail: "Each chapter becomes a BullMQ job; workers stream tokens back over SSE so the editor fills in live." },
      { step: "Grounded retrieval", detail: "Uploaded source material is chunked, embedded and stored in Qdrant; chapters cite retrieved passages." },
      { step: "Media pipeline", detail: "Imagen-3 covers and TTS narration are generated asynchronously and stored in Supabase Storage." },
      { step: "Monetisation", detail: "Stripe Connect checkout, student dashboards and export to PDF / audio bundles." },
    ],
    stack: ["Next.js", "TypeScript", "Supabase", "Postgres", "Qdrant", "Redis", "BullMQ", "Stripe", "OpenAI", "Imagen-3"],
    stats: [
      { label: "Generation time", value: "< 90s" },
      { label: "Artifacts / course", value: "40+" },
      { label: "Queue workers", value: "Auto-scaled" },
    ],
  },
  {
    id: "alignography",
    index: "02",
    name: "Alignography",
    tagline: "Geospatial intelligence for multi-location brands.",
    category: "Enterprise · GIS · Ads",
    href: "https://alignography.com",
    palette: ["#00ffa3", "#0ea5e9", "#020b0c"],
    summary:
      "A multi-tenant GIS portal with role-scoped dashboards, clustering, heatmaps and outlet forecasting, wired into Google and Meta Ads through a FastAPI microservice.",
    pipeline: [
      { step: "Tenant isolation", detail: "Row-level security in Postgres keeps every brand's outlets, audiences and spend partitioned." },
      { step: "Spatial engine", detail: "PostGIS queries feed vector tiles rendered with MapLibre and React Map GL." },
      { step: "Ads bridge", detail: "FastAPI service syncs campaign geo-targets with Google and Meta Ads APIs." },
      { step: "Realtime", detail: "WebSocket fan-out pushes forecast updates and campaign deltas to open dashboards." },
    ],
    stack: ["Next.js", "React", "TypeScript", "FastAPI", "Postgres", "PostGIS", "MapLibre", "WebSockets"],
    stats: [
      { label: "Roles", value: "4 tiers" },
      { label: "Map layers", value: "WMS + vector" },
      { label: "Ad networks", value: "2" },
    ],
  },
  {
    id: "bonusview",
    index: "03",
    name: "BonusView",
    tagline: "Premium, gated video at CDN speed.",
    category: "Streaming · Creator SaaS",
    href: "https://bonusview.com",
    palette: ["#ff3bff", "#ff6b35", "#0c0208"],
    summary:
      "A creator video platform with paywalled content, DRM streaming through Cloudflare and JW Player, and subscription management for creators.",
    pipeline: [
      { step: "Ingest", detail: "Signed uploads land in Cloudflare Stream and are transcoded to adaptive bitrate ladders." },
      { step: "Entitlements", detail: "Supabase auth + policies gate playback tokens per subscription tier." },
      { step: "Playback", detail: "JW Player with DRM and signed URLs; analytics events stream to the creator dashboard." },
    ],
    stack: ["React", "TypeScript", "Supabase", "Postgres", "Cloudflare", "Node.js"],
    stats: [
      { label: "Delivery", value: "Global CDN" },
      { label: "Protection", value: "DRM" },
      { label: "Billing", value: "Recurring" },
    ],
  },
];

/* ───────────────────────── Experience ───────────────────────── */

export interface Role {
  company: string;
  role: string;
  period: string;
  mode: string;
  headline: string;
  systems: { name: string; detail: string }[];
  stack: string[];
  accent: string;
}

export const roles: Role[] = [
  {
    company: "Unstuck Labs",
    role: "Systems Architect",
    period: "2024 — Present",
    mode: "Full-time",
    headline: "Owning the platform architecture behind an accelerator's cohort programs and its AI tooling.",
    systems: [
      { name: "LLM ops layer", detail: "Shared LangChain service with prompt versioning, eval harness and per-tenant cost metering." },
      { name: "Event backbone", detail: "Node.js services communicating over Redis queues with idempotent consumers and dead-letter replays." },
      { name: "Reporting pipeline", detail: "Automated cohort reports generated from Postgres snapshots and summarised by LLM agents." },
    ],
    stack: ["Next.js", "Node.js", "TypeScript", "PostgreSQL", "Redis", "AWS", "LangChain"],
    accent: "#00e5ff",
  },
  {
    company: "Whateversfine",
    role: "Senior AI Architect",
    period: "2023 — 2024",
    mode: "Contract",
    headline: "Designed retrieval-augmented product features and the delivery pipeline that shipped them weekly.",
    systems: [
      { name: "RAG service", detail: "Embedding ingestion, hybrid vector search and grounded answer generation with citation tracking." },
      { name: "Agent workflows", detail: "Tool-calling agents orchestrated as background jobs with human-in-the-loop checkpoints." },
      { name: "Delivery", detail: "CI/CD with preview environments, schema migrations and feature-flagged rollouts." },
    ],
    stack: ["React", "Node.js", "Express", "MongoDB", "Vector DB", "OpenAI", "Vercel"],
    accent: "#a855f7",
  },
  {
    company: "Metavystic",
    role: "GIS Platform Architect",
    period: "2022 — 2023",
    mode: "Full-time",
    headline: "Built spatial and 3D web platforms where maps, real-time data and WebGL rendering meet.",
    systems: [
      { name: "Spatial data plane", detail: "PostGIS-backed APIs serving vector tiles and GeoJSON to MapLibre clients." },
      { name: "3D visualisation", detail: "Three.js and GLSL layers for terrain, heatmaps and animated analytics overlays." },
      { name: "Realtime collaboration", detail: "GraphQL subscriptions syncing shared map state across sessions." },
    ],
    stack: ["React", "Three.js", "GLSL", "PostGIS", "MapLibre", "GraphQL", "GSAP"],
    accent: "#00ffa3",
  },
];
