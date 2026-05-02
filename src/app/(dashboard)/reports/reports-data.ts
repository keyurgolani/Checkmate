import { Collections } from '@/lib/pocketbase-types';
import type { Checklist, Template } from '@/lib/pocketbase-types';

interface ReportsCollectionClient {
  getFullList<T>(options: { filter: string; fields?: string }): Promise<T[]>;
}

interface ReportsPocketBaseClient {
  collection(name: string): ReportsCollectionClient;
}

export async function getWorkspaceChecklists(
  pb: ReportsPocketBaseClient,
  userId: string,
  workspaceId: string
): Promise<Checklist[]> {
  try {
    return await pb.collection(Collections.CHECKLISTS).getFullList<Checklist>({
      filter: `user = "${userId}" && workspace = "${workspaceId}"`,
      fields: 'id,progress',
    });
  } catch {
    const templates = await pb.collection(Collections.TEMPLATES).getFullList<Template>({
      filter: `workspace = "${workspaceId}"`,
      fields: 'id',
    });

    const templateIds = templates.map((template) => template.id);
    if (templateIds.length === 0) {
      return [];
    }

    const checklistFilter = templateIds
      .map((templateId) => `blueprint = "${templateId}"`)
      .join(' || ');

    return await pb.collection(Collections.CHECKLISTS).getFullList<Checklist>({
      filter: `user = "${userId}" && (${checklistFilter})`,
      fields: 'id,progress',
    });
  }
}
