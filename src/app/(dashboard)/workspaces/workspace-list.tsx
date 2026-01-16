"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { FilterTabs } from "@/components/ui/filter-tabs";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, FolderKanban, Archive, ArchiveRestore, MoreHorizontal, Pencil, Trash2, Loader2 } from "lucide-react";
import { formatDate, cn } from "@/lib/utils";
import { createWorkspace, updateWorkspace, archiveWorkspace, unarchiveWorkspace, deleteWorkspace } from "./actions";
import type { WorkspaceData } from "./page";

interface WorkspaceListProps {
  workspaces: WorkspaceData[];
  showArchived: boolean;
  openCreateDialog?: boolean;
}

export function WorkspaceList({ workspaces: initialWorkspaces, showArchived, openCreateDialog }: WorkspaceListProps) {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState(initialWorkspaces);
  const [isCreateOpen, setIsCreateOpen] = useState(openCreateDialog ?? false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<WorkspaceData | null>(null);
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setWorkspaces(initialWorkspaces);
  }, [initialWorkspaces]);

  useEffect(() => {
    if (openCreateDialog) {
      setIsCreateOpen(true);
      router.replace("/workspaces", { scroll: false });
    }
  }, [openCreateDialog, router]);

  const handleCreate = async () => {
    if (!formData.name.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await createWorkspace({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
      });
      if (result.success) {
        setIsCreateOpen(false);
        setFormData({ name: "", description: "" });
        router.refresh();
      } else {
        setError(result.error || "Failed to create workspace");
      }
    });
  };

  const handleEdit = async () => {
    if (!editingWorkspace || !formData.name.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await updateWorkspace(editingWorkspace.id, {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
      });
      if (result.success) {
        setIsEditOpen(false);
        setEditingWorkspace(null);
        setFormData({ name: "", description: "" });
        router.refresh();
      } else {
        setError(result.error || "Failed to update workspace");
      }
    });
  };

  const handleArchive = async (workspace: WorkspaceData) => {
    startTransition(async () => {
      await archiveWorkspace(workspace.id);
      router.refresh();
    });
  };

  const handleUnarchive = async (workspace: WorkspaceData) => {
    startTransition(async () => {
      await unarchiveWorkspace(workspace.id);
      router.refresh();
    });
  };

  const handleDelete = async (workspace: WorkspaceData) => {
    if (!confirm(`Are you sure you want to delete "${workspace.name}"? This action cannot be undone.`)) return;
    startTransition(async () => {
      await deleteWorkspace(workspace.id);
      router.refresh();
    });
  };

  const openEditDialog = (workspace: WorkspaceData) => {
    setEditingWorkspace(workspace);
    setFormData({ name: workspace.name, description: workspace.description || "" });
    setError(null);
    setIsEditOpen(true);
  };

  const filterTabs = [
    { value: "active" as const, label: "Active", icon: <FolderKanban className="h-4 w-4" /> },
    { value: "archived" as const, label: "Archived", icon: <Archive className="h-4 w-4" /> },
  ];

  return (
    <>
      {/* Filter tabs */}
      <FilterTabs
        tabs={filterTabs}
        activeTab={showArchived ? "archived" : "active"}
        onTabChange={(tab) => router.push(tab === "archived" ? "/workspaces?archived=true" : "/workspaces")}
      />

      {/* Workspace grid */}
      {workspaces.length === 0 ? (
        <EmptyState
          icon={<FolderKanban className="h-8 w-8" />}
          title={showArchived ? "No archived workspaces" : "No workspaces yet"}
          description={showArchived 
            ? "Archived workspaces will appear here."
            : "Create your first workspace to start organizing your checklists."}
          action={!showArchived ? {
            label: "Create Workspace",
            href: "#",
            icon: <Plus className="h-4 w-4" />,
          } : undefined}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Create new workspace card */}
          {!showArchived && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => { setError(null); setIsCreateOpen(true); }}
              data-slot="card"
              className="card min-h-[160px] rounded-[var(--radius)] border-2 border-dashed border-muted-foreground/20 flex flex-col items-center justify-center gap-3 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer text-muted-foreground hover:text-primary"
            >
              <div className="p-3 rounded-[var(--radius)] bg-muted">
                <Plus className="h-6 w-6" />
              </div>
              <span className="font-medium">Create Workspace</span>
            </motion.div>
          )}

          {/* Workspace cards */}
          <AnimatePresence>
            {workspaces.map((workspace, index) => (
              <motion.div
                key={workspace.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -4 }}
                onClick={() => router.push(`/workspaces/${workspace.id}`)}
                data-slot="card"
                className={cn(
                  "card relative min-h-[160px] rounded-[var(--radius)] border bg-card/50 backdrop-blur-sm p-6 cursor-pointer",
                  "transition-all duration-300 hover:border-primary/30",
                  "overflow-hidden group"
                )}
              >
                {/* Gradient glow - only visible on hover */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-primary/5 to-transparent -mr-8 -mt-8 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-primary/10 text-primary">
                        <FolderKanban className="h-5 w-5" />
                      </div>
                      <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                        {workspace.name}
                      </h3>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" 
                          disabled={isPending}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem onClick={() => openEditDialog(workspace)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {workspace.isArchived ? (
                          <DropdownMenuItem onClick={() => handleUnarchive(workspace)}>
                            <ArchiveRestore className="mr-2 h-4 w-4" />
                            Unarchive
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => handleArchive(workspace)}>
                            <Archive className="mr-2 h-4 w-4" />
                            Archive
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          onClick={() => handleDelete(workspace)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  {workspace.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                      {workspace.description}
                    </p>
                  )}
                  
                  <p className="text-xs text-muted-foreground mt-auto">
                    Created {formatDate(workspace.createdAt)}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) setError(null); }}>
        <DialogContent className="rounded-[var(--radius)]">
          <DialogHeader>
            <DialogTitle>Create Workspace</DialogTitle>
            <DialogDescription>
              Create a new workspace to organize your checklists.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-xl">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="My Workspace"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={isPending}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                placeholder="A brief description..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                disabled={isPending}
                className="rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isPending} className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!formData.name.trim() || isPending} className="rounded-xl">
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={(open) => { setIsEditOpen(open); if (!open) setError(null); }}>
        <DialogContent className="rounded-[var(--radius)]">
          <DialogHeader>
            <DialogTitle>Edit Workspace</DialogTitle>
            <DialogDescription>
              Update your workspace details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-xl">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={isPending}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description (optional)</Label>
              <Input
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                disabled={isPending}
                className="rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={isPending} className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={!formData.name.trim() || isPending} className="rounded-xl">
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
