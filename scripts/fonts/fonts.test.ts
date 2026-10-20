/**
 * #83 test 11, offline: the theme fonts load from this origin. The files
 * under public/fonts match scripts/fonts/manifest.json, every font-themes.ts
 * entry renders a vendored family, and nothing names a third-party font
 * host. check-font-hosts.mjs runs the same rules on a real build in CI.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { fontThemes } from '../../src/lib/themes/font-themes';
import { checkFontHosts, findFontHosts, offOriginLinks, offOriginUrls } from './check-font-hosts.mjs';
import {
  FAMILIES,
  FONTS_DIR,
  GOOGLE_FONTS_COMMIT,
  REPO_ROOT,
  cssUrl,
  fileNames,
  licenseUrl,
  mergeFaces,
  parseFaces,
  parseUpstream,
  readManifest,
  renderStylesheet,
  sha256,
} from './fetch-fonts.mjs';

interface ManifestFamily {
  id: string;
  family: string;
  css: string;
  upstream: { repository: string; commit?: string } | null;
  license: { file: string; spdx: string; name: string; url: string; sha256: string };
  stylesheet: string;
  faces: { style: string; weight: string; display: string; unicodeRange: string; file: string }[];
  files: { file: string; url: string; sha256: string; bytes: number }[];
}

const manifest = readManifest() as { userAgent: string; googleFontsCommit: string; families: ManifestFamily[] };
const read = (file: string) => fs.readFileSync(path.join(REPO_ROOT, file));
const exists = (file: string) => fs.existsSync(path.join(REPO_ROOT, file));
const href = (family: ManifestFamily) => `/${path.posix.relative('public', family.stylesheet)}`;
const firstFamily = (stack: string) => stack.split(',')[0]!.trim().replace(/^(['"])(.*)\1$/, '$2');
const webFonts = Object.values(fontThemes).filter((font) => font.id !== 'system');
/** An import of the loader that fetches from Google Fonts at build time. */
const GOOGLE_LOADER = /(?:from|import|require\()\s*["']next\/font\/google["']/;

function filesUnder(dir: string): string[] {
  const absolute = path.join(REPO_ROOT, dir);
  return fs
    .readdirSync(absolute, { recursive: true, encoding: 'utf8' })
    .map((entry) => path.posix.join(dir, entry.split(path.sep).join('/')))
    .filter((file) => fs.statSync(path.join(REPO_ROOT, file)).isFile())
    .sort();
}

/** The localFont() calls in the root layout: src, weight and declared family. */
function layoutFonts() {
  const layout = read('src/app/layout.tsx').toString('utf8');
  const field = (block: string, name: string) => new RegExp(`\\b${name}:\\s*(["'])(.*?)\\1`).exec(block)?.[2];
  const fonts = [...layout.matchAll(/localFont\(\{([\s\S]*?)\}\)/g)].map(([, block = '']) => ({
    src: field(block, 'src'),
    weight: field(block, 'weight'),
    family: /prop:\s*(["'])font-family\1,\s*value:\s*(["'])(.*?)\2/.exec(block)?.[3],
  }));
  return { layout, fonts };
}

describe('vendored theme fonts', () => {
  it('vendors every web font font-themes.ts offers, and nothing else', () => {
    const ids = webFonts.map((font) => font.id).sort();
    expect(ids).toHaveLength(27);
    expect(FAMILIES.map((spec) => spec.id).sort()).toEqual(ids);
    expect(manifest.families.map((family) => family.id)).toEqual(FAMILIES.map((spec) => spec.id));
  });

  it('gives each entry the family its vendored @font-face declares', () => {
    for (const family of manifest.families) {
      expect(firstFamily(fontThemes[family.id]!.fontFamily), family.id).toBe(family.family);
      const declared = [...read(family.stylesheet).toString('utf8').matchAll(/font-family: '([^']+)'/g)].map((match) => match[1]);
      expect(new Set(declared), family.id).toEqual(new Set([family.family]));
    }
  });

  it('links each lazily loaded font from its stylesheet on this origin', () => {
    const linked = webFonts.filter((font) => font.googleFontUrl !== undefined);
    expect(linked).toHaveLength(23);
    for (const font of linked) {
      const family = manifest.families.find((candidate) => candidate.id === font.id)!;
      expect(font.googleFontUrl, font.id).toBe(href(family));
      expect(exists(path.posix.join('public', font.googleFontUrl!)), font.id).toBe(true);
    }
    expect(fontThemes.system!.googleFontUrl).toBeUndefined();
  });

  it('loads the other four in the root layout with next/font/local from the vendored files', () => {
    const { layout, fonts } = layoutFonts();
    expect(layout).not.toMatch(GOOGLE_LOADER);
    expect(layout).toContain('from "next/font/local"');
    const unlinked = webFonts.filter((font) => font.googleFontUrl === undefined).map((font) => firstFamily(font.fontFamily));
    expect(fonts.map((font) => font.family).sort()).toEqual(unlinked.sort());
    for (const font of fonts) {
      const file = path.posix.normalize(path.posix.join('src/app', font.src ?? ''));
      const family = manifest.families.find((candidate) => candidate.files.some((entry) => entry.file === file));
      expect(family?.family, file).toBe(font.family);
      expect(family?.faces.find((face) => face.file === file)?.weight, file).toBe(font.weight);
    }
  });

  it('keeps every vendored file identical to the manifest', () => {
    for (const family of manifest.families) {
      for (const entry of family.files) {
        const buffer = read(entry.file);
        expect(sha256(buffer), entry.file).toBe(entry.sha256);
        expect(buffer.length, entry.file).toBe(entry.bytes);
        expect(buffer.subarray(0, 4).toString('latin1'), entry.file).toBe('wOF2');
      }
      expect(sha256(read(family.license.file)), family.license.file).toBe(family.license.sha256);
      expect(read(family.stylesheet).toString('utf8'), family.stylesheet).toBe(renderStylesheet(family));
    }
  });

  it('ships nothing under public/fonts that the manifest does not record', () => {
    const recorded = manifest.families.flatMap((family) => [family.stylesheet, family.license.file, ...family.files.map((entry) => entry.file)]);
    expect(filesUnder(FONTS_DIR)).toEqual([...recorded].sort());
  });

  it('records sources the fetch script can download again', () => {
    expect(manifest.googleFontsCommit).toBe(GOOGLE_FONTS_COMMIT);
    for (const [index, family] of manifest.families.entries()) {
      const spec = FAMILIES[index]!;
      expect(family.css).toBe(cssUrl(spec.query));
      expect(family.license.url).toBe(licenseUrl(spec.license, manifest.googleFontsCommit));
      for (const entry of family.files) expect(entry.url, entry.file).toMatch(/^https:\/\/fonts\.gstatic\.com\/s\/[\w-]+\/v\d+\/[\w-]+\.woff2$/);
      expect(new Set(family.faces.map((face) => face.file))).toEqual(new Set(family.files.map((entry) => entry.file)));
    }
  });

  it('vendors the latin subset in woff2 only, one face per file over the weights each family asked for', () => {
    const [latin] = manifest.families[0]!.faces.map((face) => face.unicodeRange);
    expect(latin).toMatch(/^U\+0000-00FF, /);
    const span = (weight: string) => {
      const [low = NaN, high = low] = weight.split(' ').map(Number);
      return [low, high] as const;
    };
    for (const [index, family] of manifest.families.entries()) {
      const axis = /:wght@(.+)$/.exec(FAMILIES[index]!.query)?.[1];
      const asked = axis === undefined ? ['400'] : axis.includes('..') ? [axis.replace('..', ' ')] : axis.split(';');
      const bounds = asked.flatMap((weight) => span(weight));
      // Each weight asked for falls in exactly one face, and no face reaches past them.
      for (const weight of asked) {
        const [low, high] = span(weight);
        const covering = family.faces.filter((face) => span(face.weight)[0] <= low && high <= span(face.weight)[1]);
        expect(covering, `${family.id} ${weight}`).toHaveLength(1);
      }
      for (const face of family.faces) expect(bounds, family.id).toEqual(expect.arrayContaining([...span(face.weight)]));
      expect(new Set(family.faces.map((face) => face.file)).size, family.id).toBe(family.faces.length);
      for (const face of family.faces) {
        expect(face.unicodeRange, family.id).toBe(latin);
        expect(face.file, family.id).toMatch(new RegExp(`^${FONTS_DIR}/${family.id}/${family.id}-latin-(?:wght|\\d+)-normal\\.woff2$`));
      }
    }
  });

  it('licenses every family under the OFL or Apache 2.0, with its copyright line', () => {
    for (const family of manifest.families) {
      const text = read(family.license.file).toString('utf8');
      expect(['OFL-1.1', 'Apache-2.0'], family.id).toContain(family.license.spdx);
      expect(text, family.id).toMatch(/^Copyright /m);
      expect(text, family.id).toContain(family.license.spdx === 'OFL-1.1' ? 'SIL OPEN FONT LICENSE Version 1.1' : 'Apache License');
    }
  });

  it('names no third-party font host in the app source or public files', () => {
    const files = [...filesUnder('src'), ...filesUnder('public'), 'next.config.ts'].filter((file) => !/\.(?:woff2|png|ico)$/.test(file));
    const found = files.flatMap((file) => {
      const text = read(file).toString('utf8');
      const urls = file.endsWith('.css') ? offOriginUrls(text) : [];
      return [...findFontHosts(text), ...urls].map((host) => `${file}: ${host}`);
    });
    expect(found).toEqual([]);
    const googleLoader = filesUnder('src').filter((file) => GOOGLE_LOADER.test(read(file).toString('utf8')));
    expect(googleLoader).toEqual([]);
  });
});

describe('fetch-fonts', () => {
  const css = [
    "/* latin-ext */\n@font-face {\n  font-family: 'Sample';\n  font-style: normal;\n  font-weight: 400;\n  font-display: swap;\n  src: url(https://fonts.gstatic.com/s/sample/v1/ext.woff2) format('woff2');\n  unicode-range: U+0100-02BA;\n}",
    "/* latin */\n@font-face {\n  font-family: 'Sample';\n  font-style: normal;\n  font-weight: 400;\n  font-display: swap;\n  src: url(https://fonts.gstatic.com/s/sample/v1/a.woff2) format('woff2');\n  unicode-range: U+0000-00FF;\n}",
    "/* latin */\n@font-face {\n  font-family: 'Sample';\n  font-style: normal;\n  font-weight: 700;\n  font-display: swap;\n  src: url(https://fonts.gstatic.com/s/sample/v1/b.woff2) format('woff2');\n  unicode-range: U+0000-00FF;\n}",
  ].join('\n');

  it('keeps the latin faces of a css2 response and names one file per static weight', () => {
    const faces = parseFaces(css);
    expect(faces.map((face) => [face.family, face.weight, face.url])).toEqual([
      ['Sample', '400', 'https://fonts.gstatic.com/s/sample/v1/a.woff2'],
      ['Sample', '700', 'https://fonts.gstatic.com/s/sample/v1/b.woff2'],
    ]);
    expect([...fileNames('sample', faces).values()]).toEqual(['sample-latin-400-normal.woff2', 'sample-latin-700-normal.woff2']);
  });

  it('names a variable font file once, whether css2 gives a range or one url per weight', () => {
    const shared = parseFaces(css.replaceAll('/b.woff2', '/a.woff2'));
    expect([...fileNames('sample', shared).values()]).toEqual(['sample-latin-wght-normal.woff2']);
    expect(mergeFaces(shared).map((face) => face.weight)).toEqual(['400 700']);
    expect(mergeFaces(parseFaces(css)).map((face) => face.weight)).toEqual(['400', '700']);
    const range = parseFaces(css.replace("font-weight: 400;\n  font-display: swap;\n  src: url(https://fonts.gstatic.com/s/sample/v1/a", "font-weight: 100 900;\n  font-display: swap;\n  src: url(https://fonts.gstatic.com/s/sample/v1/a"));
    expect(fileNames('sample', range).get('https://fonts.gstatic.com/s/sample/v1/a.woff2')).toBe('sample-latin-wght-normal.woff2');
  });

  it('reads the upstream repository and commit from google/fonts metadata', () => {
    const metadata = 'name: "Sample"\nsource {\n  repository_url: "https://www.github.com/sample/sample"\n  commit: "66647c0bbbe41a850d79d9c76fb13add3378940f"\n  files {\n    source_file: "a.ttf"\n  }\n}\n';
    expect(parseUpstream(metadata)).toEqual({ repository: 'https://github.com/sample/sample', commit: '66647c0bbbe41a850d79d9c76fb13add3378940f' });
    expect(parseUpstream('name: "Sample"\n')).toBeNull();
  });
});

describe('check-font-hosts', () => {
  it('finds font hosts and absolute font file URLs, and leaves other Google APIs alone', () => {
    expect(findFontHosts('l.href="https://fonts.googleapis.com/css2?family=Inter"')).toEqual(['fonts.googleapis.com']);
    expect(findFontHosts('src:url(https://fonts.gstatic.com/s/inter/v20/a.woff2)')).toEqual(['fonts.gstatic.com', 'https://fonts.gstatic.com/s/inter/v20/a.woff2']);
    expect(findFontHosts('"//cdn.example.com/fonts/a.ttf"')).toEqual(['//cdn.example.com/fonts/a.ttf']);
    expect(findFontHosts('fetch("https://generativelanguage.googleapis.com/v1beta/models")')).toEqual([]);
    expect(findFontHosts('src:url(../media/inter_latin_wght_normal.woff2) /fonts/poppins/poppins.css')).toEqual([]);
  });

  it('flags stylesheet urls and page links that leave the origin', () => {
    expect(offOriginUrls('@import "https://a.example/x.css";.a{background:url(data:image/png;base64,AA)}.b{src:url(//b.example/y.woff2)}')).toEqual([
      '//b.example/y.woff2',
      'https://a.example/x.css',
    ]);
    expect(offOriginUrls('.a{background:url("/x.png")}@font-face{src:url(./a.woff2)}')).toEqual([]);
    const html = '<link rel="preload stylesheet" href="https://x.example/a.css"><link rel="preload" as="font" href="/_next/static/media/a.woff2"><link rel="icon" href="https://x.example/i.png">';
    expect(offOriginLinks(html)).toEqual(['https://x.example/a.css']);
  });

  function fakeBuild(files: Record<string, string>) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cm-font-hosts-'));
    for (const [file, text] of Object.entries(files)) {
      fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
      fs.writeFileSync(path.join(root, file), text);
    }
    return root;
  }

  const families = {
    families: [
      { id: 'inter', family: 'Inter', stylesheet: 'public/fonts/inter/inter.css' },
      { id: 'poppins', family: 'Poppins', stylesheet: 'public/fonts/poppins/poppins.css' },
    ],
  };
  const vendored = {
    '.next/static/chunks/a.css': '@font-face{font-family:Inter;src:url(../media/inter_latin_wght_normal.woff2)format("woff2")}',
    '.next/static/chunks/b.js': 'l.href="/fonts/poppins/poppins.css"',
    '.next/server/app/index.html': '<link rel="stylesheet" href="/_next/static/chunks/a.css">',
    'public/fonts/poppins/poppins.css': "@font-face{font-family:'Poppins';src:url(./poppins-latin-400-normal.woff2) format('woff2')}",
  };

  it('passes a build whose fonts all load from the origin', () => {
    const result = checkFontHosts({ root: fakeBuild(vendored), manifest: families });
    expect(result.problems).toEqual([]);
    expect(result).toMatchObject({ viaBuiltCss: ['inter'], viaStylesheet: ['poppins'] });
  });

  it('fails a build that loads a font from Google or leaves a family unloaded', () => {
    const root = fakeBuild({
      ...vendored,
      '.next/static/chunks/a.css': "@font-face{font-family:Inter;src:url(https://fonts.gstatic.com/s/inter/v20/a.woff2)format('woff2')}",
      '.next/static/chunks/b.js': 'l.href="https://fonts.googleapis.com/css2?family=Poppins:wght@400&display=swap"',
      '.next/server/app/index.html': '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter">',
    });
    const { problems } = checkFontHosts({ root, manifest: families });
    expect(problems).toEqual(
      expect.arrayContaining([
        '.next/static/chunks/a.css references fonts.gstatic.com',
        '.next/static/chunks/a.css loads https://fonts.gstatic.com/s/inter/v20/a.woff2 from another origin',
        '.next/static/chunks/b.js references fonts.googleapis.com',
        '.next/server/app/index.html links https://fonts.googleapis.com/css2?family=Inter from another origin',
        'Inter (inter) has no @font-face in the built CSS, and no client code links /fonts/inter/inter.css',
        'Poppins (poppins) has no @font-face in the built CSS, and no client code links /fonts/poppins/poppins.css',
      ]),
    );
  });

  it('fails when there is no build to read', () => {
    const { problems } = checkFontHosts({ root: fakeBuild({ 'public/robots.txt': '' }), manifest: { families: [] } });
    expect(problems).toEqual(['.next/static has no files; run next build first']);
  });
});
