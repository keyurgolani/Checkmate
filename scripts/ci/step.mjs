#!/usr/bin/env node
/**
 * Runs one CI step and records it for the aggregate check:
 *
 *   node scripts/ci/step.mjs --name "npm test" --class test [--timeout-minutes 10] -- <command> [args...]
 *
 * Streams the command's output, appends its result and duration to the job
 * summary, and on failure writes `failure_class` to $GITHUB_OUTPUT: `timeout`
 * when it ran out of time, `infra` when the output shows a network or
 * registry outage, and otherwise the --class given (#95's classes).
 */

import { spawn } from 'node:child_process';
import { parseArgs } from 'node:util';
import { appendSummary, isMain, setOutputs } from './lib/actions.mjs';

/** Output that means the runner's network or a registry failed, not the code. */
export const INFRA_SIGNATURES = [
  /FIXTURE_DOWNLOAD_FAILED|FIXTURE_START_TIMEOUT/,
  /Failed to fetch .*from Google Fonts|fonts\.(googleapis|gstatic)\.com/i,
  /npm (ERR!|error) (code )?E(CONNRESET|TIMEDOUT|AI_AGAIN|NOTFOUND|CONNREFUSED)\b|npm (ERR!|error) network/,
  /TLS handshake timeout|toomanyrequests|failed to resolve source metadata/i,
];

const KEEP_BYTES = 1_000_000;

/**
 * @param {{ output: string, timedOut: boolean, fallback: string }} input
 * @returns {string}
 */
export function failureClass({ output, timedOut, fallback }) {
  if (timedOut) return 'timeout';
  return INFRA_SIGNATURES.some((signature) => signature.test(output)) ? 'infra' : fallback;
}

export function formatDuration(ms) {
  const seconds = Math.round(ms / 1000);
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, '0')}s`;
}

/**
 * @param {{ name: string, fallbackClass: string, timeoutMs?: number, command: string, args: string[], env?: NodeJS.ProcessEnv }} options
 * @returns {Promise<number>} the step's exit code
 */
export function runStep({ name, fallbackClass, timeoutMs, command, args, env = process.env }) {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(command, args, { stdio: ['inherit', 'pipe', 'pipe'], env, detached: process.platform !== 'win32' });
    let output = '';
    let timedOut = false;
    const keep = (chunk, stream) => {
      stream.write(chunk);
      output = (output + chunk.toString()).slice(-KEEP_BYTES);
    };
    child.stdout.on('data', (chunk) => keep(chunk, process.stdout));
    child.stderr.on('data', (chunk) => keep(chunk, process.stderr));

    const signalGroup = (signal) => {
      try {
        process.kill(process.platform === 'win32' ? child.pid : -child.pid, signal);
      } catch {
        // already gone
      }
    };
    const forward = (signal) => signalGroup(signal);
    process.on('SIGINT', forward);
    process.on('SIGTERM', forward);
    const timer = timeoutMs
      ? setTimeout(() => {
          timedOut = true;
          console.error(`step: ${name} exceeded ${formatDuration(timeoutMs)}; stopping it.`);
          signalGroup('SIGTERM');
          setTimeout(() => signalGroup('SIGKILL'), 10_000).unref();
        }, timeoutMs)
      : undefined;

    let finished = false;
    const finish = (code) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      process.off('SIGINT', forward);
      process.off('SIGTERM', forward);
      const duration = formatDuration(Date.now() - started);
      if (code === 0 && !timedOut) {
        appendSummary(`- **${name}**: passed in ${duration}`, env);
        resolve(0);
        return;
      }
      const cls = failureClass({ output, timedOut, fallback: fallbackClass });
      setOutputs({ failure_class: cls }, env);
      appendSummary(`- **${name}**: failed (${cls}) in ${duration}`, env);
      resolve(code === 0 || code === null ? 1 : code);
    };
    child.once('error', (error) => {
      output += `\n${error.message}`;
      console.error(`step: could not run ${command}: ${error.message}`);
      finish(127);
    });
    child.once('close', (code) => finish(code));
  });
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      name: { type: 'string' },
      class: { type: 'string', default: 'test' },
      'timeout-minutes': { type: 'string' },
    },
  });
  const [command, ...args] = positionals;
  if (!command) {
    console.error('Usage: node scripts/ci/step.mjs --name <label> --class <class> [--timeout-minutes N] -- <command> [args...]');
    process.exitCode = 2;
    return;
  }
  const minutes = values['timeout-minutes'] ? Number(values['timeout-minutes']) : undefined;
  process.exitCode = await runStep({
    name: values.name ?? [command, ...args].join(' '),
    fallbackClass: values.class,
    timeoutMs: minutes ? minutes * 60_000 : undefined,
    command,
    args,
  });
}

if (isMain(import.meta.url)) await main();
