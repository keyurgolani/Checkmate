"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  CheckCircle2,
  Clock,
  BarChart3,
  Star,
  Users,
  FolderKanban,
  ChevronsRight,
  Layout,
  Printer,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { FilterTabs } from "@/components/ui/filter-tabs";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import type {
  PersonalReportData,
  TemplateReportData,
  WorkspaceReportData,
} from "./page";

type ReportTab = "personal" | "templates" | "workspaces";
type RangeValue = "7" | "30" | "all";

const rangeLabels: Record<RangeValue, string> = {
  "7": "Last 7 days",
  "30": "Last 30 days",
  all: "All time",
};

interface ReportsViewProps {
  personal: PersonalReportData;
  templates: TemplateReportData;
  workspaces: WorkspaceReportData;
  range: RangeValue;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 },
};

// ── Stat Card ──

function StatCard({
  title,
  value,
  icon,
  color,
  subtitle,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}) {
  return (
    <motion.div
      variants={item}
      data-slot="card"
      className={cn(
        "card rounded-[var(--radius)] border-[length:var(--border-width,1px)] p-6 flex flex-col justify-between",
        color
      )}
    >
      <div className="flex justify-between items-start">
        <div className="p-3 bg-white/50 dark:bg-black/20 rounded-[var(--radius)] backdrop-blur-sm">
          {icon}
        </div>
      </div>
      <div className="mt-4">
        <div className="text-3xl md:text-4xl font-bold mb-1">{value}</div>
        <div className="text-sm font-medium opacity-80">{title}</div>
        {subtitle && (
          <div className="text-xs mt-1 opacity-60">{subtitle}</div>
        )}
      </div>
    </motion.div>
  );
}

// ── Bar Chart ──

function CompletionTrendChart({
  data,
}: {
  data: { date: string; count: number }[];
}) {
  // Show last 7 days
  const last7 = data.slice(-7);
  const maxCount = Math.max(...last7.map((d) => d.count), 1);
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <motion.div
      variants={item}
      data-slot="card"
      className="card col-span-1 sm:col-span-2 md:col-span-4 lg:col-span-6 rounded-[var(--radius)] border-[length:var(--border-width,1px)] bg-secondary/10 border-secondary/20 dark:border-secondary/30 p-6 md:p-8 relative overflow-hidden"
    >
      <div className="absolute top-6 right-8 opacity-10">
        <BarChart3 size={80} />
      </div>
      <div className="text-base md:text-lg font-bold mb-6">
        Completion Trend
      </div>
      <div className="flex items-end gap-2 sm:gap-3 h-28 md:h-36">
        {last7.map((d) => {
          const height = maxCount > 0 ? (d.count / maxCount) * 100 : 0;
          const dayOfWeek = new Date(d.date).getDay();
          return (
            <div
              key={d.date}
              className="flex-1 flex flex-col items-center gap-2"
            >
              <div className="w-full relative" style={{ height: "100%" }}>
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${height}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="absolute bottom-0 w-full bg-gradient-to-t from-secondary/40 to-secondary/20 rounded-t-md"
                />
              </div>
              <span className="text-[11px] text-muted-foreground">
                {dayNames[dayOfWeek]}
              </span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ── Personal Tab ──

function PersonalTab({ data }: { data: PersonalReportData }) {
  const completionRate =
    data.activeChecklists + data.completedChecklists > 0
      ? Math.round(
          (data.completedChecklists /
            (data.activeChecklists + data.completedChecklists)) *
            100
        )
      : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {/* Hero Card: Completion Rate */}
      <motion.div
        variants={item}
        className="col-span-1 sm:col-span-2 lg:col-span-3 row-span-2"
      >
        <div
          data-slot="card"
          className="card h-full rounded-[var(--radius)] bg-gradient-to-br from-primary/10 to-primary/5 border-[length:var(--border-width,1px)] border-primary/20 dark:border-primary/40 p-6 md:p-8 flex flex-col justify-between relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-6 md:p-8 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingUp size={100} />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold mb-2">
              Completion Rate
            </h2>
            <div className="text-5xl md:text-6xl font-black text-primary mb-1">
              {completionRate}%
            </div>
            <p className="text-muted-foreground text-sm md:text-base">
              of checklists completed
            </p>
          </div>
          <div className="w-full bg-primary/20 h-3 rounded-full overflow-hidden mt-6 md:mt-8">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${completionRate}%` }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="h-full bg-primary rounded-full relative overflow-hidden"
            >
              <div className="absolute inset-0 animate-progress-glow" />
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Completed */}
      <StatCard
        title="Completed"
        value={data.completedChecklists}
        icon={<CheckCircle2 className="text-primary" />}
        color="bg-primary/10 border-primary/20 dark:border-primary/30"
        subtitle={
          data.completedDelta !== null && data.completedDelta !== 0
            ? `${data.completedDelta > 0 ? "+" : ""}${data.completedDelta} vs prior period`
            : undefined
        }
      />

      {/* Active */}
      <StatCard
        title="Active Checklists"
        value={data.activeChecklists}
        icon={<Clock className="text-accent" />}
        color="bg-accent/10 border-accent/20 dark:border-accent/30"
      />

      {/* Tasks Completed */}
      <StatCard
        title="Tasks Done"
        value={data.tasksCompleted}
        icon={<CheckCircle2 className="text-secondary" />}
        color="bg-secondary/10 border-secondary/20 dark:border-secondary/30"
      />

      {/* Avg Progress */}
      <StatCard
        title="Avg. Progress"
        value={`${Math.round(data.avgProgress)}%`}
        icon={<TrendingUp className="text-accent" />}
        color="bg-accent/10 border-accent/20 dark:border-accent/30"
      />

      {/* Completion Trend */}
      {data.completionTrend.length > 0 && (
        <CompletionTrendChart data={data.completionTrend} />
      )}

      {/* Highlights */}
      {data.highlights.length > 0 && (
        <motion.div
          variants={item}
          data-slot="card"
          className="card col-span-1 sm:col-span-2 md:col-span-4 lg:col-span-6 rounded-[var(--radius)] border-[length:var(--border-width,1px)] bg-muted/5 border-border p-6 md:p-8"
        >
          <div className="flex justify-between items-center mb-5">
            <div className="text-base md:text-lg font-bold">
              Recent Highlights
            </div>
            <div className="text-sm text-muted-foreground">This week</div>
          </div>
          <div className="flex flex-col gap-3">
            {data.highlights.map((h, i) => {
              const colorMap = {
                completed:
                  "bg-green-500/5 border-green-500/15 text-green-500",
                started: "bg-blue-500/5 border-blue-500/15 text-blue-500",
                created:
                  "bg-violet-500/5 border-violet-500/15 text-violet-500",
              };
              const dotColor = {
                completed: "bg-green-500",
                started: "bg-blue-500",
                created: "bg-violet-500",
              };
              const labelMap = {
                completed: "Completed",
                started: "Started",
                created: "Created",
              };
              return (
                <div
                  key={i}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-[var(--radius)] border-[length:var(--border-width,1px)]",
                    colorMap[h.type]
                  )}
                >
                  <div
                    className={cn(
                      "w-2.5 h-2.5 rounded-full shrink-0",
                      dotColor[h.type]
                    )}
                  />
                  <span className="text-sm text-foreground flex-1">
                    {labelMap[h.type]}{" "}
                    <strong className={colorMap[h.type].split(" ").pop()}>
                      &quot;{h.title}&quot;
                    </strong>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(h.timestamp).toLocaleDateString()}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ── Templates Tab ──

function TemplatesTab({ data }: { data: TemplateReportData }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {/* Hero Card: Your Templates */}
      <motion.div
        variants={item}
        className="col-span-1 sm:col-span-2 lg:col-span-3 row-span-2"
      >
        <div
          data-slot="card"
          className="card h-full rounded-[var(--radius)] bg-gradient-to-br from-secondary/10 to-secondary/5 border-[length:var(--border-width,1px)] border-secondary/20 dark:border-secondary/40 p-6 md:p-8 flex flex-col justify-between relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-6 md:p-8 opacity-10 group-hover:opacity-20 transition-opacity">
            <Layout size={100} />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold mb-2">
              Your Templates
            </h2>
            <div className="text-5xl md:text-6xl font-black text-secondary mb-1">
              {data.totalTemplates}
            </div>
            <p className="text-muted-foreground text-sm md:text-base">
              templates created
            </p>
          </div>
          <div className="flex gap-6 mt-6">
            <div>
              <div className="text-2xl font-bold">
                {data.visibilityBreakdown.public}
              </div>
              <div className="text-xs text-muted-foreground">Public</div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {data.visibilityBreakdown.shared}
              </div>
              <div className="text-xs text-muted-foreground">Shared</div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {data.visibilityBreakdown.private}
              </div>
              <div className="text-xs text-muted-foreground">Private</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Total Uses */}
      <StatCard
        title="Total Uses"
        value={data.totalUses}
        icon={<Users className="text-primary" />}
        color="bg-primary/10 border-primary/20 dark:border-primary/30"
      />

      {/* Avg Rating */}
      <StatCard
        title="Avg. Rating"
        value={data.avgRating > 0 ? data.avgRating.toFixed(1) : "—"}
        icon={<Star className="text-accent fill-accent" />}
        color="bg-accent/10 border-accent/20 dark:border-accent/30"
      />

      {/* Template Performance Table */}
      {data.templatePerformance.length > 0 && (
        <motion.div
          variants={item}
          data-slot="card"
          className="card col-span-1 sm:col-span-2 md:col-span-4 lg:col-span-6 rounded-[var(--radius)] border-[length:var(--border-width,1px)] bg-muted/5 border-border p-6 md:p-8"
        >
          <div className="text-base md:text-lg font-bold mb-5">
            Template Performance
          </div>

          {/* Header */}
          <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr] gap-3 pb-3 border-b border-border/50 mb-1">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Template
            </div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground text-center">
              Uses
            </div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground text-center">
              Rating
            </div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground text-center">
              Completion Rate
            </div>
          </div>

          {/* Rows */}
          {data.templatePerformance.map((t) => (
            <div
              key={t.id}
              className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_1fr] gap-2 sm:gap-3 py-3 border-b border-border/30 items-center"
            >
              <div>
                <div className="font-semibold text-sm">{t.title}</div>
                <div className="text-xs text-muted-foreground capitalize">
                  {t.visibility}
                </div>
              </div>
              <div className="text-center font-semibold text-sm">{t.uses}</div>
              <div className="flex items-center justify-center gap-1">
                <Star className="w-3.5 h-3.5 fill-accent text-accent" />
                <span className="text-sm">
                  {t.rating > 0 ? t.rating : "—"}
                </span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      t.completionRate >= 70
                        ? "bg-green-500"
                        : t.completionRate >= 40
                          ? "bg-accent"
                          : "bg-muted-foreground"
                    )}
                    style={{ width: `${t.completionRate}%` }}
                  />
                </div>
                <span className="text-xs font-medium">{t.completionRate}%</span>
              </div>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

// ── Workspaces Tab ──

function WorkspacesTab({ data }: { data: WorkspaceReportData }) {
  const colors = [
    "bg-green-500/5 border-green-500/15",
    "bg-blue-500/5 border-blue-500/15",
    "bg-violet-500/5 border-violet-500/15",
    "bg-amber-500/5 border-amber-500/15",
    "bg-rose-500/5 border-rose-500/15",
  ];
  const progressColors = [
    "bg-green-500",
    "bg-blue-500",
    "bg-violet-500",
    "bg-amber-500",
    "bg-rose-500",
  ];
  const textColors = [
    "text-green-500",
    "text-blue-500",
    "text-violet-500",
    "text-amber-500",
    "text-rose-500",
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {/* Hero Card: Workspaces */}
      <motion.div
        variants={item}
        className="col-span-1 sm:col-span-2 lg:col-span-3 row-span-2"
      >
        <div
          data-slot="card"
          className="card h-full rounded-[var(--radius)] bg-gradient-to-br from-green-500/10 to-green-500/5 border-[length:var(--border-width,1px)] border-green-500/20 dark:border-green-500/40 p-6 md:p-8 flex flex-col justify-between relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-6 md:p-8 opacity-10 group-hover:opacity-20 transition-opacity">
            <FolderKanban size={100} />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold mb-2">Workspaces</h2>
            <div className="text-5xl md:text-6xl font-black text-green-500 mb-1">
              {data.totalWorkspaces}
            </div>
            <p className="text-muted-foreground text-sm md:text-base">
              active workspaces
            </p>
          </div>
          <div className="flex gap-6 mt-6">
            <div>
              <div className="text-2xl font-bold">{data.totalChecklists}</div>
              <div className="text-xs text-muted-foreground">Checklists</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{data.avgProgress}%</div>
              <div className="text-xs text-muted-foreground">Avg. Progress</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Most Active */}
      <StatCard
        title="Most Active"
        value={data.mostActiveWorkspace || "—"}
        icon={<ChevronsRight className="text-primary" />}
        color="bg-primary/10 border-primary/20 dark:border-primary/30"
      />

      {/* Collaborators */}
      <StatCard
        title="Collaborators"
        value={data.totalCollaborators}
        icon={<Users className="text-accent" />}
        color="bg-accent/10 border-accent/20 dark:border-accent/30"
      />

      {/* Workspace Breakdown */}
      {data.workspaceBreakdown.length > 0 && (
        <motion.div
          variants={item}
          data-slot="card"
          className="card col-span-1 sm:col-span-2 md:col-span-4 lg:col-span-6 rounded-[var(--radius)] border-[length:var(--border-width,1px)] bg-muted/5 border-border p-6 md:p-8"
        >
          <div className="text-base md:text-lg font-bold mb-5">
            Workspace Breakdown
          </div>
          <div className="flex flex-col gap-4">
            {data.workspaceBreakdown.map((ws, i) => (
              <div
                key={ws.id}
                className={cn(
                  "px-5 py-4 rounded-[var(--radius)] border-[length:var(--border-width,1px)]",
                  colors[i % colors.length]
                )}
              >
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <div className="font-semibold">{ws.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {ws.checklistCount} checklist{ws.checklistCount !== 1 ? "s" : ""}
                      {ws.collaboratorCount > 0 &&
                        ` · ${ws.collaboratorCount} collaborator${ws.collaboratorCount !== 1 ? "s" : ""}`}
                    </div>
                  </div>
                  <div
                    className={cn(
                      "text-xl font-bold",
                      textColors[i % textColors.length]
                    )}
                  >
                    {ws.avgProgress}%
                  </div>
                </div>
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${ws.avgProgress}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={cn(
                      "h-full rounded-full",
                      progressColors[i % progressColors.length]
                    )}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ── Empty States ──

function EmptyState({
  title,
  description,
  linkText,
  linkHref,
}: {
  title: string;
  description: string;
  linkText: string;
  linkHref: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="text-lg font-semibold mb-2">{title}</div>
      <p className="text-sm text-muted-foreground mb-4">{description}</p>
      <Button asChild variant="outline">
        <Link href={linkHref}>{linkText}</Link>
      </Button>
    </div>
  );
}

// ── Main Component ──

export function ReportsView({
  personal,
  templates,
  workspaces,
  range,
}: ReportsViewProps) {
  const [activeTab, setActiveTab] = React.useState<ReportTab>("personal");
  const router = useRouter();

  const handleRangeChange = (newRange: RangeValue) => {
    router.push(`/reports?range=${newRange}`);
  };

  const tabs = [
    {
      value: "personal" as const,
      label: "Personal",
      icon: <TrendingUp className="h-4 w-4" />,
    },
    {
      value: "templates" as const,
      label: "Templates",
      icon: <Layout className="h-4 w-4" />,
    },
    {
      value: "workspaces" as const,
      label: "Workspaces",
      icon: <FolderKanban className="h-4 w-4" />,
    },
  ];

  const hasPersonalData =
    personal.activeChecklists > 0 || personal.completedChecklists > 0;
  const hasTemplateData = templates.totalTemplates > 0;
  const hasWorkspaceData = workspaces.totalWorkspaces > 0;

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      <motion.div variants={item}>
        <PageHeader
          title="Reports"
          description="Track your productivity and analyze trends"
          icon={<BarChart3 className="h-6 w-6" />}
          gradient
        >
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl"
            onClick={() => window.open("/reports/print?tab=" + activeTab, "_blank")}
          >
            <Printer className="h-4 w-4" />
          </Button>
        </PageHeader>
      </motion.div>

      <motion.div variants={item} className="flex items-center gap-4 flex-wrap">
        <FilterTabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
        {activeTab === "personal" && (
          <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1">
            {(["7", "30", "all"] as RangeValue[]).map((r) => (
              <button
                key={r}
                onClick={() => handleRangeChange(r)}
                className={cn(
                  "px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap",
                  range === r
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {rangeLabels[r]}
              </button>
            ))}
          </div>
        )}
      </motion.div>

      <motion.div variants={item}>
        {activeTab === "personal" &&
          (hasPersonalData ? (
            <PersonalTab data={personal} />
          ) : (
            <EmptyState
              title="No checklists yet"
              description="Create a checklist from a template to start tracking your progress."
              linkText="Browse Templates"
              linkHref="/templates"
            />
          ))}

        {activeTab === "templates" &&
          (hasTemplateData ? (
            <TemplatesTab data={templates} />
          ) : (
            <EmptyState
              title="No templates yet"
              description="Create your first template to see analytics here."
              linkText="Create Template"
              linkHref="/templates/new"
            />
          ))}

        {activeTab === "workspaces" &&
          (hasWorkspaceData ? (
            <WorkspacesTab data={workspaces} />
          ) : (
            <EmptyState
              title="No workspaces yet"
              description="Create a workspace to organize and track progress."
              linkText="Create Workspace"
              linkHref="/workspaces"
            />
          ))}
      </motion.div>
    </motion.div>
  );
}
