"use server";

import { revalidatePath } from "next/cache";
import { getServerAuth } from "@/lib/server-auth";
import { ChecklistService } from "@/lib/services/checklist";

export async function deleteChecklist(checklistId: string) {
  const { isAuthenticated, pb } = await getServerAuth();
  if (!isAuthenticated) return { success: false, error: "Not authenticated" };

  const service = new ChecklistService(pb);
  const result = await service.delete(checklistId);

  revalidatePath("/checklists");
  return { success: result.success, error: result.error?.message };
}

export async function bulkDeleteChecklists(checklistIds: string[]) {
  const { isAuthenticated, pb } = await getServerAuth();
  if (!isAuthenticated) return { success: false, error: "Not authenticated" };

  const service = new ChecklistService(pb);
  const errors: string[] = [];
  for (const id of checklistIds) {
    const result = await service.delete(id);
    if (!result.success) {
      errors.push(result.error?.message ?? `Failed to delete ${id}`);
    }
  }

  revalidatePath("/checklists");
  return { success: errors.length === 0, errors, deletedCount: checklistIds.length - errors.length };
}

export async function bulkSyncChecklists(checklistIds: string[]) {
  const { isAuthenticated, pb } = await getServerAuth();
  if (!isAuthenticated) return { success: false, error: "Not authenticated" };

  const service = new ChecklistService(pb);
  const errors: string[] = [];
  for (const id of checklistIds) {
    const result = await service.syncWithTemplate(id);
    if (!result.success) {
      errors.push(result.error?.message ?? `Failed to sync ${id}`);
    }
  }

  revalidatePath("/checklists");
  return { success: errors.length === 0, errors };
}
