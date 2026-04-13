import { getServerAuth } from "@/lib/server-auth";
import { TemplateService } from "@/lib/services/template";
import { ItemService } from "@/lib/services/item";
import { CollaborationService } from "@/lib/services/collaboration";
import { TemplatePrintView } from "@/components/print/template-print-view";
import { notFound } from "next/navigation";
import { Visibility, PermissionLevel } from "@/lib/pocketbase-types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TemplatePrintPage({ params }: PageProps) {
  const { id } = await params;
  const { isAuthenticated, user, pb } = await getServerAuth();

  const templateService = new TemplateService(pb);
  const itemService = new ItemService(pb);

  const result = await templateService.getById(id);
  if (!result.success || !result.data) {
    notFound();
  }

  const template = result.data;

  // Check access — same logic as the main template page
  if (template.visibility === Visibility.PUBLIC) {
    // Public templates are viewable by anyone
  } else if (template.visibility === Visibility.PRIVATE) {
    if (!isAuthenticated || !user || template.owner !== user.id) {
      notFound();
    }
  } else if (template.visibility === Visibility.SHARED) {
    if (!isAuthenticated || !user) {
      notFound();
    }
    if (template.owner !== user.id) {
      const collaborationService = new CollaborationService(pb);
      const hasAccess = await collaborationService.hasPermission(id, user.id, PermissionLevel.VIEWER);
      if (!hasAccess) {
        notFound();
      }
    }
  }

  const items = await itemService.getByBlueprint(id);
  const steps = items.map((item) => ({
    id: item.id,
    parentId: item.parent,
    position: item.position,
    itemType: item.itemType as "task" | "reference" | "phase",
    content: item.content,
    description: item.description,
    resources: item.resources,
    metadata: item.metadata,
  }));

  return (
    <TemplatePrintView
      template={{
        id: template.id,
        title: template.title,
        description: template.description,
        resources: template.resources ?? null,
        questions: template.questions ?? null,
        updatedAt: template.updated,
      }}
      steps={steps}
    />
  );
}
