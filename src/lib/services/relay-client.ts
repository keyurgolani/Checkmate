'use client';

import type { RequestSpec } from '@/lib/relay-utils';

interface RelayCallbacks {
  onStatusChange?: (status: string) => void;
  signal?: AbortSignal;
}

interface RelayResponse {
  relay: boolean;
  token?: string;
  requestSpec?: RequestSpec;
  result?: { success: boolean; [key: string]: unknown };
}

export async function executeRelayWorkflow(
  operation: string,
  params: Record<string, unknown>,
  callbacks?: RelayCallbacks
): Promise<{ success: boolean; [key: string]: unknown }> {
  let response = await fetch('/api/relay/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ operation, ...params }),
    signal: callbacks?.signal,
  });
  let data: RelayResponse = await response.json();

  if (!data.relay) return data.result ?? { success: false, error: { message: 'Unexpected response' } };

  while (data.relay) {
    const spec = data.requestSpec!;
    let relayResult: string;

    try {
      if (spec.responseHandling === 'stream-collect') {
        callbacks?.onStatusChange?.('Generating with local AI model...');
        relayResult = await streamCollect(spec, callbacks?.signal);
      } else {
        callbacks?.onStatusChange?.('Connecting to local service...');
        relayResult = await simpleFetch(spec, callbacks?.signal);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') throw err;

      const message = classifyFetchError(err, spec.url);
      response = await fetch('/api/relay/next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: data.token, error: message }),
      });
      return (await response.json()).result;
    }

    callbacks?.onStatusChange?.('Processing response...');
    response = await fetch('/api/relay/next', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: data.token, response: relayResult }),
      signal: callbacks?.signal,
    });
    data = await response.json();
  }

  return data.result ?? { success: false, error: { message: 'Unexpected response' } };
}

export async function simpleFetch(spec: RequestSpec, signal?: AbortSignal): Promise<string> {
  const res = await fetch(spec.url, {
    method: spec.method,
    headers: spec.headers,
    body: spec.body,
    signal,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.text();
}

export async function streamCollect(spec: RequestSpec, signal?: AbortSignal): Promise<string> {
  const res = await fetch(spec.url, {
    method: spec.method,
    headers: spec.headers,
    body: spec.body,
    signal,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  const chunks: string[] = [];
  let totalSize = 0;
  const MAX_RESPONSE_SIZE = 5 * 1024 * 1024;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    totalSize += chunk.length;
    if (totalSize > MAX_RESPONSE_SIZE) {
      reader.cancel();
      throw new Error('Response too large');
    }
    chunks.push(chunk);
  }

  return chunks.join('');
}

export function classifyFetchError(err: unknown, url: string): string {
  if (err instanceof TypeError && (err.message === 'Failed to fetch' || err.message.includes('NetworkError'))) {
    try {
      const origin = new URL(url).origin;
      return `Cannot connect to service at ${origin}. Check that it's running and CORS is configured.`;
    } catch {
      return 'Cannot connect to local service. Check that it\'s running and CORS is configured.';
    }
  }
  return err instanceof Error ? err.message : 'Unknown relay error';
}
