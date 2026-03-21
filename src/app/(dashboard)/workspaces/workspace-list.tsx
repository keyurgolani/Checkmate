"use client";

import { useState, useEffect, useTransition, useMemo } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, FolderKanban, Archive, ArchiveRestore, ExternalLink, Pencil, Trash2, Loader2, CheckSquare, X } from "lucide-react";
import { createWorkspace, updateWorkspace, archiveWorkspace, unarchiveWorkspace, deleteWorkspace, bulkDeleteWorkspaces, bulkArchiveWorkspaces, bulkUnarchiveWorkspaces } from "./actions";
import { WorkspaceCard } from "@/components/workspaces/workspace-card";
import { BulkActionBar } from "@/components/shared/bulk-action-bar";
import { BulkConfirmDialog } from "@/components/shared/bulk-confirm-dialog";
import { useSelection } from "@/lib/hooks/use-selection";
import type { ContextMenuItemConfig } from "@/components/shared/entity-context-menu";
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
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const orderedIds = useMemo(() => workspaces.map((w) => w.id), [workspaces]);
  const selection = useSelection(orderedIds);

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

  // Bulk actions
  const handleBulkArchive = () => {
    startTransition(async () => {
      await bulkArchiveWorkspaces(Array.from(selection.selectedIds));
      selection.exitSelectionMode();
      router.refresh();
    });
  };

  const handleBulkUnarchive = () => {
    startTransition(async () => {
      await bulkUnarchiveWorkspaces(Array.from(selection.selectedIds));
      selection.exitSelectionMode();
      router.refresh();
    });
  };

  const handleBulkDelete = () => {
    setBulkDeleteOpen(true);
  };

  const confirmBulkDelete = () => {
    startTransition(async () => {
      await bulkDeleteWorkspaces(Array.from(selection.selectedIds));
      setBulkDeleteOpen(false);
      selection.exitSelectionMode();
      router.refresh();
    });
  };

  // Context menu items
  const contextMenuItems: ContextMenuItemConfig<WorkspaceData>[] = [
    {
      label: "Open",
      icon: ExternalLink,
      action: (id) => router.push(`/workspaces/${id}`),
    },
    {
      label: "Edit",
      icon: Pencil,
      action: (_id, entity) => openEditDialog(entity),
    },
    {
      label: (entity) => (entity.isArchived ? "Unarchive" : "Archive"),
      icon: (entity: WorkspaceData) => (entity.isArchived ? ArchiveRestore : Archive),
      action: (_id, entity) =>
        entity.isArchived ? handleUnarchive(entity) : handleArchive(entity),
      separator: "before",
    },
    {
      label: "Delete",
      icon: Trash2,
      action: (_id, entity) => handleDelete(entity),
      variant: "destructive",
      separator: "before",
    },
  ];

  // Bulk action definitions
  const bulkActions = showArchived
    ? [
        {
          label: "Unarchive",
          icon: ArchiveRestore,
          action: handleBulkUnarchive,
        },
        {
          label: "Delete",
          icon: Trash2,
          action: handleBulkDelete,
          variant: "destructive" as const,
        },
      ]
    : [
        {
          label: "Archive",
          icon: Archive,
          action: handleBulkArchive,
        },
        {
          label: "Delete",
          icon: Trash2,
          action: handleBulkDelete,
          variant: "destructive" as const,
        },
      ];

  const filterTabs = [
    { value: "active" as const, label: "Active", icon: <FolderKanban className="h-4 w-4" /> },
    { value: "archived" as const, label: "Archived", icon: <Archive className="h-4 w-4" /> },
  ];

  return (
    <>
      {/* Filter tabs and selection toggle */}
      <div className="flex items-center justify-between gap-4">
        <FilterTabs
          tabs={filterTabs}
          activeTab={showArchived ? "archived" : "active"}
          onTabChange={(tab) => router.push(tab === "archived" ? "/workspaces?archived=true" : "/workspaces")}
        />
        {workspaces.length > 0 && (
          selection.isSelectionMode ? (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground"
              onClick={selection.exitSelectionMode}
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground"
              onClick={() => selection.enterSelectionMode()}
            >
              <CheckSquare className="h-4 w-4" />
              Select
            </Button>
          )
        )}
      </div>

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
          {!showArchived && !selection.isSelectionMode && (
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
              <WorkspaceCard
                key={workspace.id}
                workspace={workspace}
                index={index}
                onEdit={openEditDialog}
                onArchive={handleArchive}
                onUnarchive={handleUnarchive}
                onDelete={handleDelete}
                isPending={isPending}
                contextMenuItems={contextMenuItems}
                isSelectionMode={selection.isSelectionMode}
                isSelected={selection.isSelected(workspace.id)}
                onSelectionClick={selection.handleClick}
                onSelect={selection.toggleItem}
                onEnterSelectionMode={selection.enterSelectionMode}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Bulk action bar */}
      <BulkActionBar
        selectedCount={selection.selectedIds.size}
        actions={bulkActions}
        onSelectAll={selection.selectAll}
        onDeselectAll={selection.deselectAll}
        onCancel={selection.exitSelectionMode}
        isAllSelected={selection.selectedIds.size === workspaces.length}
      />

      {/* Bulk delete confirm dialog */}
      <BulkConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title="Delete workspaces"
        description={`Are you sure you want to delete ${selection.selectedIds.size} workspace${selection.selectedIds.size !== 1 ? "s" : ""}? This action cannot be undone.`}
        actionLabel="Delete"
        onConfirm={confirmBulkDelete}
        variant="destructive"
      />

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
