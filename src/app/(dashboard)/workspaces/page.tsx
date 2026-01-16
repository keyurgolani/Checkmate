/**
 * Workspaces Page
 *
 * Displays the user's workspaces with management capabilities.
 * Server Component that fetches data and renders workspace cards.
 *
 * Requirements: 9.1, 9.5 - Workspace CRUD operations
 */

import { getServerAuth } from "@/lib/server-auth";
import { WorkspaceService } from "@/lib/services/workspace";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { FolderKanban, LogIn } from "lucide-react";
import { WorkspaceList } from "./workspace-list";

function UnauthenticatedState() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Workspaces"
        description="Organize your checklists into workspaces."
        icon={<FolderKanban className="h-6 w-6" />}
        gradient
      />
      <EmptyState
        icon={<LogIn className="h-8 w-8" />}
        title="Sign in to view your workspaces"
        description="Create an account or sign in to start organizing your checklists."
        action={{ label: "Sign in", href: "/signin", icon: <LogIn className="h-4 w-4" /> }}
      />
    </div>
  );
}

export interface WorkspaceData {
  id: string;
  name: string;
  description: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export default async function WorkspacesPage({
  searchParams,
}: {
  searchParams: Promise<{ create?: string; archived?: string }>;
}) {
  const { isAuthenticated, pb } = await getServerAuth();
  const params = await searchParams;

  if (!isAuthenticated) {
    return <UnauthenticatedState />;
  }

  const workspaceService = new WorkspaceService(pb);
  const showArchived = params.archived === "true";

  const workspacesResult = showArchived
    ? await workspaceService.getArchived({ limit: 100 })
    : await workspaceService.getByOwner({ limit: 100 });

  const workspaces: WorkspaceData[] = workspacesResult.items.map((w) => ({
    id: w.id,
    name: w.name,
    description: w.description ?? null,
    isArchived: w.isArchived ?? false,
    createdAt: w.created,
    updatedAt: w.updated,
  }));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Workspaces"
        description="Organize your checklists into workspaces."
        icon={<FolderKanban className="h-6 w-6" />}
        gradient
      />
      <WorkspaceList 
        workspaces={workspaces} 
        showArchived={showArchived}
        openCreateDialog={params.create === "true"}
      />
    </div>
  );
}
