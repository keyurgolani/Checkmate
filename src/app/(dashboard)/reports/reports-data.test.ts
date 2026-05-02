import { describe, expect, it } from 'vitest';

import { getWorkspaceChecklists } from './reports-data';

describe('getWorkspaceChecklists', () => {
  it('falls back to blueprint filtering when checklists do not have a workspace field', async () => {
    const calls: { collection: string; filter?: string }[] = [];
    const pb = {
      collection(name: string) {
        return {
          async getFullList<T>(options: { filter?: string }): Promise<T[]> {
            calls.push({ collection: name, filter: options.filter });

            if (name === 'instances' && options.filter?.includes('workspace =')) {
              throw new Error('invalid workspace filter');
            }

            if (name === 'blueprints') {
              return [{ id: 'template-1' }, { id: 'template-2' }] as T[];
            }

            if (name === 'instances') {
              return [{ id: 'checklist-1', progress: 75 }] as T[];
            }

            return [];
          },
        };
      },
    };

    const checklists = await getWorkspaceChecklists(pb, 'user-1', 'workspace-1');

    expect(checklists).toEqual([{ id: 'checklist-1', progress: 75 }]);
    expect(calls).toEqual([
      {
        collection: 'instances',
        filter: 'user = "user-1" && workspace = "workspace-1"',
      },
      {
        collection: 'blueprints',
        filter: 'workspace = "workspace-1"',
      },
      {
        collection: 'instances',
        filter: 'user = "user-1" && (blueprint = "template-1" || blueprint = "template-2")',
      },
    ]);
  });
});
