"use server";

import { revalidatePath } from "next/cache";
import { getServerAuth } from "@/lib/server-auth";
import { ChecklistService } from "@/lib/services/checklist";
import { Collections } from "@/lib/pocketbase-types";

/**
 * Toggle completion status for a single checklist task.
 */
export async function toggleChecklistTask(checklistId: string, taskId: string) {
  const { isAuthenticated, pb } = await getServerAuth();
  if (!isAuthenticated) return { success: false, error: "Not authenticated" };

  const service = new ChecklistService(pb);
  const result = await service.toggleTaskCompletion(checklistId, taskId);

  revalidatePath(`/checklists/${checklistId}`);
  return { success: result.success, error: result.error?.message ?? null };
}

/**
 * Bulk toggle completion status for multiple checklist tasks.
 * Toggles each task to the specified completed state.
 */
export async function bulkToggleChecklistTasks(
  checklistId: string,
  taskIds: string[],
  setCompleted: boolean
) {
  const { isAuthenticated, pb } = await getServerAuth();
  if (!isAuthenticated) return { success: false, error: "Not authenticated" };

  const errors: string[] = [];
  for (const taskId of taskIds) {
    try {
      // Get current state
      const task = await pb
        .collection(Collections.CHECKLIST_ITEMS)
        .getOne(taskId);

      // Only toggle if the current state differs from desired
      if (task.isCompleted !== setCompleted) {
        const service = new ChecklistService(pb);
        const result = await service.toggleTaskCompletion(checklistId, taskId);
        if (!result.success) {
          errors.push(result.error?.message ?? `Failed to toggle ${taskId}`);
        }
      }
    } catch (err) {
      errors.push(`Failed to toggle ${taskId}`);
    }
  }

  revalidatePath(`/checklists/${checklistId}`);
  return {
    success: errors.length === 0,
    errors,
    toggledCount: taskIds.length - errors.length,
  };
}

/**
 * Delete a single checklist task item.
 */
export async function deleteChecklistTask(checklistId: string, taskId: string) {
  const { isAuthenticated, pb } = await getServerAuth();
  if (!isAuthenticated) return { success: false, error: "Not authenticated" };

  try {
    await pb.collection(Collections.CHECKLIST_ITEMS).delete(taskId);

    // Recalculate progress
    const service = new ChecklistService(pb);
    const progress = await service.calculateProgress(checklistId);
    await pb.collection(Collections.CHECKLISTS).update(checklistId, {
      progress: progress.percentage,
      completedAt: progress.percentage >= 100 ? new Date().toISOString() : null,
    });

    revalidatePath(`/checklists/${checklistId}`);
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: "Failed to delete task" };
  }
}

/**
 * Bulk delete multiple checklist task items.
 */
export async function bulkDeleteChecklistTasks(
  checklistId: string,
  taskIds: string[]
) {
  const { isAuthenticated, pb } = await getServerAuth();
  if (!isAuthenticated) return { success: false, error: "Not authenticated" };

  const errors: string[] = [];
  for (const taskId of taskIds) {
    try {
      await pb.collection(Collections.CHECKLIST_ITEMS).delete(taskId);
    } catch (err) {
      errors.push(`Failed to delete ${taskId}`);
    }
  }

  // Recalculate progress after all deletions
  const service = new ChecklistService(pb);
  const progress = await service.calculateProgress(checklistId);
  await pb.collection(Collections.CHECKLISTS).update(checklistId, {
    progress: progress.percentage,
    completedAt: progress.percentage >= 100 ? new Date().toISOString() : null,
  });

  revalidatePath(`/checklists/${checklistId}`);
  return {
    success: errors.length === 0,
    errors,
    deletedCount: taskIds.length - errors.length,
  };
}
