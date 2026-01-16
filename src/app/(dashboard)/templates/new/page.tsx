/**
 * New Template Page
 *
 * Allows users to create a new template.
 * Server Component that handles authentication and workspace selection.
 *
 * Requirements: 3.1 - Template creation
 */

import { getServerAuth } from "@/lib/server-auth";
import { WorkspaceService } from "@/lib/services/workspace";
import { NewTemplateForm } from "@/components/templates/new-template-form";
import { PageHeader } from "@/components/ui/page-header";
import { ArrowLeft, FilePlus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

interface NewTemplatePageProps {
  searchParams: Promise<{ workspace?: string }>;
}

export default async function NewTemplatePage({ searchParams }: NewTemplatePageProps) {
  const { isAuthenticated, user, pb } = await getServerAuth();
  const params = await searchParams;

  if (!isAuthenticated || !user) {
    redirect("/signin?redirect=/templates/new");
  }

  // Get user's workspaces
  const workspaceService = new WorkspaceService(pb);
  const workspacesResult = await workspaceService.getByOwner({ limit: 100 });
  const workspaces = workspacesResult.items.map((ws) => ({
    id: ws.id,
    name: ws.name,
  }));

  // If no workspaces, redirect to create one
  if (workspaces.length === 0) {
    redirect("/workspaces?create=true");
  }

  // Use workspace from query param if valid, otherwise use first workspace
  const defaultWorkspaceId = params.workspace && workspaces.some(ws => ws.id === params.workspace)
    ? params.workspace
    : workspaces[0]?.id;

  // Determine back link based on where user came from
  const backHref = params.workspace ? `/workspaces/${params.workspace}` : "/templates";
  const backLabel = params.workspace ? "Back to Workspace" : "Back to Templates";

  return (
    <div className="w-full space-y-6">
      {/* Back button */}
      <div>
        <Link href={backHref} className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group">
          <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          {backLabel}
        </Link>
      </div>

      {/* Page Header - Using consistent PageHeader component */}
      <PageHeader
        title="Create Template"
        description="Create a new checklist template to organize your tasks."
        icon={<FilePlus className="h-6 w-6" />}
        gradient
      />

      {/* New Template Form */}
      <NewTemplateForm workspaces={workspaces} defaultWorkspaceId={defaultWorkspaceId} />
    </div>
  );
}
