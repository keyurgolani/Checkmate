/**
 * Transformation dependency graph (CHECKMATE-01.3 · graph, #31).
 *
 * Types, loading, traversal and the checks that dependency-graph.test.ts runs
 * against docs/transformation/dependency-graph.json. Every check is a pure
 * function that returns one message per problem, naming the offending node,
 * edge or path; an empty list means the check passes.
 */
import fs from 'fs';
import path from 'path';

export const GRAPH_JSON_PATH = path.resolve(__dirname, '../../docs/transformation/dependency-graph.json');
export const GRAPH_MD_PATH = path.resolve(__dirname, '../../docs/transformation/dependency-graph.md');

export const ROOT_ID = 'TRACKER · Pre-0';
export const GATE_IDS = ['G0', 'G1', 'G2', 'G3'] as const;
export const KINDS = ['backend', 'schema-changing', 'command', 'ui', 'contract', 'ci'] as const;
export const NODE_TYPES = ['root', 'leaf', 'slice', 'gate'] as const;
export const EDGE_KINDS = ['merge-before-start', 'merge-before-merge'] as const;
export const EDGE_STATUSES = ['approved-wave', 'approved-refinement', 'pending-owner'] as const;
export const MAX_WAVE = 10;

export type GateId = (typeof GATE_IDS)[number];
export type Kind = (typeof KINDS)[number];
export type NodeType = (typeof NODE_TYPES)[number];
export type EdgeKind = (typeof EDGE_KINDS)[number];
export type EdgeStatus = (typeof EDGE_STATUSES)[number];

/** `backend` waits for G0, `schema-changing` for G1, `command` for G2, `ui` for G3 (#31). */
export const KIND_GATES: Record<Kind, GateId | null> = {
  backend: 'G0',
  'schema-changing': 'G1',
  command: 'G2',
  ui: 'G3',
  contract: null,
  ci: null,
};

export interface GraphNode {
  id: string;
  type: NodeType;
  parent: string | null;
  issue: number;
  approvedWave: number | null;
  plannedWave: number;
  kinds: Kind[];
  gateExempt: Partial<Record<GateId, string>>;
  title: string;
  note?: string;
}

export interface EdgeRef {
  from: string;
  to: string;
}

export interface FallbackEdge extends EdgeRef {
  kind: EdgeKind;
  note?: string;
}

export interface GraphEdge extends EdgeRef {
  kind: EdgeKind;
  status: EdgeStatus;
  source: string;
  fallback: FallbackEdge[] | null;
  note?: string;
}

export interface CapabilityEdge extends EdgeRef {
  source: string;
}

export interface DroppedCapabilityEdge extends EdgeRef {
  reason: string;
}

export interface OpenDecision {
  edge: EdgeRef;
  question: string;
}

export interface DependencyGraph {
  graphVersion: number;
  issue: number;
  about: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  capabilityEdges: CapabilityEdge[];
  droppedCapabilityEdges: DroppedCapabilityEdge[];
  openDecisions: OpenDecision[];
}

export interface GoldenEdge extends EdgeRef {
  /** Accepted `source` values. */
  sources: string[];
  status?: EdgeStatus;
  kind?: EdgeKind;
}

/** A plain edge as traversal sees it; closure edges run from a slice to its leaf. */
export interface Arc extends EdgeRef {
  kind: EdgeKind | 'closure';
  label: string;
}

/** One way the pending-owner decisions can fall, with the arcs that then hold. */
export interface Reading {
  label: string;
  arcs: Arc[];
}

const SOURCE_PATTERN =
  /^(#1 (Important delivery refinements|Wave 0 sequence|Wave plan|Leaf edges beyond the gates)|#\d+)$/;
const LEAF_ID = /^CHECKMATE-(\d{2})\.(\d)$/;
const SLICE_ID = /^(CHECKMATE-\d{2}\.\d) · (\S.*)$/;
const EPIC_ID = /^CHECKMATE-\d{2}$/;
const NODE_KEYS = new Set(['id', 'type', 'parent', 'issue', 'approvedWave', 'plannedWave', 'kinds', 'gateExempt', 'title', 'note']);
const EDGE_KEYS = new Set(['from', 'to', 'kind', 'status', 'source', 'fallback', 'note']);
const TOP_KEYS = new Set(['graphVersion', 'issue', 'about', 'nodes', 'edges', 'capabilityEdges', 'droppedCapabilityEdges', 'openDecisions']);
/** Each pending-owner edge doubles the readings checkAcyclic walks. */
const MAX_PENDING_OWNER_EDGES = 12;

export function loadGraph(file: string = GRAPH_JSON_PATH): DependencyGraph {
  return JSON.parse(fs.readFileSync(file, 'utf8')) as DependencyGraph;
}

export function edgeLabel(edge: EdgeRef): string {
  return `${edge.from} → ${edge.to}`;
}

function edgeKey(edge: EdgeRef): string {
  return `${edge.from}\u0000${edge.to}`;
}

function isGateId(value: string): value is GateId {
  return (GATE_IDS as readonly string[]).includes(value);
}

function isWave(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) <= MAX_WAVE;
}

export interface GraphIndex {
  byId: Map<string, GraphNode>;
  slicesOf: Map<string, string[]>;
  /** A leaf with slices: no edge enters it, and it completes when all its slices merge. */
  isClosure(id: string): boolean;
}

export function indexGraph(graph: DependencyGraph): GraphIndex {
  const byId = new Map<string, GraphNode>();
  for (const node of graph.nodes) if (!byId.has(node.id)) byId.set(node.id, node);
  const slicesOf = new Map<string, string[]>();
  for (const node of graph.nodes) {
    if (node.type !== 'slice' || node.parent === null) continue;
    const list = slicesOf.get(node.parent) ?? [];
    list.push(node.id);
    slicesOf.set(node.parent, list);
  }
  return {
    byId,
    slicesOf,
    isClosure: (id) => byId.get(id)?.type === 'leaf' && slicesOf.has(id),
  };
}

/** Implicit arcs from every slice to its leaf, so an edge leaving a leaf waits for all its slices. */
export function closureArcs(graph: DependencyGraph): Arc[] {
  return graph.nodes
    .filter((node) => node.type === 'slice' && node.parent !== null)
    .map((node) => ({ from: node.id, to: node.parent as string, kind: 'closure', label: `slice of ${node.parent}` }));
}

function arcOf(edge: GraphEdge | FallbackEdge, label: string): Arc {
  return { from: edge.from, to: edge.to, kind: edge.kind, label };
}

/**
 * Every mix of pending-owner decisions: each pending-owner edge either holds
 * (the owner confirms it) or its fallback edges hold. Approved edges and the
 * closure arcs hold in every reading.
 */
export function readings(graph: DependencyGraph): Reading[] {
  const base = approvedArcs(graph);
  const pending = graph.edges.filter((edge) => edge.status === 'pending-owner');
  if (pending.length === 0) return [{ label: 'approved edges', arcs: base }];
  if (pending.length > MAX_PENDING_OWNER_EDGES) {
    throw new Error(`${pending.length} pending-owner edges: too many to check every mix (limit ${MAX_PENDING_OWNER_EDGES}); decide some first`);
  }
  const result: Reading[] = [];
  for (let mask = 0; mask < 2 ** pending.length; mask += 1) {
    const arcs = [...base];
    const parts: string[] = [];
    pending.forEach((edge, i) => {
      if (mask & (1 << i)) {
        arcs.push(arcOf(edge, 'pending-owner'));
        parts.push(`${edgeLabel(edge)} confirmed`);
      } else {
        for (const fb of edge.fallback ?? []) arcs.push(arcOf(fb, `fallback of ${edgeLabel(edge)}`));
        parts.push(`${edgeLabel(edge)} on fallback`);
      }
    });
    result.push({ label: parts.join('; '), arcs });
  }
  return result;
}

function adjacency(arcs: Arc[]): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const arc of arcs) {
    const list = out.get(arc.from) ?? [];
    list.push(arc.to);
    out.set(arc.from, list);
  }
  return out;
}

/** Returns one cycle as a closed path (first node repeated last), or null. */
export function findCycle(nodeIds: string[], arcs: Arc[]): string[] | null {
  const out = adjacency(arcs);
  const state = new Map<string, 'open' | 'done'>();
  const ids = [...new Set([...nodeIds, ...arcs.map((arc) => arc.from)])];
  for (const start of ids) {
    if (state.has(start)) continue;
    const stack: { id: string; next: number }[] = [{ id: start, next: 0 }];
    const pathIds: string[] = [start];
    state.set(start, 'open');
    while (stack.length > 0) {
      const top = stack[stack.length - 1] as { id: string; next: number };
      const successors = out.get(top.id) ?? [];
      if (top.next >= successors.length) {
        state.set(top.id, 'done');
        stack.pop();
        pathIds.pop();
        continue;
      }
      const nextId = successors[top.next] as string;
      top.next += 1;
      const seen = state.get(nextId);
      if (seen === 'open') return [...pathIds.slice(pathIds.indexOf(nextId)), nextId];
      if (seen === undefined) {
        state.set(nextId, 'open');
        stack.push({ id: nextId, next: 0 });
        pathIds.push(nextId);
      }
    }
  }
  return null;
}

/** Breadth-first path from any start to any node accepted by `isTarget`, or null. */
export function findPath(arcs: Arc[], starts: string[], isTarget: (id: string) => boolean): string[] | null {
  const out = adjacency(arcs);
  const previous = new Map<string, string | null>();
  const queue: string[] = [];
  for (const start of starts) {
    if (isTarget(start)) return [start];
    if (!previous.has(start)) {
      previous.set(start, null);
      queue.push(start);
    }
  }
  for (let head = 0; head < queue.length; head += 1) {
    const current = queue[head] as string;
    for (const nextId of out.get(current) ?? []) {
      if (previous.has(nextId)) continue;
      previous.set(nextId, current);
      if (isTarget(nextId)) {
        const result = [nextId];
        let step: string | null | undefined = current;
        while (step) {
          result.unshift(step);
          step = previous.get(step);
        }
        return result;
      }
      queue.push(nextId);
    }
  }
  return null;
}

function epicOf(id: string): string | null {
  const match = /^(CHECKMATE-\d{2})\.\d/.exec(id);
  return match ? (match[1] as string) : null;
}

/** Arcs that hold in every reading: approved edges and closure arcs. */
export function approvedArcs(graph: DependencyGraph): Arc[] {
  return [
    ...graph.edges.filter((edge) => edge.status !== 'pending-owner').map((edge) => arcOf(edge, edge.source)),
    ...closureArcs(graph),
  ];
}

/** Arcs that hold until the owner decides: every pending-owner edge's fallback. */
export function fallbackArcs(graph: DependencyGraph): Arc[] {
  return graph.edges.flatMap((edge) => (edge.fallback ?? []).map((fb) => arcOf(fb, `fallback of ${edgeLabel(edge)}`)));
}

/** The leaf-level path realizing a filed capability edge through edges that hold in every reading, or null. */
export function capabilityPath(graph: DependencyGraph, capability: EdgeRef): string[] | null {
  const starts = graph.nodes.filter((node) => epicOf(node.id) === capability.from).map((node) => node.id);
  return findPath(approvedArcs(graph), starts, (id) => epicOf(id) === capability.to);
}

// ---------------------------------------------------------------------------
// Checks

/** Contract fields, value sets and ID formats (#31 Graph nodes and Graph edges). */
export function checkShape(graph: DependencyGraph): string[] {
  const errors: string[] = [];
  for (const key of Object.keys(graph)) if (!TOP_KEYS.has(key)) errors.push(`unknown top-level key "${key}"`);
  if (!Number.isInteger(graph.graphVersion) || graph.graphVersion < 1) errors.push('graphVersion must be a positive integer');
  if (typeof graph.about !== 'string') errors.push('about must be a string');
  for (const key of ['nodes', 'edges', 'capabilityEdges', 'droppedCapabilityEdges', 'openDecisions'] as const) {
    if (!Array.isArray(graph[key])) errors.push(`${key} must be an array`);
  }
  if (errors.length > 0) return errors;

  const seenIds = new Set<string>();
  for (const node of graph.nodes) {
    const where = `node ${node.id}`;
    for (const key of Object.keys(node)) if (!NODE_KEYS.has(key)) errors.push(`${where}: unknown key "${key}"`);
    if (seenIds.has(node.id)) errors.push(`${where}: duplicate id`);
    seenIds.add(node.id);
    if (!(NODE_TYPES as readonly string[]).includes(node.type)) errors.push(`${where}: unknown type "${node.type}"`);
    if (!Number.isInteger(node.issue) || node.issue < 1) errors.push(`${where}: issue must be a positive integer`);
    if (!isWave(node.plannedWave)) errors.push(`${where}: plannedWave must be an integer 0 to ${MAX_WAVE}`);
    const filed = node.type === 'leaf' || node.type === 'slice';
    if (filed ? !isWave(node.approvedWave) : node.approvedWave !== null) {
      errors.push(`${where}: approvedWave must be ${filed ? `an integer 0 to ${MAX_WAVE}` : 'null'}`);
    }
    if (typeof node.title !== 'string' || node.title.trim() === '') errors.push(`${where}: title is required`);
    if (node.note !== undefined && (typeof node.note !== 'string' || node.note.trim() === '')) errors.push(`${where}: empty note`);
    if (!Array.isArray(node.kinds)) {
      errors.push(`${where}: kinds must be an array`);
    } else {
      for (const kind of node.kinds) if (!(KINDS as readonly string[]).includes(kind)) errors.push(`${where}: unknown kind "${kind}"`);
      const canonical = KINDS.filter((kind) => node.kinds.includes(kind));
      if (canonical.length !== node.kinds.length || canonical.some((kind, i) => node.kinds[i] !== kind)) {
        errors.push(`${where}: kinds must be unique and in the order ${KINDS.join(', ')}`);
      }
    }
    if (typeof node.gateExempt !== 'object' || node.gateExempt === null || Array.isArray(node.gateExempt)) {
      errors.push(`${where}: gateExempt must be an object`);
    } else {
      for (const [gate, reason] of Object.entries(node.gateExempt)) {
        if (!isGateId(gate)) errors.push(`${where}: gateExempt names unknown gate "${gate}"`);
        if (typeof reason !== 'string' || reason.trim() === '') errors.push(`${where}: exemption from ${gate} needs a reason`);
      }
    }
    switch (node.type) {
      case 'root':
        if (node.id !== ROOT_ID) errors.push(`${where}: the root id is "${ROOT_ID}"`);
        if (node.parent !== null) errors.push(`${where}: root parent must be null`);
        break;
      case 'gate':
        if (!isGateId(node.id)) errors.push(`${where}: gate ids are ${GATE_IDS.join(', ')}`);
        if (node.parent !== null) errors.push(`${where}: gate parent must be null`);
        break;
      case 'leaf': {
        const match = LEAF_ID.exec(node.id);
        if (!match) errors.push(`${where}: leaf ids look like CHECKMATE-NN.M`);
        else if (node.parent !== `CHECKMATE-${match[1]}`) errors.push(`${where}: parent must be its epic CHECKMATE-${match[1]}`);
        break;
      }
      case 'slice': {
        const match = SLICE_ID.exec(node.id);
        if (!match) errors.push(`${where}: slice ids look like CHECKMATE-NN.M · <slice>`);
        else if (node.parent !== match[1]) errors.push(`${where}: parent must be ${match[1]}`);
        break;
      }
    }
    if ((node.type === 'root' || node.type === 'gate') && (node.kinds?.length ?? 0) > 0) errors.push(`${where}: ${node.type} nodes carry no kinds`);
  }

  const seenEdges = new Set<string>();
  for (const edge of graph.edges) {
    const where = `edge ${edgeLabel(edge)}`;
    for (const key of Object.keys(edge)) if (!EDGE_KEYS.has(key)) errors.push(`${where}: unknown key "${key}"`);
    if (edge.from === edge.to) errors.push(`${where}: self-loop`);
    if (seenEdges.has(edgeKey(edge))) errors.push(`${where}: duplicate edge`);
    seenEdges.add(edgeKey(edge));
    if (!(EDGE_KINDS as readonly string[]).includes(edge.kind)) errors.push(`${where}: unknown kind "${edge.kind}"`);
    if (!(EDGE_STATUSES as readonly string[]).includes(edge.status)) errors.push(`${where}: unknown status "${edge.status}"`);
    if (typeof edge.source !== 'string' || !SOURCE_PATTERN.test(edge.source)) {
      errors.push(`${where}: source "${edge.source}" must be "#N" or "#1 <section>"`);
    }
    if (edge.note !== undefined && (typeof edge.note !== 'string' || edge.note.trim() === '')) errors.push(`${where}: empty note`);
    if (edge.fallback !== null && !Array.isArray(edge.fallback)) errors.push(`${where}: fallback must be null or a list of edges`);
    for (const fb of edge.fallback ?? []) {
      if (!(EDGE_KINDS as readonly string[]).includes(fb.kind)) errors.push(`${where}: fallback ${edgeLabel(fb)} has unknown kind "${fb.kind}"`);
    }
  }

  for (const capability of graph.capabilityEdges) {
    if (!EPIC_ID.test(capability.from) || !EPIC_ID.test(capability.to)) errors.push(`capability edge ${edgeLabel(capability)}: epic ids look like CHECKMATE-NN`);
    if (typeof capability.source !== 'string' || capability.source.trim() === '') errors.push(`capability edge ${edgeLabel(capability)}: source is required`);
  }
  for (const dropped of graph.droppedCapabilityEdges) {
    if (!EPIC_ID.test(dropped.from) || !EPIC_ID.test(dropped.to)) errors.push(`dropped capability edge ${edgeLabel(dropped)}: epic ids look like CHECKMATE-NN`);
  }
  for (const decision of graph.openDecisions) {
    if (typeof decision.question !== 'string' || decision.question.trim() === '') {
      errors.push(`open decision on ${decision.edge ? edgeLabel(decision.edge) : '(no edge)'}: question is required`);
    }
  }
  return errors;
}

/** Test plan item 2: all leaves, no unknown id, one root, slice parents, no edge into a sliced leaf. */
export function checkInventory(graph: DependencyGraph, expectedLeaves: ReadonlyMap<string, number>): string[] {
  const errors: string[] = [];
  const index = indexGraph(graph);
  const leaves = graph.nodes.filter((node) => node.type === 'leaf');
  for (const [id, issue] of expectedLeaves) {
    const node = index.byId.get(id);
    if (!node || node.type !== 'leaf') errors.push(`missing leaf ${id} (#${issue})`);
    else if (node.issue !== issue) errors.push(`leaf ${id}: issue #${node.issue}, expected #${issue}`);
  }
  for (const leaf of leaves) if (!expectedLeaves.has(leaf.id)) errors.push(`unknown leaf ${leaf.id}`);
  if (leaves.length !== expectedLeaves.size) errors.push(`${leaves.length} leaves, expected ${expectedLeaves.size}`);

  const roots = graph.nodes.filter((node) => node.type === 'root');
  if (roots.length !== 1) errors.push(`${roots.length} root nodes, expected exactly one (${ROOT_ID})`);
  for (const gate of GATE_IDS) if (index.byId.get(gate)?.type !== 'gate') errors.push(`missing gate ${gate}`);

  for (const node of graph.nodes) {
    if (node.type !== 'slice') continue;
    const parent = node.parent === null ? undefined : index.byId.get(node.parent);
    if (!parent || parent.type !== 'leaf') {
      errors.push(`slice ${node.id}: parent ${node.parent ?? 'null'} is not a leaf`);
      continue;
    }
    if (node.issue !== parent.issue) errors.push(`slice ${node.id}: issue #${node.issue} differs from its leaf's #${parent.issue}`);
    if (node.approvedWave !== parent.approvedWave) {
      errors.push(`slice ${node.id}: approvedWave ${node.approvedWave} differs from its leaf's ${parent.approvedWave}`);
    }
  }

  const known = (id: string) => index.byId.has(id);
  for (const edge of graph.edges) {
    for (const end of [edge.from, edge.to]) if (!known(end)) errors.push(`edge ${edgeLabel(edge)}: unknown id ${end}`);
    if (index.isClosure(edge.to)) errors.push(`edge ${edgeLabel(edge)}: enters sliced leaf ${edge.to}; point it at a slice`);
    if (edge.to === ROOT_ID) errors.push(`edge ${edgeLabel(edge)}: enters the root`);
    for (const fb of edge.fallback ?? []) {
      for (const end of [fb.from, fb.to]) if (!known(end)) errors.push(`fallback ${edgeLabel(fb)} of ${edgeLabel(edge)}: unknown id ${end}`);
      if (index.isClosure(fb.to)) errors.push(`fallback ${edgeLabel(fb)} of ${edgeLabel(edge)}: enters sliced leaf ${fb.to}`);
    }
  }
  for (const decision of graph.openDecisions) {
    for (const end of [decision.edge?.from, decision.edge?.to]) {
      if (typeof end !== 'string' || !known(end)) errors.push(`open decision: unknown id ${String(end)}`);
    }
  }
  return errors;
}

/** Test plan item 1: no cycle in any mix of pending-owner edges and fallbacks. */
export function checkAcyclic(graph: DependencyGraph): string[] {
  const nodeIds = graph.nodes.map((node) => node.id);
  // Every reading is a subgraph of this union, so an acyclic union settles all of them at once.
  const union = [
    ...approvedArcs(graph),
    ...fallbackArcs(graph),
    ...graph.edges.filter((edge) => edge.status === 'pending-owner').map((edge) => arcOf(edge, 'pending-owner')),
  ];
  if (findCycle(nodeIds, union) === null) return [];
  let all: Reading[];
  try {
    all = readings(graph);
  } catch (error) {
    return [(error as Error).message];
  }
  const errors: string[] = [];
  for (const reading of all) {
    const cycle = findCycle(nodeIds, reading.arcs);
    if (cycle) errors.push(`cycle (${reading.label}): ${cycle.join(' → ')}`);
  }
  return errors;
}

/** Test plan item 3: every non-root node has a predecessor, and the kinds gate edges hold. */
export function checkPredecessorsAndGates(graph: DependencyGraph): string[] {
  const errors: string[] = [];
  const index = indexGraph(graph);
  const incoming = new Map<string, GraphEdge[]>();
  for (const edge of graph.edges) {
    const list = incoming.get(edge.to) ?? [];
    list.push(edge);
    incoming.set(edge.to, list);
  }
  for (const node of graph.nodes) {
    if (node.type === 'root') continue;
    if (index.isClosure(node.id)) {
      const sliceKinds = new Set((index.slicesOf.get(node.id) ?? []).flatMap((id) => index.byId.get(id)?.kinds ?? []));
      const expected = KINDS.filter((kind) => sliceKinds.has(kind));
      if (expected.join() !== node.kinds.join()) {
        errors.push(`leaf ${node.id}: kinds [${node.kinds.join(', ')}] must be its slices' union [${expected.join(', ')}]`);
      }
      if (Object.keys(node.gateExempt).length > 0) errors.push(`leaf ${node.id}: exemptions belong on its slices`);
      continue;
    }
    const preds = incoming.get(node.id) ?? [];
    if (preds.length === 0) errors.push(`node ${node.id} has no predecessor`);
    if (node.type !== 'leaf' && node.type !== 'slice') continue;
    const required = new Set<GateId>();
    for (const kind of node.kinds) {
      const gate = KIND_GATES[kind];
      if (gate) required.add(gate);
    }
    for (const gate of required) {
      const reason = node.gateExempt[gate];
      if (typeof reason === 'string' && reason.trim() !== '') continue;
      if (reason !== undefined) {
        errors.push(`node ${node.id}: exemption from ${gate} needs a reason`);
        continue;
      }
      const gateEdge = preds.find((edge) => edge.from === gate);
      if (!gateEdge) {
        const kinds = node.kinds.filter((kind) => KIND_GATES[kind] === gate).join(', ');
        errors.push(`node ${node.id} (${kinds}) needs edge ${gate} → ${node.id} or a gateExempt reason`);
      } else if (gateEdge.kind !== 'merge-before-start') {
        errors.push(`edge ${edgeLabel(gateEdge)}: a gate edge is merge-before-start`);
      }
    }
    for (const gate of Object.keys(node.gateExempt)) {
      if (isGateId(gate) && !required.has(gate)) errors.push(`node ${node.id}: exemption from ${gate} matches none of its kinds`);
    }
  }
  return errors;
}

/** #31: `22.1 · gate A` and `18.2 · gate 1` have plannedWave 0. */
export const WAVE_ZERO_IDS = ['CHECKMATE-22.1 · gate A', 'CHECKMATE-18.2 · gate 1'] as const;

/** Test plan item 4, waves: plannedWave never decreases, gate A and gate 1 are Wave 0, approved-wave edges follow filed waves. */
export function checkWaves(graph: DependencyGraph, waveZeroIds: readonly string[] = WAVE_ZERO_IDS): string[] {
  const errors: string[] = [];
  const index = indexGraph(graph);
  const wave = (id: string) => index.byId.get(id)?.plannedWave;
  const arcs: Arc[] = [...graph.edges.map((edge) => arcOf(edge, edge.source)), ...fallbackArcs(graph), ...closureArcs(graph)];
  for (const arc of arcs) {
    const from = wave(arc.from);
    const to = wave(arc.to);
    if (from === undefined || to === undefined) continue;
    if (from > to) errors.push(`plannedWave decreases along ${edgeLabel(arc)} (${arc.label}): ${from} → ${to}`);
  }
  for (const id of waveZeroIds) {
    const node = index.byId.get(id);
    if (!node) errors.push(`missing ${id}`);
    else if (node.plannedWave !== 0) errors.push(`${id}: plannedWave ${node.plannedWave}, expected 0`);
  }
  for (const node of graph.nodes) {
    if (!index.isClosure(node.id)) continue;
    const latest = Math.max(...(index.slicesOf.get(node.id) ?? []).map((id) => wave(id) ?? 0));
    if (node.plannedWave !== latest) errors.push(`leaf ${node.id}: plannedWave ${node.plannedWave} must be its latest slice's (${latest})`);
  }
  for (const edge of graph.edges) {
    if (edge.status !== 'approved-wave') continue;
    const from = index.byId.get(edge.from)?.approvedWave;
    const to = index.byId.get(edge.to)?.approvedWave;
    if (typeof from !== 'number' || typeof to !== 'number') {
      errors.push(`approved-wave edge ${edgeLabel(edge)}: both ends need a filed wave`);
    } else if (from > to) {
      errors.push(`approved-wave edge ${edgeLabel(edge)} breaks the filed waves: ${from} → ${to}`);
    }
  }
  return errors;
}

/** Test plan item 4, decisions: openDecisions equals the pending-owner edges, each with a fallback. */
export function checkOpenDecisions(graph: DependencyGraph): string[] {
  const errors: string[] = [];
  const pending = new Set(graph.edges.filter((edge) => edge.status === 'pending-owner').map(edgeKey));
  const decided = new Set<string>();
  for (const decision of graph.openDecisions) {
    if (!decision.edge) continue;
    const key = edgeKey(decision.edge);
    if (decided.has(key)) errors.push(`open decision on ${edgeLabel(decision.edge)} is listed twice`);
    decided.add(key);
    if (!pending.has(key)) errors.push(`open decision on ${edgeLabel(decision.edge)} has no pending-owner edge`);
  }
  for (const edge of graph.edges) {
    if (edge.status === 'pending-owner') {
      if (!decided.has(edgeKey(edge))) errors.push(`pending-owner edge ${edgeLabel(edge)} has no open decision`);
      if (!Array.isArray(edge.fallback) || edge.fallback.length === 0) errors.push(`pending-owner edge ${edgeLabel(edge)} needs a fallback`);
    } else if (edge.fallback !== null) {
      errors.push(`edge ${edgeLabel(edge)}: only pending-owner edges carry a fallback`);
    }
  }
  return errors;
}

/** Test plan item 5: each filed capability edge is realized by a leaf path or dropped with a reason. */
export function checkCapabilityEdges(graph: DependencyGraph): string[] {
  const errors: string[] = [];
  const filed = new Set(graph.capabilityEdges.map(edgeKey));
  const dropped = new Map(graph.droppedCapabilityEdges.map((entry) => [edgeKey(entry), entry]));
  for (const entry of graph.droppedCapabilityEdges) {
    if (!filed.has(edgeKey(entry))) errors.push(`dropped capability edge ${edgeLabel(entry)} is not a filed capability edge`);
    if (typeof entry.reason !== 'string' || entry.reason.trim() === '') errors.push(`dropped capability edge ${edgeLabel(entry)} needs a reason`);
  }
  for (const capability of graph.capabilityEdges) {
    const route = capabilityPath(graph, capability);
    const isDropped = dropped.has(edgeKey(capability));
    if (!route && !isDropped) errors.push(`capability edge ${edgeLabel(capability)} (${capability.source}) has no leaf path and is not dropped`);
    if (route && isDropped) errors.push(`dropped capability edge ${edgeLabel(capability)} is realized by ${route.join(' → ')}; remove it from droppedCapabilityEdges`);
  }
  return errors;
}

/** Test plan item 6: the golden edges exist with their status and source. */
export function checkGoldenEdges(graph: DependencyGraph, golden: readonly GoldenEdge[]): string[] {
  const errors: string[] = [];
  const byKey = new Map(graph.edges.map((edge) => [edgeKey(edge), edge]));
  for (const want of golden) {
    const edge = byKey.get(edgeKey(want));
    if (!edge) {
      errors.push(`missing golden edge ${edgeLabel(want)} (${want.sources.join(' or ')})`);
      continue;
    }
    if (!want.sources.includes(edge.source)) errors.push(`golden edge ${edgeLabel(want)}: source "${edge.source}", expected ${want.sources.map((s) => `"${s}"`).join(' or ')}`);
    const status = want.status ?? 'approved-refinement';
    if (edge.status !== status) errors.push(`golden edge ${edgeLabel(want)}: status ${edge.status}, expected ${status}`);
    if (want.kind && edge.kind !== want.kind) errors.push(`golden edge ${edgeLabel(want)}: kind ${edge.kind}, expected ${want.kind}`);
  }
  return errors;
}
