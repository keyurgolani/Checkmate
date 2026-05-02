import { notFound } from "next/navigation";
import { getServerAuth } from "@/lib/server-auth";
import { ChecklistService } from "@/lib/services/checklist";
import { TemplateService } from "@/lib/services/template";
import { ChecklistDetailClient } from "./checklist-detail-client";

/**
 * Checklist Detail Page - Server Component
 *
 * Displays a single checklist with items for tracking completion.
 * Uses the ChecklistTracker component for displaying items with checkboxes.
 *
 * Requirements: 6.1, 7.1
 */

interface ChecklistDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ChecklistDetailPage({
  params,
}: ChecklistDetailPageProps) {
  const { id } = await params;
  const { isAuthenticated, user, pb } = await getServerAuth();

  if (!isAuthenticated || !user) {
    notFound();
  }

  // Initialize services with the authenticated PocketBase client
  const checklistService = new ChecklistService(pb);
  const templateService = new TemplateService(pb);

  // Get the checklist
  const checklistResult = await checklistService.getById(id, "blueprint");

  if (!checklistResult.success || !checklistResult.data) {
    notFound();
  }

  const checklist = checklistResult.data;

  // Verify user owns this checklist
  if (checklist.user !== user.id) {
    notFound();
  }

  // Get blueprint title
  let blueprintTitle = "Unknown Template";
  const expandedBlueprint = checklist.expand?.blueprint;
  
  if (expandedBlueprint) {
    blueprintTitle = expandedBlueprint.title;
  } else {
    const blueprintId = checklist.blueprint;
    const templateResult = await templateService.getById(blueprintId);
    if (templateResult.success && templateResult.data) {
      blueprintTitle = templateResult.data.title;
    }
  }

  // Get tasks
  const tasks = await checklistService.getTasks(id, {
    sort: "path,position",
  });

  // Transform tasks to the format expected by ChecklistTracker
  const trackerTasks = tasks.map((task) => ({
    id: task.id,
    checklistId: task.instance,
    sourceItemId: task.sourceItem,
    parentId: task.parent,
    path: task.path,
    content: task.content,
    description: task.description,
    resources: task.resources,
    isCompleted: task.isCompleted,
    completedAt: task.completedAt,
    isCustom: task.isCustom,
    position: task.position,
    itemType: task.itemType as "task" | "reference" | "phase" | undefined,
  }));

  // Calculate progress
  const progress = await checklistService.calculateProgress(id);

  return (
    <ChecklistDetailClient
      checklist={{
        id: checklist.id,
        name: checklist.name,
        blueprintId: checklist.blueprint,
        blueprintTitle,
        progress: progress.percentage,
        totalItems: progress.totalItems,
        completedItems: progress.completedItems,
        isSynced: checklist.isSynced,
        completedAt: checklist.completedAt,
        createdAt: checklist.created,
        updatedAt: checklist.updated,
        description: checklist.description,
        resources: checklist.resources,
      }}
      tasks={trackerTasks}
    />
  );
}
