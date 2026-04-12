"use server";

import { revalidatePath } from "next/cache";
import { getServerAuth } from "@/lib/server-auth";
import { TemplateService } from "@/lib/services/template";
import { ChecklistService } from "@/lib/services/checklist";
import { Collections } from "@/lib/pocketbase-types";

interface ActionResult {
  success: boolean;
  error?: string;
}

interface BulkActionResult {
  success: boolean;
  movedCount: number;
  errors: string[];
}

/**
 * Move templates to a workspace
 */
export async function moveTemplatesToWorkspace(
  templateIds: string[],
  workspaceId: string
): Promise<BulkActionResult> {
  const { isAuthenticated, user, pb } = await getServerAuth();

  if (!isAuthenticated || !user) {
    return { success: false, movedCount: 0, errors: ["Not authenticated"] };
  }

  const errors: string[] = [];
  let movedCount = 0;

  for (const templateId of templateIds) {
    try {
      // Verify user owns the template
      const template = await pb.collection(Collections.TEMPLATES).getOne(templateId);
      if (template.owner !== user.id) {
        errors.push(`Template ${templateId}: Permission denied`);
        continue;
      }

      // Update the template's workspace
      await pb.collection(Collections.TEMPLATES).update(templateId, {
        workspace: workspaceId,
      });
      movedCount++;
    } catch (err) {
      errors.push(`Template ${templateId}: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }

  revalidatePath(`/workspaces/${workspaceId}`);
  revalidatePath("/templates");

  return {
    success: errors.length === 0,
    movedCount,
    errors,
  };
}

/**
 * Move checklists to a workspace
 */
export async function moveChecklistsToWorkspace(
  checklistIds: string[],
  workspaceId: string
): Promise<BulkActionResult> {
  const { isAuthenticated, user, pb } = await getServerAuth();

  if (!isAuthenticated || !user) {
    return { success: false, movedCount: 0, errors: ["Not authenticated"] };
  }

  const errors: string[] = [];
  let movedCount = 0;

  for (const checklistId of checklistIds) {
    try {
      // Verify user owns the checklist
      const checklist = await pb.collection(Collections.CHECKLISTS).getOne(checklistId);
      if (checklist.user !== user.id) {
        errors.push(`Checklist ${checklistId}: Permission denied`);
        continue;
      }

      // Update the checklist's workspace
      await pb.collection(Collections.CHECKLISTS).update(checklistId, {
        workspace: workspaceId,
      });
      movedCount++;
    } catch (err) {
      errors.push(`Checklist ${checklistId}: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }

  revalidatePath(`/workspaces/${workspaceId}`);
  revalidatePath("/checklists");

  return {
    success: errors.length === 0,
    movedCount,
    errors,
  };
}

/**
 * Create a checklist from a template in a specific workspace
 */
export async function createChecklistInWorkspace(
  templateId: string,
  name: string,
  workspaceId: string
): Promise<ActionResult & { checklistId?: string }> {
  const { isAuthenticated, pb } = await getServerAuth();

  if (!isAuthenticated) {
    return { success: false, error: "Not authenticated" };
  }

  const checklistService = new ChecklistService(pb);
  const result = await checklistService.create({
    templateId,
    name,
    workspaceId,
  });

  if (!result.success || !result.checklist) {
    return { success: false, error: result.error?.message || "Failed to create checklist" };
  }

  revalidatePath(`/workspaces/${workspaceId}`);
  revalidatePath("/checklists");

  return { success: true, checklistId: result.checklist.id };
}

/**
 * Get all templates owned by the user (for bulk add dialog)
 */
export async function getUserTemplates(): Promise<{
  success: boolean;
  templates: Array<{
    id: string;
    title: string;
    workspaceId: string | null;
    description: string | null;
  }>;
  error?: string;
}> {
  const { isAuthenticated, pb } = await getServerAuth();

  if (!isAuthenticated) {
    return { success: false, templates: [], error: "Not authenticated" };
  }

  const templateService = new TemplateService(pb);
  const result = await templateService.getByOwner({ limit: 500 });

  return {
    success: true,
    templates: result.items.map((t) => ({
      id: t.id,
      title: t.title,
      workspaceId: t.workspace,
      description: t.description,
    })),
  };
}

/**
 * Get all checklists owned by the user (for bulk add dialog)
 */
export async function getUserChecklists(): Promise<{
  success: boolean;
  checklists: Array<{
    id: string;
    name: string;
    workspaceId: string | null;
    templateTitle: string;
    progress: number;
  }>;
  error?: string;
}> {
  const { isAuthenticated, pb } = await getServerAuth();

  if (!isAuthenticated) {
    return { success: false, checklists: [], error: "Not authenticated" };
  }

  const checklistService = new ChecklistService(pb);
  const result = await checklistService.getByUser({ expand: "blueprint" });

  return {
    success: true,
    checklists: result.map((c) => ({
      id: c.id,
      name: c.name,
      workspaceId: c.workspace,
      templateTitle: c.expand?.blueprint?.title ?? "Unknown Template",
      progress: c.progress ?? 0,
    })),
  };
}
