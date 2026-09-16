/**
 * render-graph.ts — generate a Mermaid diagram from the architecture knowledge
 * graph (`.context/graph_snapshot.json`) and inject it into README.md.
 *
 * The diagram is written between the marker comments:
 *     <!-- GRAPH:START -->  …generated mermaid…  <!-- GRAPH:END -->
 * If the markers are absent, a new "## Architecture Graph" section is appended.
 *
 * Paths are resolved relative to THIS file (project root = parent of scripts/),
 * so the script works no matter the current working directory.
 *
 * Run:  pnpm graph:render        (see package.json — uses api/'s tsx, no new dep)
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// ── Types ─────────────────────────────────────────────────────────────────────

interface GraphNode {
  id: string;
  type: string;
  label: string;
  path?: string;
}
interface GraphEdge {
  source: string;
  target: string;
  type: string;
}
interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// ── Paths ───────────────────────────────────────────────────────────────────

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const GRAPH_PATH = resolve(ROOT, ".context/graph_snapshot.json");
const README_PATH = resolve(ROOT, "README.md");

/** `--check` = validate only, never write (used by the build gate). */
const CHECK_ONLY = process.argv.includes("--check");

const START = "<!-- GRAPH:START -->";
const END = "<!-- GRAPH:END -->";

// ── Styling per node type (fill / stroke / text) ──────────────────────────────

const TYPE_STYLE: Record<string, { fill: string; stroke: string; color: string }> = {
  Frontend_Page_Component: { fill: "#dbeafe", stroke: "#2563eb", color: "#1e3a8a" }, // blue
  Backend_Endpoint:        { fill: "#dcfce7", stroke: "#16a34a", color: "#14532d" }, // green
  Federated_Config:        { fill: "#ede9fe", stroke: "#7c3aed", color: "#4c1d95" }, // purple
  Message_Event:           { fill: "#ffedd5", stroke: "#ea580c", color: "#7c2d12" }, // orange
  Shared_DTO:              { fill: "#fef9c3", stroke: "#ca8a04", color: "#713f12" }, // yellow
};
const FALLBACK_STYLE = { fill: "#f1f5f9", stroke: "#64748b", color: "#0f172a" }; // slate

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Make a label safe inside a Mermaid `id["…"]` node (quotes/HTML break it). */
function safeLabel(label: string): string {
  return label.replace(/"/g, "'").replace(/[<>]/g, "");
}

/** Escape a literal string for use in a RegExp. */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ── Validation ────────────────────────────────────────────────────────────────
//
// The graph is hand-maintained (.cursorrules RULE 3), so nothing but this check
// stops it drifting out of sync with the code. Run as `pnpm graph:check` — it is
// part of the Docker build gate, which makes RULE 3 mechanical rather than an
// honour system.

const NODE_TYPES = new Set(Object.keys(TYPE_STYLE));
const EDGE_TYPES = new Set([
  "FETCHES_FROM",
  "TRIGGERS",
  "LISTENS_TO",
  "EXPOSES",
  "VALIDATES_WITH",
]);

function validateGraph(graph: Graph): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();

  for (const n of graph.nodes) {
    const where = `node "${n.id ?? "(no id)"}"`;
    if (!n.id) errors.push(`${where}: missing id`);
    else if (seen.has(n.id)) errors.push(`${where}: duplicate id`);
    else seen.add(n.id);

    if (!n.label) errors.push(`${where}: missing label`);
    if (!NODE_TYPES.has(n.type)) {
      errors.push(
        `${where}: unknown type "${n.type}" (allowed: ${[...NODE_TYPES].join(" | ")})`,
      );
    }
    // The check that catches a rename the agent forgot to mirror here.
    if (n.path && !existsSync(resolve(ROOT, n.path))) {
      errors.push(`${where}: path does not exist on disk — "${n.path}"`);
    }
  }

  for (const e of graph.edges) {
    const where = `edge ${e.source} -> ${e.target}`;
    if (!EDGE_TYPES.has(e.type)) {
      errors.push(
        `${where}: unknown type "${e.type}" (allowed: ${[...EDGE_TYPES].join(" | ")})`,
      );
    }
    if (!seen.has(e.source)) errors.push(`${where}: source is not a known node id`);
    if (!seen.has(e.target)) errors.push(`${where}: target is not a known node id`);
  }

  return errors;
}

// ── Mermaid generation ────────────────────────────────────────────────────────

function renderMermaid(graph: Graph): string {
  const lines: string[] = ["graph TD"];

  // Group nodes by type into subgraphs for readability.
  const byType = new Map<string, GraphNode[]>();
  for (const n of graph.nodes) {
    if (!byType.has(n.type)) byType.set(n.type, []);
    byType.get(n.type)!.push(n);
  }

  for (const [type, nodes] of byType) {
    lines.push(`  subgraph ${type.replace(/[^A-Za-z0-9_]/g, "_")}["${type.replace(/_/g, " ")}"]`);
    for (const n of nodes) {
      lines.push(`    ${n.id}["${safeLabel(n.label)}"]:::${n.type}`);
    }
    lines.push("  end");
  }

  // Edges (labelled with the edge type).
  for (const e of graph.edges) {
    lines.push(`  ${e.source} -->|${e.type}| ${e.target}`);
  }

  // classDef per type (+ fallback for any unknown type present in the data).
  const usedTypes = new Set(graph.nodes.map((n) => n.type));
  for (const type of usedTypes) {
    const s = TYPE_STYLE[type] ?? FALLBACK_STYLE;
    lines.push(
      `  classDef ${type} fill:${s.fill},stroke:${s.stroke},color:${s.color},stroke-width:1px;`,
    );
  }

  return lines.join("\n");
}

// ── README injection ──────────────────────────────────────────────────────────

function injectIntoReadme(readme: string, mermaid: string): string {
  const block = `${START}\n\n\`\`\`mermaid\n${mermaid}\n\`\`\`\n\n${END}`;
  const re = new RegExp(`${escapeRegExp(START)}[\\s\\S]*?${escapeRegExp(END)}`);

  if (re.test(readme)) {
    return readme.replace(re, block);
  }
  // No markers yet — append a new section (ensure a trailing newline).
  const sep = readme.endsWith("\n") ? "\n" : "\n\n";
  return `${readme}${sep}## Architecture Graph\n\n> Auto-generated from \`.context/graph_snapshot.json\` via \`pnpm graph:render\`. Do not edit by hand.\n\n${block}\n`;
}

// ── Main ──────────────────────────────────────────────────────────────────────

function main(): void {
  let graph: Graph;
  try {
    graph = JSON.parse(readFileSync(GRAPH_PATH, "utf8")) as Graph;
  } catch (err) {
    console.error(`[graph:render] cannot read/parse ${GRAPH_PATH}:`, err);
    process.exit(1);
  }

  if (!Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
    console.error("[graph:render] graph must have `nodes` and `edges` arrays.");
    process.exit(1);
  }

  const problems = validateGraph(graph);
  if (problems.length > 0) {
    console.error(
      `[graph] ${problems.length} problem(s) in .context/graph_snapshot.json:`,
    );
    for (const p of problems) console.error(`  - ${p}`);
    console.error(
      "\nUpdate the snapshot in the SAME commit as the code change (see AGENTS.md).",
    );
    process.exit(1);
  }

  const mermaid = renderMermaid(graph);

  let readme: string;
  try {
    readme = readFileSync(README_PATH, "utf8");
  } catch (err) {
    console.error(`[graph:render] cannot read ${README_PATH}:`, err);
    process.exit(1);
  }

  const updated = injectIntoReadme(readme, mermaid);

  // `--check` never writes: it verifies the snapshot is valid AND that the
  // README block matches what would be generated, so a stale diagram fails CI.
  if (CHECK_ONLY) {
    if (updated !== readme) {
      console.error(
        "[graph:check] README's graph block is stale — run `pnpm graph:render`.",
      );
      process.exit(1);
    }
    console.log(
      `[graph:check] OK — ${graph.nodes.length} nodes / ${graph.edges.length} edges valid and README current.`,
    );
    return;
  }

  if (updated === readme) {
    console.log("[graph:render] README already up to date — no change.");
    return;
  }

  writeFileSync(README_PATH, updated, "utf8");
  console.log(
    `[graph:render] wrote ${graph.nodes.length} nodes / ${graph.edges.length} edges to README.md.`,
  );
}

main();
