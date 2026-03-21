import { getServerAuth } from "@/lib/server-auth";
import { ChecklistService } from "@/lib/services/checklist";
import { TemplateService } from "@/lib/services"; // Updated import
import type { ChecklistCardData } from "@/components/checklists";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { ListChecks, Search, LogIn } from "lucide-react";
import Link from "next/link";
import { ChecklistListClient } from "./checklist-list-client";

/**
 * Checklists Page - Server Component
 *
 * Displays user's checklists with progress bars and completion status.
 * Supports filtering by status (all, active, completed) and grid/list view toggle.
 * Context menus and bulk actions are handled by the client wrapper.
 *
 * Requirements: 6.4, 6.7
 */
export default async function ChecklistsPage() {
  const { isAuthenticated, pb } = await getServerAuth();

  const checklistService = new ChecklistService(pb);
  const templateService = new TemplateService(pb); // Updated service

  let checklists: ChecklistCardData[] = [];

  if (isAuthenticated) {
    const rawChecklists = await checklistService.getByUser({
      expand: "blueprint", // DB expansion key
      sort: "-updated",
    });

    const templateTitleMap = new Map<string, string>();
    const templateIdsToFetch: string[] = [];

    for (const checklist of rawChecklists) {
      const templateId = checklist.blueprint; // DB field name
      // @ts-expect-error - Handle possible expansion naming differences
      const expandedTemplate = checklist.expand?.blueprint || checklist.expand?.template;

      if (expandedTemplate) {
        templateTitleMap.set(templateId, expandedTemplate.title);
      } else if (!templateTitleMap.has(templateId)) {
        templateIdsToFetch.push(templateId);
      }
    }

    for (const templateId of templateIdsToFetch) {
      const templateResult = await templateService.getById(templateId);
      if (templateResult.success && templateResult.template) {
        templateTitleMap.set(templateId, templateResult.template.title);
      }
    }

    checklists = rawChecklists.map((checklist) => ({
      id: checklist.id,
      name: checklist.name,
      templateId: checklist.blueprint, // checklist.blueprint is the ID
      templateTitle: templateTitleMap.get(checklist.blueprint) ?? "Unknown Template",
      progress: checklist.progress ?? 0,
      isSynced: checklist.isSynced,
      completedAt: checklist.completedAt,
      createdAt: checklist.created,
      updatedAt: checklist.updated,
    }));
  }

  if (!isAuthenticated) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Checklists"
          description="Track your progress on checklists."
          icon={<ListChecks className="h-6 w-6" />}
          gradient
        />
        <EmptyState
          icon={<LogIn className="h-8 w-8" />}
          title="Sign in to see your checklists"
          description="Create an account or sign in to start tracking your checklists."
          action={{ label: "Sign in", href: "/signin", icon: <LogIn className="h-4 w-4" /> }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Checklists"
        description="Track your progress on checklists."
        icon={<ListChecks className="h-6 w-6" />}
        gradient
      >
        {checklists.length > 0 && (
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/discover" className="gap-2">
              <Search className="h-4 w-4" />
              Create new
            </Link>
          </Button>
        )}
      </PageHeader>

      <ChecklistListClient checklists={checklists} />
    </div>
  );
}
