import { getServerAuth } from "@/lib/server-auth";
import { TemplateService } from "@/lib/services/template";
import { ItemService } from "@/lib/services/item";
import { createAdminClient } from "@/lib/pocketbase";
import { TemplatePrintView } from "@/components/print/template-print-view";
import { notFound } from "next/navigation";
import { Visibility } from "@/lib/pocketbase-types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DiscoverTemplatePrintPage({ params }: PageProps) {
  const { id } = await params;
  const { isAuthenticated, pb } = await getServerAuth();

  // Use admin client for unauthenticated users so public templates are accessible
  const effectivePb = isAuthenticated ? pb : await createAdminClient();
  const templateService = new TemplateService(effectivePb);

  const result = await templateService.getById(id);
  if (!result.success || !result.template) {
    notFound();
  }

  const template = result.template;

  // Only allow public templates for unauthenticated users
  if (!isAuthenticated && template.visibility !== Visibility.PUBLIC) {
    notFound();
  }

  const itemService = new ItemService(effectivePb);
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
