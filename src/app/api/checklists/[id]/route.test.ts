/**
 * CHECKMATE-09.1 · slice 0 (#53), test plan item 1: GET, PUT and DELETE
 * /api/checklists/[id] work for the run owner. At 9019d17 all three read
 * `.data.checklist` off `getById`'s `Result<Instance>` and answered 404.
 */

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OTHER_USER, OWNER, ownerRunFixture, sessionFor } from '@/test/run-fixture';

const { getServerAuth } = vi.hoisted(() => ({ getServerAuth: vi.fn() }));
vi.mock('@/lib/server-auth', () => ({ getServerAuth }));

import { DELETE, GET, PUT } from './route';

const RUN_URL = 'http://localhost/api/checklists/run-1';
const context = () => ({ params: Promise.resolve({ id: 'run-1' }) });

/** What a missing run gets. Another user's run must get the same. */
const NOT_FOUND_BODY = {
  success: false,
  error: { code: 'CHECKLIST_001', message: 'Checklist not found', timestamp: expect.any(String) },
};

function rename(name: string): NextRequest {
  return new NextRequest(RUN_URL, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name }),
  });
}

beforeEach(() => {
  getServerAuth.mockReset();
});

describe('GET /api/checklists/[id]', () => {
  it('returns the run and its steps to the owner', async () => {
    const fake = ownerRunFixture();
    getServerAuth.mockResolvedValue(sessionFor(OWNER, fake));

    const response = await GET(new NextRequest(`${RUN_URL}?includeItems=true`), context());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      checklist: expect.objectContaining({ id: 'run-1', name: 'Opening, Monday', userId: OWNER.id }),
      checklistItems: [
        expect.objectContaining({ id: 'step-1', content: 'Unlock the doors' }),
        expect.objectContaining({ id: 'step-2', content: 'Count the till' }),
      ],
    });
  });

  it("answers another user's request like a missing run", async () => {
    const fake = ownerRunFixture(OTHER_USER);
    getServerAuth.mockResolvedValue(sessionFor(OTHER_USER, fake));

    const response = await GET(new NextRequest(RUN_URL), context());

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual(NOT_FOUND_BODY);
  });
});

describe('PUT /api/checklists/[id]', () => {
  it('renames the run for the owner', async () => {
    const fake = ownerRunFixture();
    getServerAuth.mockResolvedValue(sessionFor(OWNER, fake));

    const response = await PUT(rename('  Opening, Tuesday  '), context());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      checklist: expect.objectContaining({ id: 'run-1', name: 'Opening, Tuesday' }),
    });
    expect(fake.records('instances')[0]).toMatchObject({ name: 'Opening, Tuesday' });
  });

  it('answers another user like a missing run and writes nothing', async () => {
    const fake = ownerRunFixture(OTHER_USER);
    getServerAuth.mockResolvedValue(sessionFor(OTHER_USER, fake));

    const response = await PUT(rename('Taken over'), context());

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual(NOT_FOUND_BODY);
    expect(fake.writes()).toEqual([]);
  });
});

describe('DELETE /api/checklists/[id]', () => {
  it('deletes the run for the owner', async () => {
    const fake = ownerRunFixture();
    getServerAuth.mockResolvedValue(sessionFor(OWNER, fake));

    const response = await DELETE(new NextRequest(RUN_URL, { method: 'DELETE' }), context());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(fake.records('instances')).toEqual([]);
  });

  it('answers another user like a missing run and deletes nothing', async () => {
    const fake = ownerRunFixture(OTHER_USER);
    getServerAuth.mockResolvedValue(sessionFor(OTHER_USER, fake));

    const response = await DELETE(new NextRequest(RUN_URL, { method: 'DELETE' }), context());

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual(NOT_FOUND_BODY);
    expect(fake.writes()).toEqual([]);
  });

  it('answers the owner with the same 404 for a run that does not exist', async () => {
    const fake = ownerRunFixture();
    getServerAuth.mockResolvedValue(sessionFor(OWNER, fake));

    const response = await DELETE(new NextRequest('http://localhost/api/checklists/run-2', { method: 'DELETE' }), {
      params: Promise.resolve({ id: 'run-2' }),
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual(NOT_FOUND_BODY);
  });
});
