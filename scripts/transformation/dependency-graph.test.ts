/**
 * CHECKMATE-01.3 · graph (#31): docs/transformation/dependency-graph.json is
 * acyclic, complete and consistent with the approved waves (test plan items
 * 1 to 7). A failing check lists the offending node, edge or path.
 */
import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import {
  GRAPH_MD_PATH,
  ROOT_ID,
  approvedArcs,
  checkAcyclic,
  checkCapabilityEdges,
  checkGoldenEdges,
  checkInventory,
  checkOpenDecisions,
  checkPredecessorsAndGates,
  checkShape,
  checkWaves,
  findPath,
  loadGraph,
  type DependencyGraph,
  type EdgeKind,
  type GoldenEdge,
  type GraphEdge,
  type GraphNode,
  type Kind,
} from './graph';
import { renderDependencyGraph } from './graph-markdown';

const L = (n: string) => `CHECKMATE-${n}`;
const S = (n: string, slice: string) => `CHECKMATE-${n} · ${slice}`;
const ZERO_LEAVES = ['00.1', '00.2', '00.3', '00.4'].map(L);

/** The 71 leaves, CHECKMATE-00.1 (#25) to CHECKMATE-22.4 (#95), in issue order. */
const LEAVES_PER_EPIC = [4, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4];
const EXPECTED_LEAVES = new Map<string, number>();
LEAVES_PER_EPIC.forEach((count, epic) => {
  for (let m = 1; m <= count; m += 1) EXPECTED_LEAVES.set(L(`${String(epic).padStart(2, '0')}.${m}`), 25 + EXPECTED_LEAVES.size);
});

const IDR = '#1 Important delivery refinements';
const W0S = '#1 Wave 0 sequence';
const LEB = '#1 Leaf edges beyond the gates';
const MBM: EdgeKind = 'merge-before-merge';

const golden = (from: string, to: string, source: string, extra: Partial<GoldenEdge> = {}): GoldenEdge => ({ from, to, source, ...extra });

/**
 * #31 lists these under #1's Important delivery refinements, which states only
 * the gate edges. Each 19.1 edge cites the one place its text is: #1's Leaf
 * edges beyond the gates for `02.1 · slice C` and `19.2 · slice B`, #83 for
 * 00.4 and `19.2 · slice A`, and #31's own list for the other three 00 leaves.
 */
const GOLDEN_DELIVERY: GoldenEdge[] = [
  golden(S('22.1', 'gate A'), 'G0', IDR),
  golden(S('18.2', 'gate 1'), 'G1', IDR),
  golden(S('12.1', 'slice B'), S('18.2', 'gate 2'), IDR),
  golden(S('02.1', 'slice C'), S('19.1', 'slice 2'), LEB),
  ...['00.1', '00.2', '00.3'].map((n) => golden(L(n), S('19.1', 'slice 1'), '#31')),
  golden(L('00.4'), S('19.1', 'slice 1'), '#83'),
  golden(S('19.2', 'slice A'), S('19.1', 'slice 1'), '#83'),
  golden(S('19.2', 'slice B'), S('19.1', 'slice 1'), LEB),
];

/**
 * #1 Wave 0 sequence: steps 1 to 8 as one merge-before-merge chain, 00.3 slice A
 * first, 09.1 slice 0 after step 1 with 07.3 stub removal before it, and the
 * 19.3 upgrade note last before `v0.2.0`, which 21.1 starts from (#89).
 */
const STEP_2 = [S('18.2', 'gate 1'), S('00.3', 'slice B')];
const STEP_3 = ['slice A', 'slice B', 'slice C'].map((s) => S('00.4', s));
const GOLDEN_WAVE_0: GoldenEdge[] = [
  ...STEP_2.map((to) => golden(S('22.1', 'gate A'), to, W0S, { kind: MBM })),
  ...STEP_2.flatMap((from) => STEP_3.map((to) => golden(from, to, W0S, { kind: MBM }))),
  ...STEP_3.map((from) => golden(from, S('00.1', 'slice A'), W0S, { kind: MBM })),
  golden(L('00.1'), S('00.4', 'slice D'), W0S, { kind: MBM }),
  golden(S('00.4', 'slice D'), S('18.3', 'slice A'), W0S, { kind: MBM }),
  golden(S('18.3', 'slice A'), S('18.2', 'gate 1 workspace'), W0S, { kind: MBM }),
  golden(S('18.2', 'gate 1 workspace'), L('00.2'), W0S, { kind: MBM }),
  ...STEP_2.map((to) => golden(S('00.3', 'slice A'), to, W0S, { kind: MBM })),
  golden(L('00.2'), S('19.3', 'upgrade note'), W0S, { kind: MBM }),
  golden(S('22.1', 'gate A'), S('09.1', 'slice 0'), W0S, { kind: MBM }),
  golden(S('07.3', 'stub removal'), S('09.1', 'slice 0'), W0S, { kind: MBM }),
  golden(S('19.3', 'upgrade note'), S('21.1', 'tokens'), '#89', { kind: MBM }),
];

/** #1 Leaf edges beyond the gates, at slice level (the two 19.1 edges are above). */
const GOLDEN_LEAF_EDGES: GoldenEdge[] = (
  [
    [L('19.1'), L('22.3')],
    [L('22.3'), S('19.3', 'procedures')],
    [S('19.3', 'procedures'), S('22.4', 'staged release')],
    [L('18.3'), S('22.4', 'staged release')],
    [L('19.2'), S('22.4', 'staged release')],
    [L('09.1'), S('10.1', 'evidence')],
    [S('10.1', 'evidence'), S('09.3', 'sessions')],
    [L('10.1'), S('10.2', 'gate')],
    [L('11.1'), S('04.1', 'commands')],
    [L('11.1'), S('07.1', 'core')],
    [L('11.1'), S('09.2', 'dispatcher')],
    [S('09.2', 'outbox'), S('11.3', 'run')],
    [S('18.2', 'gate 1'), S('22.2', 'c1')],
    [S('05.2', 'slice 1'), S('03.3', 'progress')],
    [S('05.2', 'slice 1'), S('08.1', 'slice 0')],
    [L('21.3'), S('08.1', 'slice 0')],
    [L('04.1'), S('07.1', 'core')],
    [S('07.1', 'core'), S('09.1', 'SetStepState')],
    [S('13.3', 'install'), S('20.1', 'starter')],
    [S('10.3', 'issue'), S('20.2', 'first run')],
    [L('10.2'), S('15.3', 'participants')],
    [S('02.2', 'slice B'), S('10.3', 'issue')],
    [S('02.2', 'slice B'), S('13.1', 'contracts')],
    [S('02.2', 'slice B'), S('16.1', 'envelope')],
    [S('02.2', 'slice B'), S('18.3', 'slice B')],
  ] as const
).map(([from, to]) => golden(from, to, LEB));

/**
 * Edges #31 cites from leaf bodies, plus the adapter edge from its Graph nodes
 * contract. #31 cites #37 and #58 for the share edge; #58's `· share` slice
 * names the 03.3 target. #38 states `· adapter` before `· storage`.
 */
const GOLDEN_LEAF_BODIES: GoldenEdge[] = [
  golden(S('03.3', 'primitive'), S('10.3', 'share'), '#58'),
  golden(S('16.1', 'workflow'), S('13.1', 'contracts'), '#65'),
  golden(S('12.1', 'slice A'), S('10.3', 'issue'), '#58'),
  golden(S('12.1', 'slice B'), S('11.2', 'slice 2'), '#60'),
  golden(L('03.2'), S('15.3', 'participants'), '#73'),
  golden(L('08.1'), S('15.3', 'automations'), '#73'),
  golden(L('03.1'), S('17.1', 'workspace'), '#77'),
  ...ZERO_LEAVES.map((leaf) => golden(leaf, S('22.1', 'gate B'), '#92')),
  golden(S('01.1', 'adapter'), S('04.1', 'storage'), '#38', { kind: 'merge-before-start' }),
];

const GOLDEN = [...GOLDEN_DELIVERY, ...GOLDEN_WAVE_0, ...GOLDEN_LEAF_EDGES, ...GOLDEN_LEAF_BODIES];

const graph = loadGraph();
const predecessorsOf = (g: DependencyGraph, id: string) => g.edges.filter((edge) => edge.to === id).map((edge) => edge.from);

describe('dependency-graph.json', () => {
  it('has the contract fields, value sets and id formats', () => {
    expect(checkShape(graph)).toEqual([]);
  });

  it('1. has no cycle under any mix of pending-owner edges and fallbacks', () => {
    expect(checkAcyclic(graph)).toEqual([]);
  });

  it('1. rejects the literal "22.1 after containment" reading, which #92 resolves to gate B', () => {
    const literal = structuredClone(graph);
    for (const leaf of ZERO_LEAVES) {
      literal.edges.push({ from: leaf, to: S('22.1', 'gate A'), kind: MBM, status: 'approved-refinement', source: '#92', fallback: null });
    }
    const errors = checkAcyclic(literal);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/^cycle \(approved edges\): .*CHECKMATE-22\.1 · gate A/);
    expect(errors[0]).toMatch(/CHECKMATE-00\.\d → CHECKMATE-22\.1 · gate A$/);
  });

  it('2. holds all 71 leaves, one root, slices under leaves and no edge into a sliced leaf', () => {
    expect(EXPECTED_LEAVES.size).toBe(71);
    expect(checkInventory(graph, EXPECTED_LEAVES)).toEqual([]);
  });

  it('3. gives every non-root node a predecessor and holds the kinds gate edges', () => {
    expect(checkPredecessorsAndGates(graph)).toEqual([]);
  });

  it('4. never lowers plannedWave along an edge, starts gate A and gate 1 in Wave 0, and keeps filed waves', () => {
    expect(checkWaves(graph)).toEqual([]);
  });

  it('4. lists one open decision per pending-owner edge, each with a fallback', () => {
    expect(checkOpenDecisions(graph)).toEqual([]);
  });

  it('5. realizes each filed capability edge by a leaf path or drops it with a reason', () => {
    expect(graph.capabilityEdges).toHaveLength(60);
    expect(checkCapabilityEdges(graph)).toEqual([]);
  });

  it('6. has the golden edges with their status and source', () => {
    expect(checkGoldenEdges(graph, GOLDEN)).toEqual([]);
  });

  it('6. matches the committed dependency-graph.md', () => {
    const committed = fs.readFileSync(GRAPH_MD_PATH, 'utf8');
    expect(renderDependencyGraph(graph) === committed, 'dependency-graph.md is stale: run npx tsx scripts/transformation/render.ts').toBe(true);
  });
});

describe('#31 gate and Wave 0 contracts', () => {
  it('defines G0 to G3 by their #31 members', () => {
    const members = (gate: string) => predecessorsOf(graph, gate).sort();
    expect(members('G0')).toEqual([S('22.1', 'gate A')]);
    expect(members('G1')).toEqual([S('18.2', 'gate 1')]);
    expect(members('G2')).toEqual([S('01.1', 'contracts'), S('01.2', 'envelope'), S('01.2', 'matrix'), S('01.2', 'substrate')].sort());
    expect(members('G3')).toEqual([L('21.1')]);
  });

  it('keeps `01.1 · adapter` outside G2: no command waits for it through G2', () => {
    const route = findPath(approvedArcs(graph), [S('01.1', 'adapter')], (id) => id === 'G2');
    expect(route, route?.join(' → ')).toBeNull();
  });

  it('opens no slice of #38, #47, #59 or #62 before G2 merges, and no slice of #38 before `01.1 · adapter`', () => {
    const unheld: string[] = [];
    const holdsEverySlice = (from: string, leaf: string) => {
      const slices = graph.nodes.filter((node) => node.parent === leaf);
      if (slices.length === 0) unheld.push(`${leaf} has no slices`);
      for (const slice of slices) {
        const held = graph.edges.some((e) => e.from === from && e.to === slice.id && e.kind === 'merge-before-start');
        if (!held) unheld.push(`${from} → ${slice.id}`);
      }
    };
    for (const leaf of ['04.1', '07.1', '11.1', '12.1']) holdsEverySlice('G2', L(leaf));
    holdsEverySlice(S('01.1', 'adapter'), L('04.1'));
    expect(unheld, 'missing merge-before-start edges').toEqual([]);
  });

  it('merges `19.3 · upgrade note` last in Wave 0: every other Wave 0 node reaches it', () => {
    const last = S('19.3', 'upgrade note');
    const arcs = approvedArcs(graph);
    const waveZero = graph.nodes.filter((node) => node.plannedWave === 0 && node.id !== last);
    const unordered = waveZero.filter((node) => findPath(arcs, [node.id], (id) => id === last) === null).map((node) => node.id);
    expect(unordered, `Wave 0 nodes ${last} does not wait for`).toEqual([]);
  });

  it('ships Wave 0 step 2 as one PR: no edge or path between its two slices', () => {
    const [gate1, slice3b] = STEP_2 as [string, string];
    expect(findPath(approvedArcs(graph), [gate1], (id) => id === slice3b)).toBeNull();
    expect(findPath(approvedArcs(graph), [slice3b], (id) => id === gate1)).toBeNull();
  });

  it('enters step 4 at `00.1 · slice A`', () => {
    const stepEdgesInto00_1 = graph.edges.filter((edge) => edge.source === W0S && edge.to.startsWith(`${L('00.1')} · `));
    expect(new Set(stepEdgesInto00_1.map((edge) => edge.to))).toEqual(new Set([S('00.1', 'slice A')]));
  });
});

describe('PR template', () => {
  it('opens with the Implements line in #1\'s form, which #94\'s changelog groups by', () => {
    const template = fs.readFileSync(path.resolve(__dirname, '../../.github/pull_request_template.md'), 'utf8');
    expect(template.split('\n')[0]).toBe('Implements CHECKMATE-NN.M · <slice>');
    expect(template).not.toMatch(/^Implements:/m);
  });
});

// ---------------------------------------------------------------------------
// 7. A failing fixture for each check

const MBS: EdgeKind = 'merge-before-start';

function node(id: string, type: GraphNode['type'], parent: string | null, issue: number, approvedWave: number | null, plannedWave: number, kinds: Kind[]): GraphNode {
  return { id, type, parent, issue, approvedWave, plannedWave, kinds, gateExempt: {}, title: id };
}

function edge(from: string, to: string, kind: EdgeKind = MBM, source = '#1 Wave plan'): GraphEdge {
  return { from, to, kind, status: 'approved-refinement', source, fallback: null };
}

/** Three leaves across Waves 0 to 2 with one member per gate; it passes every check. */
function fixture(): DependencyGraph {
  return {
    graphVersion: 1,
    issue: 31,
    about: 'fixture',
    nodes: [
      node(ROOT_ID, 'root', null, 1, null, 0, []),
      node('G0', 'gate', null, 92, null, 0, []),
      node('G1', 'gate', null, 81, null, 0, []),
      node('G2', 'gate', null, 3, null, 1, []),
      node('G3', 'gate', null, 89, null, 2, []),
      node(L('00.1'), 'leaf', 'CHECKMATE-00', 25, 0, 0, ['backend', 'ci']),
      node(S('00.1', 'slice A'), 'slice', L('00.1'), 25, 0, 0, ['ci']),
      node(S('00.1', 'slice B'), 'slice', L('00.1'), 25, 0, 0, ['backend']),
      node(L('01.1'), 'leaf', 'CHECKMATE-01', 29, 1, 1, ['backend', 'contract']),
      node(L('02.1'), 'leaf', 'CHECKMATE-02', 32, 2, 2, ['schema-changing', 'command', 'ui']),
      node(S('02.1', 'slice A'), 'slice', L('02.1'), 32, 2, 2, ['command']),
      node(S('02.1', 'slice B'), 'slice', L('02.1'), 32, 2, 2, ['schema-changing', 'ui']),
    ],
    edges: [
      edge(ROOT_ID, S('00.1', 'slice A'), MBS),
      edge(S('00.1', 'slice A'), 'G0'),
      edge('G0', S('00.1', 'slice B'), MBS),
      edge(S('00.1', 'slice B'), 'G1'),
      edge('G0', L('01.1'), MBS),
      edge(L('00.1'), L('01.1'), MBM, '#29'),
      edge(L('01.1'), 'G2'),
      edge('G2', S('02.1', 'slice A'), MBS),
      edge(S('02.1', 'slice A'), 'G3'),
      edge('G1', S('02.1', 'slice B'), MBS),
      edge('G3', S('02.1', 'slice B'), MBS),
      edge(S('02.1', 'slice A'), S('02.1', 'slice B')),
    ],
    capabilityEdges: [
      { from: 'CHECKMATE-00', to: 'CHECKMATE-01', source: 'filed #3 Dependencies' },
      { from: 'CHECKMATE-01', to: 'CHECKMATE-02', source: 'filed #4 Dependencies' },
    ],
    droppedCapabilityEdges: [],
    openDecisions: [],
  };
}

const FIXTURE_LEAVES = new Map([[L('00.1'), 25], [L('01.1'), 29], [L('02.1'), 32]]);
const FIXTURE_GOLDEN = [golden(L('00.1'), L('01.1'), '#29')];
const FIXTURE_WAVE_ZERO = [S('00.1', 'slice A')];

function mutate(change: (g: DependencyGraph) => void): DependencyGraph {
  const g = fixture();
  change(g);
  return g;
}

function findNode(g: DependencyGraph, id: string): GraphNode {
  const found = g.nodes.find((n) => n.id === id);
  if (!found) throw new Error(`fixture has no node ${id}`);
  return found;
}

function findEdge(g: DependencyGraph, from: string, to: string): GraphEdge {
  const found = g.edges.find((e) => e.from === from && e.to === to);
  if (!found) throw new Error(`fixture has no edge ${from} → ${to}`);
  return found;
}

function dropEdge(g: DependencyGraph, from: string, to: string): void {
  g.edges = g.edges.filter((e) => !(e.from === from && e.to === to));
}

describe('7. failing fixtures', () => {
  it('the base fixture passes every check', () => {
    const g = fixture();
    expect([
      ...checkShape(g),
      ...checkAcyclic(g),
      ...checkInventory(g, FIXTURE_LEAVES),
      ...checkPredecessorsAndGates(g),
      ...checkWaves(g, FIXTURE_WAVE_ZERO),
      ...checkOpenDecisions(g),
      ...checkCapabilityEdges(g),
      ...checkGoldenEdges(g, FIXTURE_GOLDEN),
    ]).toEqual([]);
  });

  describe('shape', () => {
    it('rejects an unknown kind, an uncitable source and an unknown key', () => {
      const g = mutate((f) => {
        findNode(f, S('02.1', 'slice A')).kinds = ['frontend' as Kind];
        findEdge(f, L('00.1'), L('01.1')).source = 'issue 29';
        (findEdge(f, 'G0', L('01.1')) as GraphEdge & { weight?: number }).weight = 1;
      });
      const errors = checkShape(g);
      expect(errors).toContain('node CHECKMATE-02.1 · slice A: unknown kind "frontend"');
      expect(errors).toContain('edge CHECKMATE-00.1 → CHECKMATE-01.1: source "issue 29" must be "#N" or "#1 <section>"');
      expect(errors).toContain('edge G0 → CHECKMATE-01.1: unknown key "weight"');
    });

    it('rejects a capability edge from an epic to itself, which any one of its nodes would realize', () => {
      const g = mutate((f) => {
        f.capabilityEdges.push({ from: 'CHECKMATE-01', to: 'CHECKMATE-01', source: 'filed #3 Dependencies' });
        f.droppedCapabilityEdges.push({ from: 'CHECKMATE-02', to: 'CHECKMATE-02', reason: 'stale' });
      });
      const errors = checkShape(g);
      expect(errors).toContain('capability edge CHECKMATE-01 → CHECKMATE-01: self-loop');
      expect(errors).toContain('dropped capability edge CHECKMATE-02 → CHECKMATE-02: self-loop');
    });
  });

  describe('1. acyclic', () => {
    it('prints the path of a cycle through approved edges', () => {
      const g = mutate((f) => f.edges.push(edge(S('02.1', 'slice B'), S('00.1', 'slice B'))));
      expect(checkAcyclic(g)).toEqual([
        expect.stringMatching(/^cycle \(approved edges\): .*CHECKMATE-02\.1 · slice B → CHECKMATE-00\.1 · slice B/),
      ]);
    });

    it('finds a cycle that only a pending-owner fallback closes, and names the reading', () => {
      const g = mutate((f) => {
        f.edges.push({
          ...edge(S('00.1', 'slice A'), S('02.1', 'slice A')),
          status: 'pending-owner',
          fallback: [{ from: S('02.1', 'slice A'), to: S('00.1', 'slice B'), kind: MBM }],
        });
        f.openDecisions.push({ edge: { from: S('00.1', 'slice A'), to: S('02.1', 'slice A') }, question: 'Order?' });
      });
      const errors = checkAcyclic(g);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatch(/^cycle \(CHECKMATE-00\.1 · slice A → CHECKMATE-02\.1 · slice A on fallback\): /);
      expect(errors[0]).toMatch(/CHECKMATE-02\.1 · slice A → CHECKMATE-00\.1 · slice B/);
    });
  });

  describe('2. inventory', () => {
    it('reports a missing leaf', () => {
      const g = mutate((f) => {
        f.nodes = f.nodes.filter((n) => n.id !== L('01.1'));
        f.edges = f.edges.filter((e) => e.from !== L('01.1') && e.to !== L('01.1'));
      });
      expect(checkInventory(g, FIXTURE_LEAVES)).toContain('missing leaf CHECKMATE-01.1 (#29)');
    });

    it('reports an unknown id', () => {
      const g = mutate((f) => f.edges.push(edge('G0', 'CHECKMATE-99.9', MBS)));
      expect(checkInventory(g, FIXTURE_LEAVES)).toContain('edge G0 → CHECKMATE-99.9: unknown id CHECKMATE-99.9');
    });

    it('reports a second root', () => {
      const g = mutate((f) => f.nodes.push(node('TRACKER · Pre-1', 'root', null, 1, null, 0, [])));
      expect(checkInventory(g, FIXTURE_LEAVES)).toContain(`2 root nodes, expected exactly one (${ROOT_ID})`);
    });

    it('reports a slice whose parent is not a leaf', () => {
      const g = mutate((f) => {
        findNode(f, S('02.1', 'slice A')).parent = 'G2';
      });
      expect(checkInventory(g, FIXTURE_LEAVES)).toContain('slice CHECKMATE-02.1 · slice A: parent G2 is not a leaf');
    });

    it('reports an edge into a sliced leaf', () => {
      const g = mutate((f) => f.edges.push(edge('G1', L('02.1'), MBS)));
      expect(checkInventory(g, FIXTURE_LEAVES)).toContain(
        'edge G1 → CHECKMATE-02.1: enters sliced leaf CHECKMATE-02.1; point it at a slice',
      );
    });
  });

  describe('3. predecessors and gates', () => {
    it('reports a node with no predecessor', () => {
      const g = mutate((f) => dropEdge(f, ROOT_ID, S('00.1', 'slice A')));
      expect(checkPredecessorsAndGates(g)).toContain('node CHECKMATE-00.1 · slice A has no predecessor');
    });

    it('reports a ui slice with no G3 edge', () => {
      const g = mutate((f) => dropEdge(f, 'G3', S('02.1', 'slice B')));
      expect(checkPredecessorsAndGates(g)).toContain(
        'node CHECKMATE-02.1 · slice B (ui) needs edge G3 → CHECKMATE-02.1 · slice B or a gateExempt reason',
      );
    });

    it('rejects an exemption without a reason, and a gate edge that is not merge-before-start', () => {
      const g = mutate((f) => {
        dropEdge(f, 'G3', S('02.1', 'slice B'));
        findNode(f, S('02.1', 'slice B')).gateExempt = { G3: ' ' };
        findEdge(f, 'G2', S('02.1', 'slice A')).kind = MBM;
      });
      const errors = checkPredecessorsAndGates(g);
      expect(errors).toContain('node CHECKMATE-02.1 · slice B: exemption from G3 needs a reason');
      expect(errors).toContain('edge G2 → CHECKMATE-02.1 · slice A: a gate edge is merge-before-start');
    });
  });

  describe('4. waves and decisions', () => {
    it('reports plannedWave decreasing along an edge', () => {
      const g = mutate((f) => {
        findNode(f, S('02.1', 'slice B')).plannedWave = 1;
      });
      expect(checkWaves(g, FIXTURE_WAVE_ZERO)).toContain(
        'plannedWave decreases along G3 → CHECKMATE-02.1 · slice B (#1 Wave plan): 2 → 1',
      );
    });

    it('reports a Wave 0 gate planned later', () => {
      const g = mutate((f) => {
        findNode(f, S('00.1', 'slice A')).plannedWave = 1;
      });
      expect(checkWaves(g, FIXTURE_WAVE_ZERO)).toContain('CHECKMATE-00.1 · slice A: plannedWave 1, expected 0');
    });

    it('reports an approved-wave edge that breaks the filed waves', () => {
      const g = mutate((f) => {
        findNode(f, L('01.1')).approvedWave = 3;
        f.edges.push({ ...edge(L('01.1'), S('02.1', 'slice A')), status: 'approved-wave' });
      });
      expect(checkWaves(g, FIXTURE_WAVE_ZERO)).toContain(
        'approved-wave edge CHECKMATE-01.1 → CHECKMATE-02.1 · slice A breaks the filed waves: 3 → 2',
      );
    });

    it('reports a pending-owner edge with no open decision and no fallback', () => {
      const g = mutate((f) => f.edges.push({ ...edge(L('01.1'), S('02.1', 'slice B')), status: 'pending-owner' }));
      const errors = checkOpenDecisions(g);
      expect(errors).toContain('pending-owner edge CHECKMATE-01.1 → CHECKMATE-02.1 · slice B has no open decision');
      expect(errors).toContain('pending-owner edge CHECKMATE-01.1 → CHECKMATE-02.1 · slice B needs a fallback');
    });

    it('reports an open decision with no pending-owner edge', () => {
      const g = mutate((f) => f.openDecisions.push({ edge: { from: L('00.1'), to: L('01.1') }, question: 'Keep?' }));
      expect(checkOpenDecisions(g)).toContain('open decision on CHECKMATE-00.1 → CHECKMATE-01.1 has no pending-owner edge');
    });
  });

  describe('5. capability edges', () => {
    it('reports a filed capability edge with no leaf path', () => {
      const g = mutate((f) => f.capabilityEdges.push({ from: 'CHECKMATE-02', to: 'CHECKMATE-00', source: 'filed #2 Dependencies' }));
      expect(checkCapabilityEdges(g)).toEqual([
        'capability edge CHECKMATE-02 → CHECKMATE-00 (filed #2 Dependencies) has no leaf path and is not dropped',
      ]);
    });

    it('needs a reason to drop one, and refuses to drop one that is realized', () => {
      const g = mutate((f) => {
        f.capabilityEdges.push({ from: 'CHECKMATE-02', to: 'CHECKMATE-00', source: 'filed #2 Dependencies' });
        f.droppedCapabilityEdges.push({ from: 'CHECKMATE-02', to: 'CHECKMATE-00', reason: '' });
        f.droppedCapabilityEdges.push({ from: 'CHECKMATE-00', to: 'CHECKMATE-01', reason: 'stale' });
      });
      const errors = checkCapabilityEdges(g);
      expect(errors).toContain('dropped capability edge CHECKMATE-02 → CHECKMATE-00 needs a reason');
      expect(errors).toContain(
        'dropped capability edge CHECKMATE-00 → CHECKMATE-01 is realized by CHECKMATE-00.1 → CHECKMATE-01.1; remove it from droppedCapabilityEdges',
      );
    });
  });

  describe('6. golden edges and Markdown', () => {
    it('reports a missing golden edge, a wrong source and a wrong status', () => {
      expect(checkGoldenEdges(mutate((f) => dropEdge(f, L('00.1'), L('01.1'))), FIXTURE_GOLDEN)).toEqual([
        'missing golden edge CHECKMATE-00.1 → CHECKMATE-01.1 (#29)',
      ]);
      const wrong = mutate((f) => {
        const e = findEdge(f, L('00.1'), L('01.1'));
        e.source = '#30';
        e.status = 'approved-wave';
      });
      expect(checkGoldenEdges(wrong, FIXTURE_GOLDEN)).toEqual([
        'golden edge CHECKMATE-00.1 → CHECKMATE-01.1: source "#30", expected "#29"',
        'golden edge CHECKMATE-00.1 → CHECKMATE-01.1: status approved-wave, expected approved-refinement',
      ]);
    });

    it('detects a Markdown file that no longer matches its JSON', () => {
      const changed = structuredClone(graph);
      const target = changed.nodes.find((n) => n.id === S('01.3', 'graph')) as GraphNode;
      target.title = `${target.title} (edited)`;
      expect(renderDependencyGraph(changed)).not.toBe(fs.readFileSync(GRAPH_MD_PATH, 'utf8'));
    });

    it('keeps every table row to its header\'s columns when text holds pipes, line breaks or backticks', () => {
      const odd = S('02.1', 'odd `|` name');
      const g = mutate((f) => {
        findNode(f, S('02.1', 'slice A')).title = 'a | b\nc';
        findNode(f, S('02.1', 'slice B')).note = 'x|y\r\nz';
        findEdge(f, L('00.1'), L('01.1')).note = 'p | q';
        f.capabilityEdges = f.capabilityEdges.map((capability) => ({ ...capability, source: `${capability.source} | x` }));
        f.nodes.push(node(odd, 'slice', L('02.1'), 32, 2, 2, []));
        f.edges.push(edge(S('02.1', 'slice B'), odd, MBM, '#32'));
      });
      const markdown = renderDependencyGraph(g);
      const columns = (line: string) => line.split(/(?<!\\)\|/).length;
      const broken: string[] = [];
      let width: number | null = null;
      for (const line of markdown.split('\n')) {
        if (!line.startsWith('|')) {
          width = null;
          continue;
        }
        width ??= columns(line);
        if (columns(line) !== width) broken.push(line);
      }
      expect(broken).toEqual([]);
      expect(markdown).toContain('``02.1 · odd `\\|` name``');
    });
  });
});
