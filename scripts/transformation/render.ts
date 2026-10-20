/**
 * Renders the ordered, tabular forms of the transformation files (#31).
 *
 *   npx tsx scripts/transformation/render.ts           writes every target
 *   npx tsx scripts/transformation/render.ts --check   exits 1 when a target is stale
 *
 * dependency-graph.test.ts compares the committed Markdown with this output.
 */
import fs from 'fs';
import path from 'path';
import {
  GRAPH_JSON_PATH,
  GRAPH_MD_PATH,
  KIND_GATES,
  ROOT_ID,
  approvedArcs,
  capabilityPath,
  edgeLabel,
  fallbackArcs,
  indexGraph,
  loadGraph,
  type DependencyGraph,
  type GraphEdge,
  type GraphNode,
} from './graph';

const short = (id: string) => id.replace(/^CHECKMATE-/, '');
const code = (id: string) => `\`${short(id)}\``;
const cell = (text: string) => text.replace(/\|/g, '\\|');

/** Nodes in plannedWave order, predecessors first within a wave, ties in JSON order. */
export function orderNodes(graph: DependencyGraph): GraphNode[] {
  const position = new Map(graph.nodes.map((node, i) => [node.id, i]));
  const indegree = new Map(graph.nodes.map((node) => [node.id, 0]));
  const successors = new Map<string, string[]>();
  for (const arc of [...approvedArcs(graph), ...fallbackArcs(graph)]) {
    indegree.set(arc.to, (indegree.get(arc.to) ?? 0) + 1);
    const list = successors.get(arc.from) ?? [];
    list.push(arc.to);
    successors.set(arc.from, list);
  }
  const byId = indexGraph(graph).byId;
  const ready = graph.nodes.filter((node) => indegree.get(node.id) === 0);
  const ordered: GraphNode[] = [];
  const rank = (node: GraphNode) => node.plannedWave * graph.nodes.length + (position.get(node.id) ?? 0);
  while (ready.length > 0) {
    ready.sort((a, b) => rank(a) - rank(b));
    const next = ready.shift() as GraphNode;
    ordered.push(next);
    for (const id of successors.get(next.id) ?? []) {
      const left = (indegree.get(id) ?? 0) - 1;
      indegree.set(id, left);
      const node = byId.get(id);
      if (left === 0 && node) ready.push(node);
    }
  }
  if (ordered.length !== graph.nodes.length) {
    const stuck = graph.nodes.filter((node) => !ordered.includes(node)).map((node) => node.id);
    throw new Error(`dependency graph has a cycle among: ${stuck.join(', ')}`);
  }
  return ordered;
}

function nodeCell(node: GraphNode, slices: string[]): string {
  const label = {
    root: `${code(node.id)} (root)`,
    gate: `${code(node.id)} (gate)`,
    leaf: slices.length > 0 ? `${code(node.id)} (leaf, ${slices.length} slices)` : `${code(node.id)} (leaf)`,
    slice: code(node.id),
  }[node.type];
  const parts = [label, cell(node.title)];
  if (node.note) parts.push(`_${cell(node.note)}_`);
  return parts.join('<br>');
}

function kindsCell(node: GraphNode): string {
  const parts = [node.kinds.join(', ')];
  for (const [gate, reason] of Object.entries(node.gateExempt)) parts.push(`not ${gate}: ${cell(reason)}`);
  return parts.filter((part) => part !== '').join('<br>');
}

function list(ids: string[]): string {
  return ids.map(code).join(', ');
}

export function renderDependencyGraph(graph: DependencyGraph): string {
  const index = indexGraph(graph);
  const ordered = orderNodes(graph);
  const position = new Map(graph.nodes.map((node, i) => [node.id, i]));
  const incoming = new Map<string, GraphEdge[]>();
  for (const edge of graph.edges) {
    const list = incoming.get(edge.to) ?? [];
    list.push(edge);
    incoming.set(edge.to, list);
  }
  // Predecessors read root, gates, then leaves and slices in JSON order.
  for (const list of incoming.values()) list.sort((a, b) => (position.get(a.from) ?? 0) - (position.get(b.from) ?? 0));
  const count = (type: GraphNode['type']) => graph.nodes.filter((node) => node.type === type).length;
  const statuses = ['approved-refinement', 'approved-wave', 'pending-owner'] as const;
  const statusCounts = statuses
    .map((status) => [status, graph.edges.filter((edge) => edge.status === status).length] as const)
    .filter(([, n]) => n > 0)
    .map(([status, n]) => `${n} \`${status}\``)
    .join(', ');
  const starts = graph.edges.filter((edge) => edge.kind === 'merge-before-start').length;

  const out: string[] = [];
  out.push('# Transformation dependency graph');
  out.push('');
  out.push(
    '<!-- Generated from dependency-graph.json by `npx tsx scripts/transformation/render.ts`. Do not edit; scripts/transformation/dependency-graph.test.ts fails when this file is stale. -->',
  );
  out.push('');
  out.push(
    `This is the ordered, tabular form of [\`dependency-graph.json\`](dependency-graph.json) (CHECKMATE-01.3, #31), graph version ${graph.graphVersion}. The JSON is the source and wins over any other sequencing text, #1 included.`,
  );
  out.push('');
  out.push(
    `- ${graph.nodes.length} nodes: ${count('root')} root, ${count('gate')} gates, ${count('leaf')} leaves, ${count('slice')} slices.`,
  );
  out.push(`- ${graph.edges.length} edges (${statusCounts}): ${starts} merge-before-start, ${graph.edges.length - starts} merge-before-merge.`);
  out.push(`- ${graph.openDecisions.length} open owner decisions, ${graph.droppedCapabilityEdges.length} dropped capability edges.`);
  out.push('');
  out.push('## How to read it');
  out.push('');
  out.push('- **Starts after**: `merge-before-start` predecessors. The node opens no PR until they merge.');
  out.push('- **Merges after**: `merge-before-merge` predecessors. The node may be built in parallel but merges after them.');
  out.push('- A leaf with slices completes when all its slices merge; no edge enters it, and an edge leaving it waits for every slice.');
  const gateRule = Object.entries(KIND_GATES)
    .map(([kind, gate]) => (gate ? `\`${kind}\` waits for ${gate}` : `\`${kind}\` waits for no gate`))
    .join(', ');
  out.push(`- Kinds: ${gateRule}. "not G*" lists an exemption and its reason.`);
  out.push('- Nodes are ordered by planned wave, then so that every predecessor comes first. IDs drop the `CHECKMATE-` prefix.');
  out.push('');

  out.push('## Gates');
  out.push('');
  out.push('| Gate | Holds when | Planned wave | Members | Nodes that wait for it |');
  out.push('|---|---|---|---|---|');
  for (const node of graph.nodes.filter((n) => n.type === 'gate')) {
    const members = (incoming.get(node.id) ?? []).map((edge) => edge.from);
    const waiting = graph.edges.filter((edge) => edge.from === node.id).length;
    out.push(`| ${code(node.id)} | ${cell(node.title)} | ${node.plannedWave} | ${list(members)} | ${waiting} |`);
  }
  out.push('');

  let order = 0;
  for (let wave = 0; wave <= Math.max(...graph.nodes.map((node) => node.plannedWave)); wave += 1) {
    const inWave = ordered.filter((node) => node.plannedWave === wave);
    if (inWave.length === 0) continue;
    out.push(`## Wave ${wave}`);
    out.push('');
    out.push(`${inWave.length} nodes.`);
    out.push('');
    out.push('| # | Node | Kinds | Starts after | Merges after |');
    out.push('|---|---|---|---|---|');
    for (const node of inWave) {
      order += 1;
      const slices = index.slicesOf.get(node.id) ?? [];
      const preds = incoming.get(node.id) ?? [];
      const pending = preds.filter((edge) => edge.status === 'pending-owner');
      const settled = preds.filter((edge) => edge.status !== 'pending-owner');
      const startsAfter = list(settled.filter((edge) => edge.kind === 'merge-before-start').map((edge) => edge.from));
      let mergesAfter = list(settled.filter((edge) => edge.kind === 'merge-before-merge').map((edge) => edge.from));
      if (slices.length > 0) mergesAfter = `all its slices: ${list(slices)}`;
      if (pending.length > 0) mergesAfter = [mergesAfter, `pending owner: ${list(pending.map((edge) => edge.from))}`].filter(Boolean).join('<br>');
      if (node.id === ROOT_ID) mergesAfter = 'none (root)';
      out.push(`| ${order} | ${nodeCell(node, slices)} | ${kindsCell(node)} | ${startsAfter} | ${mergesAfter} |`);
    }
    out.push('');
  }

  out.push('## Edge notes');
  out.push('');
  out.push('Judgment calls and clarifications recorded on edges, in JSON order.');
  out.push('');
  out.push('| From | To | Kind | Source | Note |');
  out.push('|---|---|---|---|---|');
  for (const edge of graph.edges.filter((e) => e.note)) {
    out.push(`| ${code(edge.from)} | ${code(edge.to)} | ${edge.kind} | ${edge.source} | ${cell(edge.note ?? '')} |`);
  }
  out.push('');

  out.push('## Filed capability edges');
  out.push('');
  out.push('Each filed epic dependency is realized by a leaf-level path, or dropped with a reason. Capability edges are never expanded into leaf edges.');
  out.push('');
  out.push('| Capability edge | Filed in | Realized by |');
  out.push('|---|---|---|');
  const dropped = new Map(graph.droppedCapabilityEdges.map((entry) => [edgeLabel(entry), entry.reason]));
  for (const capability of graph.capabilityEdges) {
    const route = capabilityPath(graph, capability);
    const reason = dropped.get(edgeLabel(capability));
    const realized = route ? route.map(code).join(' → ') : `dropped: ${cell(reason ?? 'no reason recorded')}`;
    out.push(`| ${capability.from} → ${capability.to} | ${capability.source} | ${realized} |`);
  }
  out.push('');

  out.push('## Open owner decisions');
  out.push('');
  if (graph.openDecisions.length === 0) {
    out.push('None. Every edge is approved; an owner decision would add a `pending-owner` edge with its fallback here.');
  } else {
    out.push('| Edge | Question | Fallback until decided |');
    out.push('|---|---|---|');
    for (const decision of graph.openDecisions) {
      const edge = graph.edges.find((e) => e.from === decision.edge.from && e.to === decision.edge.to);
      const fallback = (edge?.fallback ?? []).map((fb) => `${code(fb.from)} → ${code(fb.to)} (${fb.kind})`).join('<br>');
      out.push(`| ${code(decision.edge.from)} → ${code(decision.edge.to)} | ${cell(decision.question)} | ${fallback} |`);
    }
  }
  out.push('');
  return out.join('\n');
}

interface RenderTarget {
  output: string;
  render(): string;
}

/** Each committed Markdown file and the renderer that produces it. */
export const RENDER_TARGETS: RenderTarget[] = [{ output: GRAPH_MD_PATH, render: () => renderDependencyGraph(loadGraph(GRAPH_JSON_PATH)) }];

function main(args: string[]): number {
  const check = args.includes('--check');
  let stale = 0;
  for (const target of RENDER_TARGETS) {
    const text = target.render();
    const relative = path.relative(process.cwd(), target.output);
    const current = fs.existsSync(target.output) ? fs.readFileSync(target.output, 'utf8') : null;
    if (check) {
      if (current !== text) {
        stale += 1;
        console.error(`${relative} is stale; run npx tsx scripts/transformation/render.ts`);
      }
    } else if (current !== text) {
      fs.writeFileSync(target.output, text);
      console.log(`wrote ${relative}`);
    } else {
      console.log(`${relative} is up to date`);
    }
  }
  return stale > 0 ? 1 : 0;
}

if (process.argv[1] !== undefined && path.resolve(process.argv[1]) === __filename) {
  process.exitCode = main(process.argv.slice(2));
}
