"use server";

import { revalidatePath } from "next/cache";
import { getServerAuth } from "@/lib/server-auth";
import { WorkspaceService } from "@/lib/services/workspace";

interface CreateWorkspaceInput {
  name: string;
  description?: string;
}

interface WorkspaceActionResult {
  success: boolean;
  error?: string;
  workspaceId?: string;
}

export async function createWorkspace(input: CreateWorkspaceInput): Promise<WorkspaceActionResult> {
  const { isAuthenticated, pb } = await getServerAuth();
  
  if (!isAuthenticated) {
    return { success: false, error: "Not authenticated" };
  }

  const workspaceService = new WorkspaceService(pb);
  const result = await workspaceService.create({
    name: input.name,
    description: input.description,
  });

  if (!result.success || !result.workspace) {
    return { success: false, error: result.error?.message || "Failed to create workspace" };
  }

  revalidatePath("/workspaces");
  return { success: true, workspaceId: result.workspace.id };
}

export async function updateWorkspace(
  id: string, 
  input: { name?: string; description?: string }
): Promise<WorkspaceActionResult> {
  const { isAuthenticated, pb } = await getServerAuth();
  
  if (!isAuthenticated) {
    return { success: false, error: "Not authenticated" };
  }

  const workspaceService = new WorkspaceService(pb);
  const result = await workspaceService.update(id, input);

  if (!result.success) {
    return { success: false, error: result.error?.message || "Failed to update workspace" };
  }

  revalidatePath("/workspaces");
  return { success: true, workspaceId: id };
}

export async function archiveWorkspace(id: string): Promise<WorkspaceActionResult> {
  const { isAuthenticated, pb } = await getServerAuth();
  
  if (!isAuthenticated) {
    return { success: false, error: "Not authenticated" };
  }

  const workspaceService = new WorkspaceService(pb);
  const result = await workspaceService.archive(id);

  if (!result.success) {
    return { success: false, error: result.error?.message || "Failed to archive workspace" };
  }

  revalidatePath("/workspaces");
  return { success: true, workspaceId: id };
}

export async function unarchiveWorkspace(id: string): Promise<WorkspaceActionResult> {
  const { isAuthenticated, pb } = await getServerAuth();
  
  if (!isAuthenticated) {
    return { success: false, error: "Not authenticated" };
  }

  const workspaceService = new WorkspaceService(pb);
  const result = await workspaceService.unarchive(id);

  if (!result.success) {
    return { success: false, error: result.error?.message || "Failed to unarchive workspace" };
  }

  revalidatePath("/workspaces");
  return { success: true, workspaceId: id };
}

export async function deleteWorkspace(id: string): Promise<WorkspaceActionResult> {
  const { isAuthenticated, pb } = await getServerAuth();

  if (!isAuthenticated) {
    return { success: false, error: "Not authenticated" };
  }

  const workspaceService = new WorkspaceService(pb);
  const result = await workspaceService.delete(id);

  if (!result.success) {
    return { success: false, error: result.error?.message || "Failed to delete workspace" };
  }

  revalidatePath("/workspaces");
  return { success: true };
}

export async function bulkDeleteWorkspaces(workspaceIds: string[]) {
  const { isAuthenticated, pb } = await getServerAuth();
  if (!isAuthenticated) return { success: false, error: "Not authenticated" };

  const service = new WorkspaceService(pb);
  const errors: string[] = [];
  for (const id of workspaceIds) {
    const result = await service.delete(id);
    if (!result.success) {
      errors.push(result.error?.message ?? `Failed to delete ${id}`);
    }
  }

  revalidatePath("/workspaces");
  return { success: errors.length === 0, errors, deletedCount: workspaceIds.length - errors.length };
}

export async function bulkArchiveWorkspaces(workspaceIds: string[]) {
  const { isAuthenticated, pb } = await getServerAuth();
  if (!isAuthenticated) return { success: false, error: "Not authenticated" };

  const service = new WorkspaceService(pb);
  const errors: string[] = [];
  for (const id of workspaceIds) {
    const result = await service.archive(id);
    if (!result.success) {
      errors.push(result.error?.message ?? `Failed to archive ${id}`);
    }
  }

  revalidatePath("/workspaces");
  return { success: errors.length === 0, errors };
}

export async function bulkUnarchiveWorkspaces(workspaceIds: string[]) {
  const { isAuthenticated, pb } = await getServerAuth();
  if (!isAuthenticated) return { success: false, error: "Not authenticated" };

  const service = new WorkspaceService(pb);
  const errors: string[] = [];
  for (const id of workspaceIds) {
    const result = await service.unarchive(id);
    if (!result.success) {
      errors.push(result.error?.message ?? `Failed to unarchive ${id}`);
    }
  }

  revalidatePath("/workspaces");
  return { success: errors.length === 0, errors };
}
