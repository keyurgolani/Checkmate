#!/usr/bin/env node
/**
 * Test 11 of #83 on the built app: nothing a browser receives may load a
 * font from a third party, and every vendored family must still load from
 * this origin.
 *
 *   node scripts/fonts/check-font-hosts.mjs [--next-dir .next]
 *
 * Run it after `next build`; CI's build job does. It reads what browsers
 * get: .next/static (client JS, CSS and media), the pages prerendered under
 * .next/server, and public/. It fails on
 * - a third-party font host (FONT_HOSTS) or an absolute URL to a font file,
 * - a stylesheet url() or @import, or a page's stylesheet or font link,
 *   that leaves the origin, and
 * - a family in scripts/fonts/manifest.json that has no @font-face in the
 *   built CSS and whose stylesheet the client JS never links.
 */

import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { REPO_ROOT, readManifest } from './fetch-fonts.mjs';

/** Hosts and paths that serve web fonts or font stylesheets. */
export const FONT_HOSTS = [
  /fonts\.googleapis\.(?:com|cn)/i,
  /fonts\.gstatic\.(?:com|cn)/i,
  /(?:use|p)\.typekit\.net/i,
  /fonts\.bunny\.net/i,
  /fonts\.cdnfonts\.com/i,
  /(?:api|cdn)\.fontshare\.com/i,
  /fast\.fonts\.net/i,
  /cloud\.typography\.com/i,
  /(?:use|kit)\.fontawesome\.com/i,
  /fonts\.loli\.net/i,
  /rsms\.me\/inter/i,
  /cdn\.jsdelivr\.net\/(?:npm\/@fontsource|fontsource)/i,
  /unpkg\.com\/@fontsource/i,
];

/** An absolute or protocol-relative URL to a font file, on any host. */
const FONT_FILE_URL = /(?:https?:)?\/\/[\w.-]+(?::\d+)?\/[^\s"'`()<>]*\.(?:woff2?|ttf|otf|eot)(?=[?#"'`)\s]|$)/gi;
const OFF_ORIGIN = /^(?:[a-z][a-z\d+.-]*:)?\/\//i;
const BINARY = new Set(['.woff2', '.woff', '.ttf', '.otf', '.eot', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.ico', '.body', '.map']);

/**
 * Font hosts and absolute font file URLs in a text.
 * @param {string} text
 * @returns {string[]}
 */
export function findFontHosts(text) {
  const found = [];
  for (const host of FONT_HOSTS) {
    const match = host.exec(text);
    if (match) found.push(match[0]);
  }
  for (const match of text.matchAll(FONT_FILE_URL)) found.push(match[0]);
  return [...new Set(found)];
}

/**
 * Every url() and @import target in a stylesheet.
 * @param {string} css
 * @returns {string[]}
 */
export function stylesheetUrls(css) {
  const urls = [];
  for (const match of css.matchAll(/url\(\s*(['"]?)([^'")]*)\1\s*\)/gi)) urls.push(match[2].trim());
  for (const match of css.matchAll(/@import\s+(['"])([^'"]+)\1/gi)) urls.push(match[2].trim());
  return urls;
}

/** The url() and @import targets of a stylesheet that leave the origin. */
export function offOriginUrls(css) {
  return stylesheetUrls(css).filter((url) => OFF_ORIGIN.test(url));
}

/**
 * The hrefs of a page's stylesheet links, and of font and style preloads,
 * that leave the origin.
 * @param {string} html
 * @returns {string[]}
 */
export function offOriginLinks(html) {
  const found = [];
  for (const [tag] of html.matchAll(/<link\b[^>]*>/gi)) {
    const attribute = (name) => {
      const match = new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(tag);
      return (match?.[1] ?? match?.[2] ?? match?.[3] ?? '').trim();
    };
    const loadsStyleOrFont = /\bstylesheet\b/i.test(attribute('rel')) || /^(?:font|style)$/i.test(attribute('as'));
    if (loadsStyleOrFont && OFF_ORIGIN.test(attribute('href'))) found.push(attribute('href'));
  }
  return found;
}

/**
 * Family names, lowercased, of the @font-face rules in a stylesheet whose
 * sources are all on the origin. CSS matches family names without case.
 * @param {string} css
 * @returns {Set<string>}
 */
export function localFontFaces(css) {
  const families = new Set();
  for (const match of css.matchAll(/@font-face\s*\{([^}]*)\}/gi)) {
    const family = /font-family\s*:\s*([^;]+)/i.exec(match[1])?.[1].trim().replace(/^(['"])(.*)\1$/, '$2');
    const sources = stylesheetUrls(match[1]);
    if (family && sources.length > 0 && sources.every((url) => !OFF_ORIGIN.test(url))) families.add(family.toLowerCase());
  }
  return families;
}

function walk(dir, keep = () => true) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .map((entry) => path.join(dir, entry))
    .filter((file) => fs.statSync(file).isFile() && keep(file))
    .sort();
}

const isText = (file) => !BINARY.has(path.extname(file).toLowerCase());

/** The built and public files browsers receive, as paths. */
export function browserFiles({ root = REPO_ROOT, nextDir = '.next' } = {}) {
  const next = path.resolve(root, nextDir);
  const prerendered = (file) => /\.(?:html|rsc|meta)$/.test(file);
  return {
    client: walk(path.join(next, 'static'), isText),
    pages: [...walk(path.join(next, 'server/app'), prerendered), ...walk(path.join(next, 'server/pages'), prerendered)],
    public: walk(path.join(root, 'public'), isText),
  };
}

/**
 * @param {{ root?: string, nextDir?: string, manifest?: any }} [options]
 * @returns {{ problems: string[], scanned: number, viaBuiltCss: string[], viaStylesheet: string[] }}
 */
export function checkFontHosts({ root = REPO_ROOT, nextDir = '.next', manifest = readManifest(root) } = {}) {
  const problems = [];
  const files = browserFiles({ root, nextDir });
  const all = [...files.client, ...files.pages, ...files.public];
  if (files.client.length === 0) problems.push(`${path.join(nextDir, 'static')} has no files; run next build first`);

  const client = new Set(files.client);
  const builtFaces = new Set();
  let clientJs = '';
  for (const file of all) {
    const text = fs.readFileSync(file, 'utf8');
    const name = path.relative(root, file);
    for (const host of findFontHosts(text)) problems.push(`${name} references ${host}`);
    if (file.endsWith('.css')) {
      for (const url of offOriginUrls(text)) problems.push(`${name} loads ${url} from another origin`);
      if (client.has(file)) for (const family of localFontFaces(text)) builtFaces.add(family);
    }
    if (file.endsWith('.html')) for (const href of offOriginLinks(text)) problems.push(`${name} links ${href} from another origin`);
    if (file.endsWith('.js') && client.has(file)) clientJs += text;
  }

  const viaBuiltCss = [];
  const viaStylesheet = [];
  for (const family of manifest.families) {
    const href = `/${path.posix.relative('public', family.stylesheet)}`;
    if (builtFaces.has(family.family.toLowerCase())) viaBuiltCss.push(family.id);
    else if (clientJs.includes(href)) viaStylesheet.push(family.id);
    else problems.push(`${family.family} (${family.id}) has no @font-face in the built CSS, and no client code links ${href}`);
  }
  return { problems, scanned: all.length, viaBuiltCss, viaStylesheet };
}

function main() {
  const { values } = parseArgs({ options: { 'next-dir': { type: 'string', default: '.next' } } });
  const result = checkFontHosts({ nextDir: values['next-dir'] });
  if (result.problems.length > 0) {
    for (const problem of result.problems) console.error(`check-font-hosts: ${problem}`);
    console.error(`check-font-hosts: FAIL, ${result.problems.length} problem(s) in ${result.scanned} file(s).`);
    process.exitCode = 1;
    return;
  }
  console.log(
    `check-font-hosts: ${result.scanned} file(s), no third-party font host. ` +
      `${result.viaBuiltCss.length} families load from the built CSS (${result.viaBuiltCss.join(', ')}), ` +
      `${result.viaStylesheet.length} from their stylesheet under /fonts.`,
  );
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) main();
