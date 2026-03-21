"use server";

import { revalidatePath } from "next/cache";
import { getServerAuth } from "@/lib/server-auth";
import { ChecklistService } from "@/lib/services/checklist";
import { Collections } from "@/lib/pocketbase-types";

export async function bulkUseTemplates(templateIds: string[]) {
  const { isAuthenticated, pb } = await getServerAuth();
  if (!isAuthenticated) return { success: false, error: "Not authenticated" };

  const errors: string[] = [];
  const created: string[] = [];
  const service = new ChecklistService(pb);

  for (const templateId of templateIds) {
    try {
      const template = await pb.collection(Collections.TEMPLATES).getOne(templateId);
      const result = await service.create({
        templateId,
        name: `Checklist from ${template.title}`,
      });
      if (result.success && result.checklist) {
        created.push(result.checklist.id);
      } else {
        errors.push(result.error?.message ?? `Failed to create checklist from ${templateId}`);
      }
    } catch (err) {
      errors.push(err instanceof Error ? err.message : `Failed to process ${templateId}`);
    }
  }

  revalidatePath("/checklists");
  return { success: errors.length === 0, createdCount: created.length, errors };
}

export async function bulkExportDiscoverTemplates(templateIds: string[]) {
  const { isAuthenticated, pb } = await getServerAuth();
  if (!isAuthenticated) return { success: false, error: "Not authenticated" };

  const { ExportService } = await import("@/lib/services/export");
  const exportService = new ExportService(pb);
  const results: Array<{ id: string; data: unknown }> = [];
  const errors: string[] = [];

  for (const id of templateIds) {
    try {
      const data = await exportService.exportBlueprint(id, { format: "json", includeMetadata: true });
      results.push({ id, data });
    } catch (err) {
      errors.push(err instanceof Error ? err.message : `Failed to export ${id}`);
    }
  }

  return { success: errors.length === 0, exports: results, errors };
}
