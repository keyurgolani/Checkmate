#!/usr/bin/env node
/**
 * Vendors the Theme Studio web fonts (src/lib/themes/font-themes.ts), so no
 * page and no build loads a font from a third party.
 *
 *   node scripts/fonts/fetch-fonts.mjs           fetch every family below, rewrite
 *                                                public/fonts/<id>/ and the manifest
 *   node scripts/fonts/fetch-fonts.mjs --verify  download every file the manifest names
 *                                                again and check it against the manifest
 *                                                and the committed copy
 *
 * Each public/fonts/<id>/ holds the family's latin-subset woff2 files, one
 * @font-face stylesheet (<id>.css) and the family's license file. The woff2
 * files are the ones the Google Fonts css2 API serves for the query below,
 * and the license is the family's file in google/fonts at GOOGLE_FONTS_COMMIT,
 * the upstream project's license as Google Fonts distributes it. The manifest
 * records every file's source URL and SHA-256, and the upstream repository.
 *
 * Builds never run this script: the committed files are the artifact, and
 * scripts/fonts/fonts.test.ts checks them against the manifest offline.
 */

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const MANIFEST_PATH = 'scripts/fonts/manifest.json';
export const FONTS_DIR = 'public/fonts';

const CSS_API = 'https://fonts.googleapis.com/css2';
const GOOGLE_FONTS_REPO = 'https://raw.githubusercontent.com/google/fonts';
/** google/fonts main on 2026-10-16. Licenses and upstream metadata come from this commit. */
export const GOOGLE_FONTS_COMMIT = '47d54ca1ebb14fd864695f1d39dc734f39017c33';
/** The user agent next/font/google sends, so the css2 API serves the same woff2 files. */
export const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36';
const SUBSET = 'latin';

/**
 * Every web font in font-themes.ts (all entries but `system`). `query` is
 * the css2 `family` value: for the four that src/app/layout.tsx loads, the
 * weight axis range next/font/google requested, and for the others the
 * query their stylesheet link used before they were vendored. `license` is
 * the license file's path in google/fonts.
 */
export const FAMILIES = [
  { id: 'inter', query: 'Inter:wght@100..900', license: 'ofl/inter/OFL.txt' },
  { id: 'plusJakarta', query: 'Plus+Jakarta+Sans:wght@200..800', license: 'ofl/plusjakartasans/OFL.txt' },
  { id: 'outfit', query: 'Outfit:wght@100..900', license: 'ofl/outfit/OFL.txt' },
  { id: 'manrope', query: 'Manrope:wght@200..800', license: 'ofl/manrope/OFL.txt' },
  { id: 'poppins', query: 'Poppins:wght@300;400;500;600;700', license: 'ofl/poppins/OFL.txt' },
  { id: 'montserrat', query: 'Montserrat:wght@300;400;500;600;700', license: 'ofl/montserrat/OFL.txt' },
  { id: 'lato', query: 'Lato:wght@300;400;700', license: 'ofl/lato/OFL.txt' },
  { id: 'openSans', query: 'Open+Sans:wght@300;400;500;600;700', license: 'ofl/opensans/OFL.txt' },
  { id: 'raleway', query: 'Raleway:wght@300;400;500;600;700', license: 'ofl/raleway/OFL.txt' },
  { id: 'nunito', query: 'Nunito:wght@300;400;500;600;700', license: 'ofl/nunito/OFL.txt' },
  { id: 'sourceSans', query: 'Source+Sans+3:wght@300;400;500;600;700', license: 'ofl/sourcesans3/OFL.txt' },
  { id: 'quicksand', query: 'Quicksand:wght@300;400;500;600;700', license: 'ofl/quicksand/OFL.txt' },
  { id: 'comfortaa', query: 'Comfortaa:wght@300;400;500;600;700', license: 'ofl/comfortaa/OFL.txt' },
  { id: 'fredoka', query: 'Fredoka:wght@300;400;500;600;700', license: 'ofl/fredoka/OFL.txt' },
  { id: 'baloo2', query: 'Baloo+2:wght@400;500;600;700', license: 'ofl/baloo2/OFL.txt' },
  { id: 'righteous', query: 'Righteous', license: 'ofl/righteous/OFL.txt' },
  { id: 'oswald', query: 'Oswald:wght@300;400;500;600;700', license: 'ofl/oswald/OFL.txt' },
  { id: 'orbitron', query: 'Orbitron:wght@400;500;600;700', license: 'ofl/orbitron/OFL.txt' },
  { id: 'exo2', query: 'Exo+2:wght@300;400;500;600;700', license: 'ofl/exo2/OFL.txt' },
  { id: 'spaceGrotesk', query: 'Space+Grotesk:wght@300;400;500;600;700', license: 'ofl/spacegrotesk/OFL.txt' },
  { id: 'spaceMono', query: 'Space+Mono:wght@400;700', license: 'ofl/spacemono/OFL.txt' },
  { id: 'workSans', query: 'Work+Sans:wght@300;400;500;600;700', license: 'ofl/worksans/OFL.txt' },
  { id: 'archivo', query: 'Archivo:wght@300;400;500;600;700', license: 'ofl/archivo/OFL.txt' },
  { id: 'firaCode', query: 'Fira+Code:wght@300;400;500;600;700', license: 'ofl/firacode/OFL.txt' },
  { id: 'jetBrainsMono', query: 'JetBrains+Mono:wght@300;400;500;600;700', license: 'ofl/jetbrainsmono/OFL.txt' },
  { id: 'ibmPlexMono', query: 'IBM+Plex+Mono:wght@300;400;500;600;700', license: 'ofl/ibmplexmono/OFL.txt' },
  { id: 'robotoMono', query: 'Roboto+Mono:wght@300;400;500;600;700', license: 'ofl/robotomono/OFL.txt' },
];

const LICENSES = {
  ofl: { spdx: 'OFL-1.1', name: 'SIL Open Font License 1.1' },
  apache: { spdx: 'Apache-2.0', name: 'Apache License 2.0' },
};

export function cssUrl(query) {
  return `${CSS_API}?family=${query}&display=swap`;
}

export function licenseUrl(licensePath, commit = GOOGLE_FONTS_COMMIT) {
  return `${GOOGLE_FONTS_REPO}/${commit}/${licensePath}`;
}

export function licenseInfo(licensePath) {
  const info = LICENSES[licensePath.split('/')[0]];
  if (!info) throw new Error(`fetch-fonts: unknown license directory in ${licensePath}`);
  return info;
}

export function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

/**
 * The @font-face blocks of a css2 response that follow a `/* <subset> *\/`
 * comment, with their descriptors.
 * @param {string} css
 * @param {string} subset
 */
export function parseFaces(css, subset = SUBSET) {
  const faces = [];
  for (const match of css.matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*@font-face\s*\{([^}]*)\}/g)) {
    if (match[1] !== subset) continue;
    const descriptors = {};
    for (const declaration of match[2].split(';')) {
      const colon = declaration.indexOf(':');
      if (colon === -1) continue;
      descriptors[declaration.slice(0, colon).trim()] = declaration.slice(colon + 1).trim();
    }
    const src = /^url\((https:\/\/[^)\s]+)\)\s*format\('woff2'\)$/.exec(descriptors.src ?? '');
    if (!src) throw new Error(`fetch-fonts: expected one woff2 url in "${descriptors.src}"`);
    faces.push({
      family: (descriptors['font-family'] ?? '').replace(/^'(.*)'$/, '$1'),
      style: descriptors['font-style'],
      weight: descriptors['font-weight'],
      display: descriptors['font-display'],
      unicodeRange: descriptors['unicode-range'],
      url: src[1],
    });
  }
  return faces;
}

/**
 * File names for each face's url: one file per static weight, and one
 * `wght` file for a variable font, which css2 serves under a weight range
 * or under one url for every weight asked for.
 */
export function fileNames(id, faces) {
  const facesByUrl = Map.groupBy(faces, (face) => face.url);
  const names = new Map();
  for (const [url, shared] of facesByUrl) {
    const [first] = shared;
    const variable = shared.length > 1 || /\s/.test(first.weight);
    names.set(url, `${id}-${SUBSET}-${variable ? 'wght' : first.weight}-${first.style}.woff2`);
  }
  if (new Set(names.values()).size !== names.size) throw new Error(`fetch-fonts: ${id} has two files with one name`);
  return names;
}

/** The stylesheet for one manifest family. The test renders it again and compares. */
export function renderStylesheet(family) {
  const license = path.posix.basename(family.license.file);
  const lines = [
    '/*',
    ` * ${family.family}, ${SUBSET} subset, vendored from Google Fonts by scripts/fonts/fetch-fonts.mjs.`,
    ` * License: ${license} (${family.license.name}). Sources and SHA-256: ${MANIFEST_PATH}.`,
    ' */',
  ];
  for (const face of family.faces) {
    lines.push(
      '@font-face {',
      `  font-family: '${family.family}';`,
      `  font-style: ${face.style};`,
      `  font-weight: ${face.weight};`,
      `  font-display: ${face.display};`,
      `  src: url(./${path.posix.basename(face.file)}) format('woff2');`,
      `  unicode-range: ${face.unicodeRange};`,
      '}',
    );
  }
  return `${lines.join('\n')}\n`;
}

/** The upstream repository and commit google/fonts records for a family, if any. */
export function parseUpstream(metadata) {
  const source = /^source \{([\s\S]*?)^\}/m.exec(metadata)?.[1] ?? '';
  const repository = /repository_url:\s*"([^"]+)"/.exec(source)?.[1];
  if (!repository) return null;
  const commit = /^\s*commit:\s*"([0-9a-f]{7,40})"/m.exec(source)?.[1];
  return { repository: repository.replace('://www.github.com/', '://github.com/'), ...(commit ? { commit } : {}) };
}

async function download(url, { headers = {}, attempts = 3 } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, { headers, signal: AbortSignal.timeout(30_000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }
  throw new Error(`fetch-fonts: could not download ${url}: ${lastError.message}`);
}

async function fetchFamily(spec, root) {
  const css = (await download(cssUrl(spec.query), { headers: { 'User-Agent': USER_AGENT } })).toString('utf8');
  const parsed = parseFaces(css);
  if (parsed.length === 0) throw new Error(`fetch-fonts: no ${SUBSET} faces for ${spec.query}`);
  const families = new Set(parsed.map((face) => face.family));
  if (families.size !== 1) throw new Error(`fetch-fonts: ${spec.query} names ${[...families].join(', ')}`);

  const dir = path.posix.join(FONTS_DIR, spec.id);
  const names = fileNames(spec.id, parsed);
  const files = [];
  for (const [url, name] of names) {
    const buffer = await download(url);
    files.push({ file: path.posix.join(dir, name), url, sha256: sha256(buffer), bytes: buffer.length, buffer });
  }

  const licenseSource = licenseUrl(spec.license);
  const licenseBuffer = await download(licenseSource);
  const metadataPath = `${path.posix.dirname(spec.license)}/METADATA.pb`;
  const metadata = (await download(licenseUrl(metadataPath))).toString('utf8');

  const family = {
    id: spec.id,
    family: parsed[0].family,
    css: cssUrl(spec.query),
    upstream: parseUpstream(metadata),
    license: {
      file: path.posix.join(dir, path.posix.basename(spec.license)),
      ...licenseInfo(spec.license),
      url: licenseSource,
      sha256: sha256(licenseBuffer),
    },
    stylesheet: path.posix.join(dir, `${spec.id}.css`),
    faces: parsed.map((face) => ({
      style: face.style,
      weight: face.weight,
      display: face.display,
      unicodeRange: face.unicodeRange,
      file: path.posix.join(dir, names.get(face.url)),
    })),
    files: files.map(({ file, url, sha256: hash, bytes }) => ({ file, url, sha256: hash, bytes })),
  };

  // Write only after every download for the family succeeded.
  const absoluteDir = path.join(root, dir);
  fs.mkdirSync(absoluteDir, { recursive: true });
  const keep = new Set([family.license.file, family.stylesheet, ...files.map(({ file }) => file)].map((file) => path.posix.basename(file)));
  for (const entry of fs.readdirSync(absoluteDir)) {
    if (!keep.has(entry)) fs.rmSync(path.join(absoluteDir, entry), { recursive: true });
  }
  for (const { file, buffer } of files) fs.writeFileSync(path.join(root, file), buffer);
  fs.writeFileSync(path.join(root, family.license.file), licenseBuffer);
  fs.writeFileSync(path.join(root, family.stylesheet), renderStylesheet(family));
  return family;
}

export function readManifest(root = REPO_ROOT) {
  return JSON.parse(fs.readFileSync(path.join(root, MANIFEST_PATH), 'utf8'));
}

async function fetchAll(root) {
  const families = [];
  for (const spec of FAMILIES) {
    const family = await fetchFamily(spec, root);
    const bytes = family.files.reduce((sum, file) => sum + file.bytes, 0);
    console.log(`fetch-fonts: ${family.id} (${family.family}): ${family.files.length} file(s), ${bytes} bytes`);
    families.push(family);
  }
  const known = new Set(FAMILIES.map((spec) => spec.id));
  for (const entry of fs.readdirSync(path.join(root, FONTS_DIR))) {
    if (!known.has(entry)) console.warn(`fetch-fonts: ${FONTS_DIR}/${entry} is not in FAMILIES; remove it if no font uses it`);
  }
  const manifest = {
    $comment: `Written by scripts/fonts/fetch-fonts.mjs; do not edit. The source URL and SHA-256 of every fetched file under ${FONTS_DIR}. Each stylesheet is rendered from its family's faces.`,
    userAgent: USER_AGENT,
    googleFontsCommit: GOOGLE_FONTS_COMMIT,
    families,
  };
  fs.writeFileSync(path.join(root, MANIFEST_PATH), `${JSON.stringify(manifest, null, 2)}\n`);
  const total = families.flatMap((family) => family.files).reduce((sum, file) => sum + file.bytes, 0);
  console.log(`fetch-fonts: wrote ${families.length} families, ${total} bytes of woff2, and ${MANIFEST_PATH}`);
}

async function verifyAll(root) {
  const manifest = readManifest(root);
  const problems = [];
  for (const family of manifest.families) {
    for (const entry of [...family.files, family.license]) {
      const committed = path.join(root, entry.file);
      if (!fs.existsSync(committed)) problems.push(`${entry.file} is missing`);
      else if (sha256(fs.readFileSync(committed)) !== entry.sha256) problems.push(`${entry.file} differs from the manifest`);
      const fetched = sha256(await download(entry.url));
      if (fetched !== entry.sha256) problems.push(`${entry.url} now serves ${fetched}, not the manifest's ${entry.sha256}`);
    }
    const stylesheet = path.join(root, family.stylesheet);
    if (!fs.existsSync(stylesheet) || fs.readFileSync(stylesheet, 'utf8') !== renderStylesheet(family)) {
      problems.push(`${family.stylesheet} is not what the manifest renders`);
    }
    console.log(`fetch-fonts: checked ${family.id}`);
  }
  if (problems.length > 0) {
    for (const problem of problems) console.error(`fetch-fonts: ${problem}`);
    process.exitCode = 1;
    return;
  }
  console.log(`fetch-fonts: all ${manifest.families.length} families match their sources and the manifest.`);
}

async function main() {
  const { values } = parseArgs({ options: { verify: { type: 'boolean', default: false } } });
  if (values.verify) await verifyAll(REPO_ROOT);
  else await fetchAll(REPO_ROOT);
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) await main();
