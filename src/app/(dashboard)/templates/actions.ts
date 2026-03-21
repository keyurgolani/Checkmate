"use server";

import { revalidatePath } from "next/cache";
import { getServerAuth } from "@/lib/server-auth";
import { TemplateService } from "@/lib/services/template";
import { Visibility } from "@/lib/pocketbase-types";

export async function duplicateTemplate(templateId: string) {
  const { isAuthenticated, pb } = await getServerAuth();
  if (!isAuthenticated) {
    return { success: false, error: "Not authenticated" };
  }

  const service = new TemplateService(pb);
  const result = await service.duplicate(templateId);

  if (result.success) {
    revalidatePath("/templates");
  }

  return { success: result.success, error: result.error?.message };
}

export async function bulkDeleteTemplates(templateIds: string[]) {
  const { isAuthenticated, pb } = await getServerAuth();
  if (!isAuthenticated) return { success: false, error: "Not authenticated" };

  const service = new TemplateService(pb);
  const errors: string[] = [];
  for (const id of templateIds) {
    const result = await service.delete(id);
    if (!result.success) {
      errors.push(result.error?.message ?? `Failed to delete ${id}`);
    }
  }

  revalidatePath("/templates");
  return { success: errors.length === 0, errors, deletedCount: templateIds.length - errors.length };
}

export async function bulkChangeVisibility(templateIds: string[], visibility: Visibility) {
  const { isAuthenticated, pb } = await getServerAuth();
  if (!isAuthenticated) return { success: false, error: "Not authenticated" };

  const service = new TemplateService(pb);
  const errors: string[] = [];
  for (const id of templateIds) {
    const result = await service.update(id, { visibility });
    if (!result.success) {
      errors.push(result.error?.message ?? `Failed to update ${id}`);
    }
  }

  revalidatePath("/templates");
  return { success: errors.length === 0, errors };
}

export async function bulkExportTemplates(templateIds: string[]) {
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
