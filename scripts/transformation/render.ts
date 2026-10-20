/**
 * Writes the ordered, tabular forms of the transformation files (#31) and the
 * 01.1 glossary (#29).
 *
 *   npx tsx scripts/transformation/render.ts           writes every target
 *   npx tsx scripts/transformation/render.ts --check   exits 1 when a target is stale
 *
 * This file is only the command line, so it runs however it is invoked (with
 * or without `.ts`, from any directory). The renderers live in modules such as
 * graph-markdown.ts; tests import those, never this file.
 */
import fs from 'fs';
import path from 'path';
import { GLOSSARY_FILE, renderGlossary } from '../../src/lib/domain/glossary-markdown';
import { GRAPH_JSON_PATH, GRAPH_MD_PATH, loadGraph } from './graph';
import { renderDependencyGraph } from './graph-markdown';

interface RenderTarget {
  output: string;
  render(): string;
}

/** Each committed Markdown file and the renderer that produces it. */
const RENDER_TARGETS: RenderTarget[] = [
  { output: GRAPH_MD_PATH, render: () => renderDependencyGraph(loadGraph(GRAPH_JSON_PATH)) },
  { output: path.resolve(__dirname, '../..', GLOSSARY_FILE), render: renderGlossary },
];

function main(args: string[]): number {
  const unknown = args.filter((arg) => arg !== '--check');
  if (unknown.length > 0) {
    console.error(`unknown argument ${unknown.join(' ')}; usage: npx tsx scripts/transformation/render.ts [--check]`);
    return 2;
  }
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
      } else {
        console.log(`${relative} is up to date`);
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

process.exitCode = main(process.argv.slice(2));
