import { getServerAuth } from "@/lib/server-auth";
import { ChecklistService } from "@/lib/services/checklist";
import { TemplateService } from "@/lib/services/template";
import { WorkspaceService } from "@/lib/services/workspace";
import { CollaborationService } from "@/lib/services/collaboration";
import { ActivityService } from "@/lib/services/activity";
import { Collections } from "@/lib/pocketbase-types";
import type { Checklist, ChecklistItem, Template } from "@/lib/pocketbase-types";
import { ReportsView } from "./reports-view";
import { getWorkspaceChecklists } from "./reports-data";

type RangeValue = "7" | "30" | "all";

interface PageProps {
  searchParams: Promise<{ range?: string }>;
}

export interface PersonalReportData {
  activeChecklists: number;
  completedChecklists: number;
  completedDelta: number | null;
  avgProgress: number;
  tasksCompleted: number;
  completionTrend: { date: string; count: number }[];
  highlights: { type: "completed" | "started" | "created"; title: string; timestamp: string }[];
}

export interface TemplateReportData {
  totalTemplates: number;
  visibilityBreakdown: { public: number; shared: number; private: number };
  totalUses: number;
  avgRating: number;
  templatePerformance: {
    id: string;
    title: string;
    visibility: string;
    uses: number;
    rating: number;
    completionRate: number;
  }[];
}

export interface WorkspaceReportData {
  totalWorkspaces: number;
  totalChecklists: number;
  avgProgress: number;
  totalCollaborators: number;
  mostActiveWorkspace: string;
  workspaceBreakdown: {
    id: string;
    name: string;
    checklistCount: number;
    collaboratorCount: number;
    avgProgress: number;
  }[];
}

function getDateRange(range: number | null): Date | null {
  if (!range) return null;
  const date = new Date();
  date.setDate(date.getDate() - range);
  return date;
}

function formatDateKey(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toISOString().split("T")[0] ?? "";
}

export default async function ReportsPage({ searchParams }: PageProps) {
  const { range: rawRange } = await searchParams;
  const range: RangeValue = rawRange === "7" || rawRange === "all" ? rawRange : "30";
  const rangeDays = range === "all" ? null : parseInt(range);

  const { isAuthenticated, user, pb } = await getServerAuth();

  const emptyPersonal: PersonalReportData = {
    activeChecklists: 0,
    completedChecklists: 0,
    completedDelta: null,
    avgProgress: 0,
    tasksCompleted: 0,
    completionTrend: [],
    highlights: [],
  };

  const emptyTemplates: TemplateReportData = {
    totalTemplates: 0,
    visibilityBreakdown: { public: 0, shared: 0, private: 0 },
    totalUses: 0,
    avgRating: 0,
    templatePerformance: [],
  };

  const emptyWorkspaces: WorkspaceReportData = {
    totalWorkspaces: 0,
    totalChecklists: 0,
    avgProgress: 0,
    totalCollaborators: 0,
    mostActiveWorkspace: "",
    workspaceBreakdown: [],
  };

  if (!isAuthenticated || !user) {
    return (
      <ReportsView
        personal={emptyPersonal}
        templates={emptyTemplates}
        workspaces={emptyWorkspaces}
        range={range}
      />
    );
  }

  // Initialize services
  const checklistService = new ChecklistService(pb);
  const templateService = new TemplateService(pb);
  const workspaceService = new WorkspaceService(pb);
  const collaborationService = new CollaborationService(pb);
  const activityService = new ActivityService(pb);

  // ── Personal Tab Data ──
  const personal: PersonalReportData = { ...emptyPersonal };
  try {
    const checklists = await checklistService.getByUser({
      sort: "-updated",
    });

    const active = checklists.filter((c) => (c.progress ?? 0) < 100);
    const completed = checklists.filter((c) => (c.progress ?? 0) >= 100);

    personal.activeChecklists = active.length;
    personal.completedChecklists = completed.length;

    // Avg progress across active
    if (active.length > 0) {
      personal.avgProgress =
        active.reduce((sum, c) => sum + (c.progress ?? 0), 0) / active.length;
    }

    // Tasks completed count
    const allItems = await pb
      .collection(Collections.CHECKLIST_ITEMS)
      .getList<ChecklistItem>(1, 1, {
        filter: `instance.user = "${user.id}" && isCompleted = true`,
      });
    personal.tasksCompleted = allItems.totalItems;

    // Completion trend — group completed checklist items by day (use 30 days for "all")
    const trendDays = rangeDays ?? 30;
    const rangeStart = getDateRange(trendDays);
    if (rangeStart) {
      const recentItems = await pb
        .collection(Collections.CHECKLIST_ITEMS)
        .getFullList<ChecklistItem>({
          filter: `instance.user = "${user.id}" && isCompleted = true && completedAt >= "${rangeStart.toISOString()}"`,
          fields: "id,completedAt",
          sort: "completedAt",
        });

      const trendMap = new Map<string, number>();
      for (const item of recentItems) {
        if (item.completedAt) {
          const key = formatDateKey(item.completedAt);
          trendMap.set(key, (trendMap.get(key) ?? 0) + 1);
        }
      }

      // Fill in missing days
      const now = new Date();
      for (let d = new Date(rangeStart); d <= now; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().split("T")[0] ?? "";
        if (!trendMap.has(key)) {
          trendMap.set(key, 0);
        }
      }

      personal.completionTrend = Array.from(trendMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({ date, count }));

      // Delta: completed in current range vs previous range (omit for "all")
      if (rangeDays) {
        const currentStart = getDateRange(rangeDays)!;
        const previousStart = getDateRange(rangeDays * 2)!;
        const recentCompleted = completed.filter(
          (c) => c.completedAt && new Date(c.completedAt) >= currentStart
        ).length;
        const previousCompleted = completed.filter(
          (c) =>
            c.completedAt &&
            new Date(c.completedAt) >= previousStart &&
            new Date(c.completedAt) < currentStart
        ).length;
        personal.completedDelta = recentCompleted - previousCompleted;
      }
    }

    // Highlights — recent notable activities
    const activityResult = await activityService.getActivityByUser(user.id, {
      perPage: 5,
    });
    if (activityResult.success) {
      personal.highlights = activityResult.data.activityLogs.map((log) => {
        let type: "completed" | "started" | "created" = "created";
        if (log.action === "complete") type = "completed";
        else if (log.action === "create") type = "created";

        const title =
          (log.metadata as Record<string, unknown>)?.blueprintTitle as string ||
          (log.metadata as Record<string, unknown>)?.title as string ||
          log.resourceType;

        return { type, title, timestamp: log.created };
      });
    }
  } catch (error) {
    console.error("Reports: personal data fetch error:", error);
  }

  // ── Templates Tab Data ──
  const templates: TemplateReportData = { ...emptyTemplates };
  try {
    const templatesResult = await templateService.getByOwner({ limit: 100 });
    const allTemplates = templatesResult.items;

    templates.totalTemplates = templatesResult.totalItems;

    // Visibility breakdown
    for (const t of allTemplates) {
      if (t.visibility === "public") templates.visibilityBreakdown.public++;
      else if (t.visibility === "shared") templates.visibilityBreakdown.shared++;
      else templates.visibilityBreakdown.private++;
    }

    // Total uses and avg rating
    let totalRatingSum = 0;
    let totalRatingCount = 0;
    templates.totalUses = 0;

    for (const t of allTemplates) {
      templates.totalUses += t.instanceCount ?? 0;
      totalRatingSum += t.ratingSum ?? 0;
      totalRatingCount += t.ratingCount ?? 0;
    }

    templates.avgRating = totalRatingCount > 0 ? totalRatingSum / totalRatingCount : 0;

    // Per-template performance
    templates.templatePerformance = await Promise.all(
      allTemplates.map(async (t) => {
        // Get completion rate for this template's instances
        let completionRate = 0;
        try {
          const instances = await pb
            .collection(Collections.CHECKLISTS)
            .getList<Checklist>(1, 1, {
              filter: `blueprint = "${t.id}"`,
            });
          const totalInstances = instances.totalItems;

          if (totalInstances > 0) {
            const completedInstances = await pb
              .collection(Collections.CHECKLISTS)
              .getList<Checklist>(1, 1, {
                filter: `blueprint = "${t.id}" && completedAt != null`,
              });
            completionRate = Math.round(
              (completedInstances.totalItems / totalInstances) * 100
            );
          }
        } catch {
          // ignore
        }

        const rating =
          (t.ratingCount ?? 0) > 0
            ? (t.ratingSum ?? 0) / (t.ratingCount ?? 0)
            : 0;

        return {
          id: t.id,
          title: t.title,
          visibility: t.visibility,
          uses: t.instanceCount ?? 0,
          rating: Math.round(rating * 10) / 10,
          completionRate,
        };
      })
    );

    // Sort by usage descending
    templates.templatePerformance.sort((a, b) => b.uses - a.uses);
  } catch (error) {
    console.error("Reports: templates data fetch error:", error);
  }

  // ── Workspaces Tab Data ──
  const workspaces: WorkspaceReportData = { ...emptyWorkspaces };
  try {
    const workspacesResult = await workspaceService.getByOwner({ limit: 100 });
    const allWorkspaces = workspacesResult.items;

    workspaces.totalWorkspaces = workspacesResult.totalItems;

    // Gather per-workspace stats
    const breakdowns: WorkspaceReportData["workspaceBreakdown"] = [];
    let maxChecklists = 0;
    let mostActiveName = "";
    const collaboratorSet = new Set<string>();

    for (const ws of allWorkspaces) {
      // Get checklists for this workspace
      const wsChecklists = await getWorkspaceChecklists(pb, user.id, ws.id);

      const checklistCount = wsChecklists.length;
      const avgProg =
        checklistCount > 0
          ? wsChecklists.reduce((s, c) => s + (c.progress ?? 0), 0) / checklistCount
          : 0;

      workspaces.totalChecklists += checklistCount;

      if (checklistCount > maxChecklists) {
        maxChecklists = checklistCount;
        mostActiveName = ws.name;
      }

      // Get collaborators for templates in this workspace
      const wsCollaboratorSet = new Set<string>();
      try {
        const wsTemplates = await pb
          .collection(Collections.TEMPLATES)
          .getFullList<Template>({
            filter: `workspace = "${ws.id}" && owner = "${user.id}"`,
            fields: "id",
          });

        for (const t of wsTemplates) {
          const collabResult = await collaborationService.getCollaborators(t.id, {
            acceptedOnly: true,
          });
          if (collabResult.success) {
            for (const c of collabResult.data) {
              collaboratorSet.add(c.user);
              wsCollaboratorSet.add(c.user);
            }
          }
        }
      } catch {
        // ignore
      }
      const collaboratorCount = wsCollaboratorSet.size;

      breakdowns.push({
        id: ws.id,
        name: ws.name,
        checklistCount,
        collaboratorCount,
        avgProgress: Math.round(avgProg),
      });
    }

    workspaces.mostActiveWorkspace = mostActiveName;
    workspaces.totalCollaborators = collaboratorSet.size;

    if (workspaces.totalChecklists > 0) {
      const totalProg = breakdowns.reduce(
        (s, b) => s + b.avgProgress * b.checklistCount,
        0
      );
      workspaces.avgProgress = Math.round(totalProg / workspaces.totalChecklists);
    }

    // Sort by checklist count descending
    breakdowns.sort((a, b) => b.checklistCount - a.checklistCount);
    workspaces.workspaceBreakdown = breakdowns;
  } catch (error) {
    console.error("Reports: workspaces data fetch error:", error);
  }

  return (
    <ReportsView
      personal={personal}
      templates={templates}
      workspaces={workspaces}
      range={range}
    />
  );
}
