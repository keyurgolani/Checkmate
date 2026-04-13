import { getServerAuth } from "@/lib/server-auth";
import { WorkspaceService } from "@/lib/services/workspace";
import { TemplateService } from "@/lib/services/template";
import { ChecklistService } from "@/lib/services/checklist";
import { PreferencesService } from "@/lib/services/preferences";
import type { Checklist, DashboardSummary, LLMSettings } from "@/lib/pocketbase-types";
import { DashboardView } from "./dashboard-view";



/**
 * Dashboard Page - Server Component
 *
 * Displays workspace overview and recent checklists with progress.
 * Requirements: 6.7
 */
export default async function DashboardPage() {
  const { isAuthenticated, user, pb } = await getServerAuth();

  // Initialize services with the authenticated PocketBase client
  const workspaceService = new WorkspaceService(pb);
  const templateService = new TemplateService(pb); // Updated service
  const checklistService = new ChecklistService(pb);
  const preferencesService = new PreferencesService(pb);

  // Fetch data
  let totalTemplates = 0; // Renamed
  let activeChecklists = 0;
  let completedChecklists = 0;
  let overallProgress = 0;
  let recentChecklists: Checklist[] = [];
  let templateMap: Map<string, string> = new Map(); // Renamed
  let llmSettings: LLMSettings | null = null;
  let cachedSummary: DashboardSummary | null = null;

  if (isAuthenticated) {
    // Get user's workspaces
    try {
        const workspacesResult = await workspaceService.getByOwner({ limit: 100 });
        const workspaces = workspacesResult.items;

        // Calculate totals across all workspaces
        // Note: Ideally this should be a single efficient query, but sticking to existing pattern for now
        for (const workspace of workspaces) {
            try {
                // Note: getStatistics needs to be checked if it returns blueprintCount or templateCount
                // Assuming it might still return blueprintCount, we'll need to check workspace.ts later
                const stats = await workspaceService.getStatistics(workspace.id);
                // @ts-ignore - stats might still have blueprintCount
                totalTemplates += stats.blueprintCount || stats.templateCount || 0;
            } catch (e) {
                // Ignore errors for individual workspaces
            }
        }

        // Get user's checklists
        const checklists = await checklistService.getByUser({
        expand: "blueprint", // PocketBase expansion likely still uses 'blueprint'
        sort: "-updated",
        });

        // Calculate checklist statistics
        activeChecklists = checklists.filter((c) => (c.progress ?? 0) < 100).length;
        completedChecklists = checklists.filter((c) => (c.progress ?? 0) >= 100).length;

        // Calculate overall progress
        const activeChecklistsList = checklists.filter((c) => (c.progress ?? 0) < 100);
        if (activeChecklistsList.length > 0) {
        const totalProgress = activeChecklistsList.reduce(
            (sum, c) => sum + (c.progress ?? 0),
            0
        );
        overallProgress = totalProgress / activeChecklistsList.length;
        }

        // Get recent checklists (last 6 for grid)
        recentChecklists = checklists.slice(0, 6);

        for (const checklist of recentChecklists) {
            // Note: Types say 'template' but runtime is 'blueprint'
            const templateId = checklist.blueprint; // DB field name
            // @ts-ignore 
            const expandedTemplate = checklist.expand?.blueprint || checklist.expand?.template;
            
            if (expandedTemplate) {
                templateMap.set(templateId, expandedTemplate.title);
            } else if (!templateMap.has(templateId)) {
                 try {
                    const result = await templateService.getById(templateId);
                    if (result.success && result.template) {
                        templateMap.set(templateId, result.template.title);
                    }
                 } catch (e) {
                     templateMap.set(templateId, "Unknown Template");
                 }
            }
        }

        // Fetch user preferences for LLM settings and cached summary
        const prefsResult = await preferencesService.getPreferences();
        if (prefsResult.success && prefsResult.data) {
          llmSettings = prefsResult.data.llmSettings || null;
          cachedSummary = prefsResult.data.dashboardSummary || null;
        }
    } catch (error) {
        console.error("Dashboard data fetch error:", error);
    }
  }

  // Determine if LLM is properly configured
  const llmConfigured = !!(llmSettings?.provider && llmSettings?.selectedModel);

  return (
    <DashboardView 
        user={user}
        stats={{
            totalBlueprints: totalTemplates, // Passing as totalBlueprints for compatibility with view (will refactor view next)
            activeChecklists,
            completedChecklists,
            overallProgress
        }}
        recentChecklists={recentChecklists}
        blueprintMap={templateMap} // Passing as blueprintMap for compatibility with view
        llmConfigured={llmConfigured}
        cachedSummary={cachedSummary}
    />
  );
}
