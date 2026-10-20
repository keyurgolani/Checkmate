import { notFound } from "next/navigation";
import { getServerAuth } from "@/lib/server-auth";
import { ChecklistService } from "@/lib/services/checklist";
import { TemplateService } from "@/lib/services/template";
import { ChecklistPrintView } from "@/components/print/checklist-print-view";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ChecklistPrintPage({ params }: PageProps) {
  const { id } = await params;
  const { isAuthenticated, user, pb } = await getServerAuth();

  if (!isAuthenticated || !user) {
    notFound();
  }

  const checklistService = new ChecklistService(pb);
  const templateService = new TemplateService(pb);

  const checklistResult = await checklistService.getById(id, "blueprint");
  if (!checklistResult.success) {
    notFound();
  }

  const checklist = checklistResult.data;
  if (checklist.user !== user.id) {
    notFound();
  }

  // Get blueprint title
  let blueprintTitle = "Unknown Template";
  const expandedBlueprint = checklist.expand?.blueprint;
  if (expandedBlueprint) {
    blueprintTitle = expandedBlueprint.title;
  } else {
    const templateResult = await templateService.getById(checklist.blueprint);
    if (templateResult.success && templateResult.data) {
      blueprintTitle = templateResult.data.title;
    }
  }

  const tasks = await checklistService.getTasks(id, { sort: "path,position" });
  const progress = await checklistService.calculateProgress(id);

  const printTasks = tasks.map((task) => ({
    id: task.id,
    parentId: task.parent,
    position: task.position,
    content: task.content,
    description: task.description,
    resources: task.resources,
    isCompleted: task.isCompleted,
    itemType: task.itemType as "task" | "reference" | "phase" | undefined,
  }));

  return (
    <ChecklistPrintView
      checklist={{
        id: checklist.id,
        name: checklist.name,
        blueprintTitle,
        completedItems: progress.completedItems,
        totalItems: progress.totalItems,
        createdAt: checklist.created,
        description: checklist.description,
        resources: checklist.resources,
      }}
      tasks={printTasks}
    />
  );
}
