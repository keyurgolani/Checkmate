"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FolderKanban,
  ArrowLeft,
  Pencil,
  Archive,
  Calendar,
  Clock,
  CheckCircle2,
  Plus,
  FileText,
  ListChecks,
  Search,
  FolderPlus,
  Loader2,
} from "lucide-react";
import { formatDate, cn } from "@/lib/utils";
import { ChecklistList } from "@/components/checklists/checklist-list";
import type { ChecklistCardData } from "@/components/checklists/checklist-card";
import type { WorkspaceData } from "../page";
import {
  createChecklistInWorkspace,
  getUserTemplates,
  getUserChecklists,
  moveTemplatesToWorkspace,
  moveChecklistsToWorkspace,
} from "./actions";
import Link from "next/link";

interface TemplateOption {
  id: string;
  title: string;
  workspaceId: string | null;
  description: string | null;
}

interface ChecklistOption {
  id: string;
  name: string;
  workspaceId: string | null;
  templateTitle: string;
  progress: number;
}

interface WorkspaceDetailClientProps {
  workspace: WorkspaceData;
  checklists: ChecklistCardData[];
  workspaceTemplates: TemplateOption[];
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

export function WorkspaceDetailClient({
  workspace,
  checklists,
  workspaceTemplates,
}: WorkspaceDetailClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Create Checklist Dialog
  const [isCreateChecklistOpen, setIsCreateChecklistOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [checklistName, setChecklistName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  // Bulk Add Dialog
  const [isBulkAddOpen, setIsBulkAddOpen] = useState(false);
  const [bulkAddTab, setBulkAddTab] = useState<"templates" | "checklists">("templates");
  const [allTemplates, setAllTemplates] = useState<TemplateOption[]>([]);
  const [allChecklists, setAllChecklists] = useState<ChecklistOption[]>([]);
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set());
  const [selectedChecklists, setSelectedChecklists] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [bulkAddError, setBulkAddError] = useState<string | null>(null);

  // Load data when bulk add dialog opens
  const loadBulkData = () => {
    if (allTemplates.length === 0 && allChecklists.length === 0) {
      setIsLoadingData(true);
      Promise.all([getUserTemplates(), getUserChecklists()])
        .then(([templatesResult, checklistsResult]) => {
          if (templatesResult.success) {
            setAllTemplates(
              templatesResult.templates.filter((t) => t.workspaceId !== workspace.id)
            );
          }
          if (checklistsResult.success) {
            setAllChecklists(
              checklistsResult.checklists.filter((c) => c.workspaceId !== workspace.id)
            );
          }
        })
        .finally(() => setIsLoadingData(false));
    }
  };

  // Filter templates/checklists by search query
  const filteredTemplates = useMemo(() => {
    if (!searchQuery) return allTemplates;
    const query = searchQuery.toLowerCase();
    return allTemplates.filter(
      (t) =>
        t.title.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query)
    );
  }, [allTemplates, searchQuery]);

  const filteredChecklists = useMemo(() => {
    if (!searchQuery) return allChecklists;
    const query = searchQuery.toLowerCase();
    return allChecklists.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.templateTitle.toLowerCase().includes(query)
    );
  }, [allChecklists, searchQuery]);

  // Handle create checklist
  const handleCreateChecklist = () => {
    if (!selectedTemplateId || !checklistName.trim()) return;
    setCreateError(null);

    startTransition(async () => {
      const result = await createChecklistInWorkspace(
        selectedTemplateId,
        checklistName.trim(),
        workspace.id
      );

      if (result.success) {
        setIsCreateChecklistOpen(false);
        setSelectedTemplateId("");
        setChecklistName("");
        router.refresh();
      } else {
        setCreateError(result.error || "Failed to create checklist");
      }
    });
  };

  // Handle bulk add
  const handleBulkAdd = () => {
    setBulkAddError(null);

    startTransition(async () => {
      const errors: string[] = [];

      if (selectedTemplates.size > 0) {
        const result = await moveTemplatesToWorkspace(
          Array.from(selectedTemplates),
          workspace.id
        );
        if (!result.success) {
          errors.push(...result.errors);
        }
      }

      if (selectedChecklists.size > 0) {
        const result = await moveChecklistsToWorkspace(
          Array.from(selectedChecklists),
          workspace.id
        );
        if (!result.success) {
          errors.push(...result.errors);
        }
      }

      if (errors.length > 0) {
        setBulkAddError(errors.join(", "));
      } else {
        setIsBulkAddOpen(false);
        setSelectedTemplates(new Set());
        setSelectedChecklists(new Set());
        setAllTemplates([]);
        setAllChecklists([]);
        router.refresh();
      }
    });
  };

  const toggleTemplate = (id: string) => {
    setSelectedTemplates((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleChecklist = (id: string) => {
    setSelectedChecklists((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const totalSelected = selectedTemplates.size + selectedChecklists.size;

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="mx-auto space-y-6"
    >
      <motion.div
        variants={item}
        className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 md:pr-48"
      >
        <div className="space-y-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/workspaces")}
            aria-label="Back to workspaces"
            className="rounded-xl -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Workspaces
          </Button>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-[var(--radius)] bg-primary/10 text-primary">
              <FolderKanban className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                  {workspace.name}
                </h1>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                    workspace.isArchived
                      ? "bg-muted text-muted-foreground"
                      : "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20"
                  )}
                >
                  {workspace.isArchived ? (
                    <>
                      <Archive className="h-3 w-3" />
                      Archived
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3 w-3" />
                      Active
                    </>
                  )}
                </span>
              </div>
              {workspace.description && (
                <p className="text-muted-foreground mt-1">{workspace.description}</p>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="rounded-xl">
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button variant="outline" size="sm" className="rounded-xl">
            <Archive className="mr-2 h-4 w-4" />
            {workspace.isArchived ? "Unarchive" : "Archive"}
          </Button>
        </div>
      </motion.div>

      {/* Workspace info - Bento style */}
      <motion.div variants={item}>
        <div data-slot="card" className="card rounded-[var(--radius)] bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 p-6 relative overflow-hidden">
          <div className="absolute -top-6 -right-6 p-6 opacity-10 rotate-12 transition-transform hover:rotate-0">
            <FolderKanban size={120} />
          </div>
          <div className="relative z-10">
            <h2 className="text-lg font-semibold mb-4">Workspace Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-background/50 backdrop-blur-sm">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="text-sm font-medium">{formatDate(workspace.createdAt)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-background/50 backdrop-blur-sm">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Clock className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Last updated</p>
                  <p className="text-sm font-medium">{formatDate(workspace.updatedAt)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-background/50 backdrop-blur-sm">
                <div className="p-2 rounded-lg bg-primary/10">
                  {workspace.isArchived ? (
                    <Archive className="h-4 w-4 text-primary" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="text-sm font-medium">
                    {workspace.isArchived ? "Archived" : "Active"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Action buttons */}
      <motion.div variants={item} className="flex flex-wrap gap-3">
        <Link href={`/templates/new?workspace=${workspace.id}`}>
          <Button className="rounded-xl">
            <FileText className="mr-2 h-4 w-4" />
            New Template
          </Button>
        </Link>
        <Button
          variant="outline"
          className="rounded-xl"
          onClick={() => setIsCreateChecklistOpen(true)}
          disabled={workspaceTemplates.length === 0}
        >
          <ListChecks className="mr-2 h-4 w-4" />
          Create Checklist
        </Button>
        <Button
          variant="outline"
          className="rounded-xl"
          onClick={() => {
            setIsBulkAddOpen(true);
            loadBulkData();
          }}
        >
          <FolderPlus className="mr-2 h-4 w-4" />
          Add Existing Items
        </Button>
      </motion.div>

      {/* Checklists section */}
      <motion.div variants={item}>
        <Card className="rounded-[var(--radius)] border bg-card/50 backdrop-blur-sm overflow-hidden">
          <CardHeader className="border-b bg-muted/30">
            <CardTitle className="text-lg font-semibold">Checklists</CardTitle>
            <CardDescription>
              {checklists.length === 0
                ? "No checklists in this workspace yet"
                : `${checklists.length} checklist${checklists.length === 1 ? "" : "s"} in this workspace`}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <ChecklistList
              checklists={checklists}
              emptyMessage="No checklists yet"
              emptyDescription="Create a checklist from a template or add existing items to this workspace."
              showDiscoverButton={false}
            />
          </CardContent>
        </Card>
      </motion.div>

      {/* Create Checklist Dialog */}
      <Dialog open={isCreateChecklistOpen} onOpenChange={setIsCreateChecklistOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Checklist</DialogTitle>
            <DialogDescription>
              Create a new checklist from a template in this workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="template">Template</Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {workspaceTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Checklist Name</Label>
              <Input
                id="name"
                value={checklistName}
                onChange={(e) => setChecklistName(e.target.value)}
                placeholder="Enter checklist name"
              />
            </div>
            {createError && (
              <p className="text-sm text-destructive">{createError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateChecklistOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateChecklist}
              disabled={isPending || !selectedTemplateId || !checklistName.trim()}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Checklist"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Add Dialog */}
      <Dialog open={isBulkAddOpen} onOpenChange={setIsBulkAddOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Add Items to Workspace</DialogTitle>
            <DialogDescription>
              Search and select templates or checklists to move to this workspace.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates and checklists..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Tabs */}
            <Tabs
              value={bulkAddTab}
              onValueChange={(v) => setBulkAddTab(v as "templates" | "checklists")}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="templates" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Templates ({filteredTemplates.length})
                </TabsTrigger>
                <TabsTrigger value="checklists" className="gap-2">
                  <ListChecks className="h-4 w-4" />
                  Checklists ({filteredChecklists.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="templates" className="mt-4">
                {isLoadingData ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredTemplates.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchQuery
                      ? "No templates match your search"
                      : "No templates available to add"}
                  </div>
                ) : (
                  <ScrollArea className="h-[300px] pr-4">
                    <div className="space-y-2">
                      {filteredTemplates.map((template) => (
                        <div
                          key={template.id}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                            selectedTemplates.has(template.id)
                              ? "border-primary bg-primary/5"
                              : "hover:bg-muted/50"
                          )}
                          onClick={() => toggleTemplate(template.id)}
                        >
                          <Checkbox
                            checked={selectedTemplates.has(template.id)}
                            onCheckedChange={() => toggleTemplate(template.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{template.title}</p>
                            {template.description && (
                              <p className="text-sm text-muted-foreground truncate">
                                {template.description}
                              </p>
                            )}
                          </div>
                          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>

              <TabsContent value="checklists" className="mt-4">
                {isLoadingData ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredChecklists.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchQuery
                      ? "No checklists match your search"
                      : "No checklists available to add"}
                  </div>
                ) : (
                  <ScrollArea className="h-[300px] pr-4">
                    <div className="space-y-2">
                      {filteredChecklists.map((checklist) => (
                        <div
                          key={checklist.id}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                            selectedChecklists.has(checklist.id)
                              ? "border-primary bg-primary/5"
                              : "hover:bg-muted/50"
                          )}
                          onClick={() => toggleChecklist(checklist.id)}
                        >
                          <Checkbox
                            checked={selectedChecklists.has(checklist.id)}
                            onCheckedChange={() => toggleChecklist(checklist.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{checklist.name}</p>
                            <p className="text-sm text-muted-foreground truncate">
                              {checklist.templateTitle} • {checklist.progress}% complete
                            </p>
                          </div>
                          <ListChecks className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>
            </Tabs>

            {bulkAddError && (
              <p className="text-sm text-destructive">{bulkAddError}</p>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <div className="flex-1 text-sm text-muted-foreground">
              {totalSelected > 0 && `${totalSelected} item${totalSelected === 1 ? "" : "s"} selected`}
            </div>
            <Button
              variant="outline"
              onClick={() => setIsBulkAddOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleBulkAdd} disabled={isPending || totalSelected === 0}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Moving...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Add to Workspace
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
