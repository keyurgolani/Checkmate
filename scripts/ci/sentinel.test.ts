import { once } from 'node:events';
import net from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { SENTINEL_BUSY_EXIT, sentinel } from './sentinel.mjs';

// These use a free port, never 8090, so they don't depend on the machine.
const node = process.execPath;
const connectToSentinel = [
  '-e',
  "const u = new URL(process.env.SENTINEL_URL); const s = require('node:net').connect(Number(u.port), u.hostname); s.on('connect', () => s.end()); s.on('error', () => {});",
];

let blocker: net.Server | undefined;
afterEach(() => {
  blocker?.close();
  blocker = undefined;
});

async function busyPort(): Promise<number> {
  blocker = net.createServer();
  blocker.listen(0, '127.0.0.1');
  await once(blocker, 'listening');
  return (blocker.address() as net.AddressInfo).port;
}

function run(options: { port?: number; args: string[]; env?: NodeJS.ProcessEnv }) {
  const logs: string[] = [];
  const result = sentinel({ port: options.port ?? 0, command: node, args: options.args, env: options.env ?? process.env, log: (line: string) => logs.push(line) });
  return result.then((code: number) => ({ code, log: logs.join('\n') }));
}

describe('sentinel', () => {
  it('fails a run with a planted connection', async () => {
    const { code, log } = await run({ args: connectToSentinel });
    expect(code).toBe(1);
    expect(log).toContain('FAIL, 1 connection(s)');
  });

  it('passes a run that never connects', async () => {
    const { code, log } = await run({ args: ['-e', 'process.exit(0)'] });
    expect(code).toBe(0);
    expect(log).toContain('no connections');
  });

  it("passes on the command's exit code", async () => {
    const { code } = await run({ args: ['-e', 'process.exit(7)'] });
    expect(code).toBe(7);
  });

  it('skips the check outside CI when the port is busy', async () => {
    const { code, log } = await run({ port: await busyPort(), args: ['-e', 'process.exit(0)'], env: { ...process.env, CI: '' } });
    expect(code).toBe(0);
    expect(log).toContain('skips the connection check');
  });

  it('fails in CI when the port is busy', async () => {
    const { code, log } = await run({ port: await busyPort(), args: ['-e', 'process.exit(0)'], env: { ...process.env, CI: 'true' } });
    expect(code).toBe(SENTINEL_BUSY_EXIT);
    expect(log).toContain('CI must run with it free');
  });
});
