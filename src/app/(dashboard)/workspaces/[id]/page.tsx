import { notFound } from "next/navigation";
import { getServerAuth } from "@/lib/server-auth";
import { WorkspaceService } from "@/lib/services/workspace";
import { ChecklistService } from "@/lib/services/checklist";
import { TemplateService } from "@/lib/services/template";
import { WorkspaceDetailClient } from "./workspace-detail-client";
import type { ChecklistCardData } from "@/components/checklists/checklist-card";

/**
 * Workspace Detail Page - Server Component
 *
 * Displays a single workspace with its checklists and management capabilities.
 *
 * Requirements: 9.1, 9.5 - Workspace CRUD operations
 */

interface WorkspaceDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function WorkspaceDetailPage({
  params,
}: WorkspaceDetailPageProps) {
  const { id } = await params;
  const { isAuthenticated, user, pb } = await getServerAuth();

  if (!isAuthenticated || !user) {
    notFound();
  }

  // Initialize services with the authenticated PocketBase client
  const workspaceService = new WorkspaceService(pb);
  const checklistService = new ChecklistService(pb);
  const templateService = new TemplateService(pb);

  // Get the workspace
  const workspaceResult = await workspaceService.getById(id);

  if (!workspaceResult.success) {
    notFound();
  }

  const workspace = workspaceResult.data;

  // Verify user owns this workspace
  if (workspace.owner !== user.id) {
    notFound();
  }

  // Get checklists for this workspace
  const checklists = await checklistService.getByWorkspace(id, {
    expand: 'blueprint',
    sort: '-created',
  });

  // Get templates for this workspace (for create checklist dialog)
  const templatesResult = await templateService.getByWorkspace(id, { limit: 100 });
  const workspaceTemplates = templatesResult.items.map((t) => ({
    id: t.id,
    title: t.title,
    workspaceId: t.workspace,
    description: t.description,
  }));

  // Transform checklists to ChecklistCardData format
  const checklistData: ChecklistCardData[] = checklists.map((checklist) => ({
    id: checklist.id,
    name: checklist.name,
    templateId: checklist.blueprint,
    templateTitle: checklist.expand?.blueprint?.title ?? 'Unknown Template',
    progress: checklist.progress ?? 0,
    isSynced: checklist.isSynced ?? true,
    completedAt: checklist.completedAt ?? null,
    createdAt: checklist.created,
    updatedAt: checklist.updated,
  }));

  return (
    <WorkspaceDetailClient
      workspace={{
        id: workspace.id,
        name: workspace.name,
        description: workspace.description ?? null,
        isArchived: workspace.isArchived ?? false,
        createdAt: workspace.created,
        updatedAt: workspace.updated,
      }}
      checklists={checklistData}
      workspaceTemplates={workspaceTemplates}
    />
  );
}
