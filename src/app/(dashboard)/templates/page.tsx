/**
 * Templates Page
 *
 * Displays the user's templates in a grid/list view with visibility indicators.
 * Server Component that fetches data and renders the TemplateList.
 *
 * Requirements: 4.7 - Display templates in grid/list format with visibility indicators
 * Requirements: 11.3 - Import templates from files
 */

import { getServerAuth } from "@/lib/server-auth";
import { TemplateService } from "@/lib/services/template";
import { WorkspaceService } from "@/lib/services/workspace";
import { TemplateList, TemplatesPageHeader, type TemplateCardData } from "@/components/templates";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { FileText, LogIn } from "lucide-react";
import type { Visibility } from "@/lib/pocketbase-types";

function UnauthenticatedState() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Templates"
        description="Create and manage your checklist templates."
        icon={<FileText className="h-6 w-6" />}
      />
      <EmptyState
        icon={<LogIn className="h-8 w-8" />}
        title="Sign in to view your templates"
        description="Create an account or sign in to start creating and managing your checklist templates."
        action={{ label: "Sign in", href: "/signin", icon: <LogIn className="h-4 w-4" /> }}
      />
    </div>
  );
}

export default async function TemplatesPage() {
  const { isAuthenticated, pb } = await getServerAuth();

  if (!isAuthenticated) {
    return <UnauthenticatedState />;
  }

  const templateService = new TemplateService(pb);
  const workspaceService = new WorkspaceService(pb);

  const workspacesResult = await workspaceService.getByOwner({ limit: 100 });
  const workspaces = workspacesResult.items;

  const allTemplates: TemplateCardData[] = [];

  for (const workspace of workspaces) {
    const templatesResult = await templateService.getByWorkspace(workspace.id, {
      limit: 100,
      sortBy: "date",
    });

    for (const template of templatesResult.items) {
      allTemplates.push({
        id: template.id,
        title: template.title,
        description: template.description,
        visibility: template.visibility as Visibility,
        category: template.category,
        tags: template.tags,
        instanceCount: template.instanceCount,
        createdAt: template.created,
        updatedAt: template.updated,
      });
    }
  }

  allTemplates.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  const defaultWorkspaceId = workspaces[0]?.id || "";

  return (
    <div className="space-y-8">
      <TemplatesPageHeader defaultWorkspaceId={defaultWorkspaceId} />
      <TemplateList
        templates={allTemplates}
        emptyMessage="No templates yet"
        emptyDescription="Create your first template to get started organizing your tasks!"
        showCreateButton={true}
        createHref="/templates/new"
      />
    </div>
  );
}
