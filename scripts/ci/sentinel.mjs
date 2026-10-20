#!/usr/bin/env node
/**
 * Listens on a port around a command and fails if anything connects, so a
 * test or build that reaches for the dev compose PocketBase on 8090 fails.
 *
 *   node scripts/ci/sentinel.mjs [--host 127.0.0.1] [--port 8090] -- <command> [args...]
 *
 * Exits 1 after any connection, otherwise with the command's exit code. The
 * command sees SENTINEL_URL. Outside CI, a busy port (a developer's own
 * PocketBase) skips the check with a message; in CI it is an error.
 */

import { spawn } from 'node:child_process';
import net from 'node:net';
import { parseArgs } from 'node:util';
import { isMain } from './lib/actions.mjs';

export const SENTINEL_BUSY_EXIT = 3;

function isCi(env) {
  const value = env.CI?.trim().toLowerCase();
  return value !== undefined && value !== '' && value !== 'false' && value !== '0';
}

function listen(host, port, onConnection) {
  return new Promise((resolve, reject) => {
    const server = net.createServer(onConnection);
    server.once('error', reject);
    server.listen(port, host, () => resolve(server));
  });
}

function runCommand(command, args, env) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: 'inherit', env, shell: process.platform === 'win32' });
    const forward = (signal) => child.kill(signal);
    process.on('SIGINT', forward);
    process.on('SIGTERM', forward);
    child.once('error', (error) => {
      console.error(`sentinel: could not run ${command}: ${error.message}`);
      resolve(127);
    });
    child.once('exit', (code, signal) => {
      process.off('SIGINT', forward);
      process.off('SIGTERM', forward);
      resolve(code ?? (signal ? 1 : 0));
    });
  });
}

/**
 * @param {{ host?: string, port?: number, command: string, args?: string[], env?: NodeJS.ProcessEnv, log?: (line: string) => void }} options
 * @returns {Promise<number>} the exit code to use
 */
export async function sentinel({ host = '127.0.0.1', port = 8090, command, args = [], env = process.env, log = console.error }) {
  const connections = [];
  let server;
  try {
    server = await listen(host, port, (socket) => {
      connections.push({ from: `${socket.remoteAddress}:${socket.remotePort}`, at: new Date().toISOString() });
      socket.destroy();
    });
  } catch (error) {
    if (error.code !== 'EADDRINUSE') throw error;
    if (isCi(env)) {
      log(`sentinel: ${host}:${port} is already in use, so connections to it can't be checked. CI must run with it free.`);
      return SENTINEL_BUSY_EXIT;
    }
    log(`sentinel: ${host}:${port} is busy (a local PocketBase?), so this run skips the connection check. CI always runs it.`);
    return runCommand(command, args, env);
  }

  const address = server.address();
  const url = `http://${host}:${address.port}`;
  log(`sentinel: watching ${url}; any connection fails the run.`);
  const code = await runCommand(command, args, { ...env, SENTINEL_URL: url });
  await new Promise((resolve) => server.close(resolve));

  if (connections.length > 0) {
    log(`sentinel: FAIL, ${connections.length} connection(s) to ${url} during the run:`);
    for (const connection of connections) log(`  from ${connection.from} at ${connection.at}`);
    log('sentinel: something used a default or developer PocketBase URL; backend tests must use the fixture.');
    return 1;
  }
  log(`sentinel: no connections to ${url}.`);
  return code;
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      host: { type: 'string', default: '127.0.0.1' },
      port: { type: 'string', default: '8090' },
    },
  });
  const [command, ...args] = positionals;
  if (!command) {
    console.error('Usage: node scripts/ci/sentinel.mjs [--host H] [--port P] -- <command> [args...]');
    process.exitCode = 2;
    return;
  }
  process.exitCode = await sentinel({ host: values.host, port: Number(values.port), command, args });
}

if (isMain(import.meta.url)) await main();
