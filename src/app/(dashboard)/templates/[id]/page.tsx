/**
 * Template Detail/Editor Page
 *
 * Displays and allows editing of a template with its steps.
 * Server Component that fetches data and renders the TemplateEditor.
 *
 * Requirements: 3.1, 3.5, 3.6 - Template editing with drag-and-drop
 */

import { getServerAuth } from "@/lib/server-auth";
import { TemplateService } from "@/lib/services/template";
import { ItemService } from "@/lib/services/item";
import { CollaborationService } from "@/lib/services/collaboration";
import { PreferencesService } from "@/lib/services/preferences";
import { TemplateEditor } from "@/components/templates/template-editor";
import { notFound } from "next/navigation";
import { Visibility, PermissionLevel } from "@/lib/pocketbase-types";
import type { Item, LLMSettings } from "@/lib/pocketbase-types";

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Format items for the editor as steps
 */
function formatStepsForEditor(items: Item[]) {
  return items.map((item) => ({
    id: item.id,
    templateId: item.blueprint,
    parentId: item.parent,
    path: item.path,
    itemType: item.itemType as "task" | "reference" | "phase",
    content: item.content,
    description: item.description,
    resources: item.resources,
    referenceId: item.reference,
    position: item.position,
    metadata: item.metadata,
    createdAt: item.created,
    updatedAt: item.updated,
  }));
}

export default async function TemplateDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { isAuthenticated, user, pb } = await getServerAuth();

  // Initialize services
  const templateService = new TemplateService(pb);
  const itemService = new ItemService(pb);
  const collaborationService = new CollaborationService(pb);
  const preferencesService = new PreferencesService(pb);

  // Get the template
  const result = await templateService.getById(id);

  if (!result.success || !result.template) {
    notFound();
  }

  const template = result.template;

  // Check access based on visibility
  let canEdit = false;
  let canView = false;

  if (template.visibility === Visibility.PUBLIC) {
    canView = true;
    // Check if user is owner for edit permission
    if (isAuthenticated && user && template.owner === user.id) {
      canEdit = true;
    }
  } else if (template.visibility === Visibility.PRIVATE) {
    if (!isAuthenticated || !user || template.owner !== user.id) {
      notFound();
    }
    canView = true;
    canEdit = true;
  } else if (template.visibility === Visibility.SHARED) {
    if (!isAuthenticated || !user) {
      notFound();
    }

    const isOwner = template.owner === user.id;
    if (isOwner) {
      canView = true;
      canEdit = true;
    } else {
      const hasViewAccess = await collaborationService.hasPermission(
        id,
        user.id,
        PermissionLevel.VIEWER
      );
      if (!hasViewAccess) {
        notFound();
      }
      canView = true;
      canEdit = await collaborationService.hasPermission(
        id,
        user.id,
        PermissionLevel.EDITOR
      );
    }
  }

  if (!canView) {
    notFound();
  }

  // Get items for the template (displayed as steps in UI)
  const items = await itemService.getByBlueprint(id);
  const formattedSteps = formatStepsForEditor(items);

  // Get user preferences for LLM settings
  let llmSettings: LLMSettings | null = null;
  if (isAuthenticated) {
    const prefsResult = await preferencesService.getPreferences();
    if (prefsResult.success && prefsResult.preferences?.llmSettings) {
      llmSettings = prefsResult.preferences.llmSettings;
    }
  }

  return (
    <div className="space-y-6">


      {/* Template Editor */}
      <TemplateEditor
        template={{
          id: template.id,
          workspaceId: template.workspace,
          ownerId: template.owner,
          title: template.title,
          description: template.description,
          visibility: template.visibility,
          category: template.category,
          tags: template.tags,
          version: template.version,
          instanceCount: template.instanceCount,
          questions: template.questions ?? null,
          resources: template.resources ?? null,
          createdAt: template.created,
          updatedAt: template.updated,
        }}
        steps={formattedSteps}
        canEdit={canEdit}
        llmSettings={llmSettings}
      />
    </div>
  );
}
