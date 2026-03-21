"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Activity,
  CheckCircle2,
  Layout,
  TrendingUp,
  Clock,
  ArrowRight,
  ExternalLink,
  Pencil,
  RefreshCw,
  Download,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AISummary } from "@/components/dashboard/ai-summary";
import { EntityContextMenu, type ContextMenuItemConfig } from "@/components/shared/entity-context-menu";
import type { User, Checklist, DashboardSummary } from "@/lib/pocketbase-types";
import { deleteChecklist } from "@/app/(dashboard)/checklists/actions";
import { bulkSyncChecklists } from "@/app/(dashboard)/checklists/actions";

interface DashboardViewProps {
  user: User | null;
  stats: {
    totalBlueprints: number;
    activeChecklists: number;
    completedChecklists: number;
    overallProgress: number;
  };
  recentChecklists: Checklist[];
  blueprintMap: Map<string, string>;
  llmConfigured: boolean;
  cachedSummary: DashboardSummary | null;
}

function getGreeting() {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

export function DashboardView({ user, stats, recentChecklists, blueprintMap, llmConfigured, cachedSummary }: DashboardViewProps) {
  const [greeting, setGreeting] = React.useState("Welcome");
  const router = useRouter();

  React.useEffect(() => {
    setGreeting(getGreeting());
  }, []);

  const checklistMenuItems: ContextMenuItemConfig<Checklist>[] = [
    {
      label: "Open",
      icon: ExternalLink,
      action: (id) => {
        router.push(`/checklists/${id}`);
      },
    },
    {
      label: "Edit Name",
      icon: Pencil,
      action: (id) => {
        router.push(`/checklists/${id}`);
      },
    },
    {
      label: "Sync with Template",
      icon: RefreshCw,
      action: async (id) => {
        await bulkSyncChecklists([id]);
        router.refresh();
      },
    },
    {
      label: "Export",
      icon: Download,
      action: (id) => {
        window.open(`/checklists/${id}/print`, "_blank");
      },
      separator: "after",
    },
    {
      label: "Delete",
      icon: Trash2,
      variant: "destructive",
      action: async (id) => {
        await deleteChecklist(id);
        router.refresh();
      },
      separator: "before",
    },
  ];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      {/* Hero Greeting */}
      <motion.div variants={item} className="flex flex-col gap-2 pb-2">
        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent pb-1 pr-1 break-words">
          {greeting}, {user?.displayName || "Friend"}
        </h1>
        <p className="text-base md:text-lg lg:text-xl text-muted-foreground">
          Ready to make some progress today?
        </p>
      </motion.div>

      {/* AI Summary */}
      <motion.div variants={item}>
        <AISummary 
          initialSummary={cachedSummary} 
          llmConfigured={llmConfigured} 
        />
      </motion.div>

      {/* Bento Grid Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <motion.div variants={item} className="col-span-1 sm:col-span-2 lg:col-span-3 row-span-2">
            <div data-slot="card" className="card h-full rounded-[var(--radius)] bg-gradient-to-br from-primary/10 to-primary/5 border-[length:var(--border-width,1px)] border-primary/20 dark:border-primary/40 p-6 md:p-8 flex flex-col justify-between relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 md:p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Activity size={100} />
                </div>
                <div>
                   <h2 className="text-xl md:text-2xl font-bold mb-2">Overall Progress</h2>
                   <div className="text-5xl md:text-6xl font-black text-primary mb-1">
                     {Math.round(stats.overallProgress)}%
                   </div>
                   <p className="text-muted-foreground text-sm md:text-base">Average completion across active tasks</p>
                </div>
                <div className="w-full bg-primary/20 h-3 rounded-full overflow-hidden mt-6 md:mt-8">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${stats.overallProgress}%` }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className="h-full bg-primary rounded-full relative overflow-hidden"
                    >
                         <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite]" style={{ backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,0.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,0.15) 50%,rgba(255,255,255,0.15) 75%,transparent 75%,transparent)', backgroundSize: '1rem 1rem' }} />
                    </motion.div>
                </div>
            </div>
        </motion.div>

        <Link href="/checklists" className="contents">
            <StatCard 
                variants={item}
                title="Active Tasks" 
                value={stats.activeChecklists} 
                icon={<Clock className="text-accent" />}
                color="bg-accent/10 border-[length:var(--border-width,1px)] border-accent/20 hover:border-accent/50 dark:border-accent/30 dark:hover:border-accent/60 transition-colors cursor-pointer"
            />
        </Link>
        <Link href="/checklists" className="contents">
            <StatCard 
                variants={item}
                title="Completed" 
                value={stats.completedChecklists} 
                icon={<CheckCircle2 className="text-primary" />}
                color="bg-primary/10 border-[length:var(--border-width,1px)] border-primary/20 hover:border-primary/50 dark:border-primary/30 dark:hover:border-primary/60 transition-colors cursor-pointer"
            />
        </Link>
        <Link href="/templates" className="contents">
            <StatCard 
                variants={item}
                title="Templates" 
                value={stats.totalBlueprints} 
                icon={<Layout className="text-secondary" />}
                color="bg-secondary/10 border-[length:var(--border-width,1px)] border-secondary/20 hover:border-secondary/50 dark:border-secondary/30 dark:hover:border-secondary/60 transition-colors cursor-pointer"
            />
        </Link>
        
        <Link href="/reports" className="contents">
          <motion.div variants={item} className="col-span-1 lg:col-span-3 rounded-[var(--radius)] bg-secondary/10 border-[length:var(--border-width,1px)] border-secondary/20 dark:border-secondary/30 p-6 flex flex-row items-center justify-between gap-3 group cursor-pointer hover:bg-secondary/20 transition-colors card" data-slot="card">
              <div className="flex flex-col gap-1">
                  <div className="font-bold text-lg">View Reports</div>
                  <div className="text-sm text-muted-foreground">Analyze your productivity trends</div>
              </div>
              <div className="p-4 rounded-xl bg-secondary/20 group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-6 h-6 text-secondary" />
              </div>
          </motion.div>
        </Link>
      </div>

      {/* Recent Activity Section */}
      <motion.div variants={item} className="space-y-4">
        <div className="flex items-center justify-between">
            <h2 className="text-xl md:text-2xl font-bold">Jump Back In</h2>
            <Link href="/checklists">
                <Button variant="ghost" className="gap-2">
                    View All <ArrowRight size={16} />
                </Button>
            </Link>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {recentChecklists.map((checklist) => (
                <EntityContextMenu
                    key={checklist.id}
                    entityId={checklist.id}
                    entity={checklist}
                    menuItems={checklistMenuItems}
                >
                    <motion.div
                        whileHover={{ y: -4 }}
                        className="group relative"
                    >
                        <Link href={`/checklists/${checklist.id}`}>
                            <Card className="h-full p-5 transition-all hover:border-primary overflow-hidden">
                                 {/* Gradient glow - only visible on hover */}
                                 <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-primary/5 to-transparent -mr-6 -mt-6 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />

                                 <div className="relative z-10">
                                    <h3 className="font-bold text-base md:text-lg mb-1 group-hover:text-primary transition-colors line-clamp-2">{checklist.name}</h3>
                                    <p className="text-sm text-muted-foreground mb-4 line-clamp-1">
                                        {blueprintMap.get(checklist.blueprint) || "Unknown Template"}
                                    </p>

                                    <div className="flex items-center justify-between mt-4">
                                        <div className="text-xs font-mono bg-muted px-2 py-1 rounded-lg">
                                            {new Date(checklist.updated).toLocaleDateString()}
                                        </div>
                                        <div className={`text-lg font-bold ${checklist.progress === 100 ? 'text-green-500' : 'text-primary'}`}>
                                            {Math.round(checklist.progress || 0)}%
                                        </div>
                                    </div>

                                    <div className="w-full bg-muted h-1.5 rounded-full mt-3 overflow-hidden">
                                        <motion.div
                                            className="h-full bg-primary relative overflow-hidden rounded-full"
                                            style={{ width: `${checklist.progress || 0}%` }}
                                        />
                                    </div>
                                 </div>
                            </Card>
                        </Link>
                    </motion.div>
                </EntityContextMenu>
            ))}
            
            {/* Create New Card */}
            <Link href="/templates/new">
                <motion.div 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    data-slot="card"
                    className="card h-full min-h-[180px] rounded-[var(--radius)] border-[length:var(--border-width,1px)] border-dashed border-muted-foreground/20 flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer text-muted-foreground hover:text-primary"
                >
                    <div className="p-3 rounded-[var(--radius)] bg-muted group-hover:bg-white transition-colors">
                        <Layout className="w-6 h-6" />
                    </div>
                    <span className="font-medium">Create New Template</span>
                </motion.div>
            </Link>
        </div>
      </motion.div>
    </motion.div>
  );
}

function StatCard({ 
    title, 
    value, 
    icon, 
    color,
    variants 
}: { 
    title: string, 
    value: number, 
    icon: React.ReactNode, 
    color: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    variants: any
}) {
    return (
        <motion.div variants={variants} data-slot="card" className={cn("card rounded-[var(--radius)] border-[length:var(--border-width,1px)] p-6 flex flex-col justify-between", color)}>
            <div className="flex justify-between items-start">
                <div className="p-3 bg-white/50 dark:bg-black/20 rounded-[var(--radius)] backdrop-blur-sm">
                    {icon}
                </div>
            </div>
            <div className="mt-4">
                <div className="text-3xl md:text-4xl font-bold mb-1">{value}</div>
                <div className="text-sm font-medium opacity-80">{title}</div>
            </div>
        </motion.div>
    );
}
