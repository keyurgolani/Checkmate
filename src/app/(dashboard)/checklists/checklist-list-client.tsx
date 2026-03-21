"use client";

/**
 * Checklist List Client Component
 *
 * Wraps ChecklistList with context menu items and bulk actions.
 * Defines right-click menu actions (Open, Edit Name, Sync, Export, Delete)
 * and bulk actions (Sync, Export, Delete) for the checklists page.
 */

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChecklistList } from "@/components/checklists/checklist-list";
import { EditChecklistDialog } from "@/components/checklists/edit-checklist-dialog";
import type { ChecklistCardData } from "@/components/checklists/checklist-card";
import type { ContextMenuItemConfig } from "@/components/shared/entity-context-menu";
import type { BulkAction } from "@/components/shared/bulk-action-bar";
import { ExternalLink, Pencil, RefreshCw, Download, Trash2 } from "lucide-react";
import { deleteChecklist, bulkDeleteChecklists, bulkSyncChecklists } from "./actions";

interface ChecklistListClientProps {
  checklists: ChecklistCardData[];
}

export function ChecklistListClient({ checklists }: ChecklistListClientProps) {
  const router = useRouter();

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<{ id: string; name: string } | null>(null);

  // We need a ref to the selection state for bulk actions.
  // Since ChecklistList manages selection internally, we use a callback pattern.
  // However, the bulk actions need selectedIds. We'll lift the selection reference
  // via a ref-callback approach. For simplicity, we track selectedIds here.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Register callback to receive selectedIds updates from ChecklistList
  // Actually, looking at the architecture, BulkAction.action() is a closure
  // that needs access to selectedIds. Since ChecklistList internally manages
  // selection and passes bulkActions, we need to provide actions that use
  // the selection from the list. The BulkActionBar receives selectedCount
  // from the list. But the action closures need selectedIds.
  //
  // The pattern used is: bulk actions are defined with closures that reference
  // a mutable ref. But that's complex. Instead, let's use a simpler approach:
  // we'll make the ChecklistList expose selection via a callback or we use
  // a ref pattern.
  //
  // Looking more carefully at the architecture: BulkActionBar's `actions`
  // array has `action: () => void` callbacks. These are created here and passed
  // down. The ChecklistList passes them to BulkActionBar along with the
  // selectedCount from its internal selection state.
  //
  // The issue is that our bulk action closures here don't have access to the
  // internal selectedIds. We need to lift this.
  //
  // Solution: We'll add a selectedIdsRef that ChecklistList updates via a callback.
  // But ChecklistList doesn't have that API yet. Instead, let's add a
  // `onSelectionChange` callback prop to ChecklistList.

  const handleSelectionChange = useCallback((ids: Set<string>) => {
    setSelectedIds(ids);
  }, []);

  const contextMenuItems: ContextMenuItemConfig<ChecklistCardData>[] = [
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
      action: (id, entity) => {
        setEditTarget({ id, name: entity.name });
        setEditDialogOpen(true);
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

  const bulkActions: BulkAction[] = [
    {
      label: "Sync with Template",
      icon: RefreshCw,
      action: async () => {
        if (selectedIds.size === 0) return;
        await bulkSyncChecklists(Array.from(selectedIds));
        router.refresh();
      },
    },
    {
      label: "Export",
      icon: Download,
      action: () => {
        for (const id of selectedIds) {
          window.open(`/checklists/${id}/print`, "_blank");
        }
      },
    },
    {
      label: "Delete",
      icon: Trash2,
      variant: "destructive",
      action: async () => {
        if (selectedIds.size === 0) return;
        await bulkDeleteChecklists(Array.from(selectedIds));
        router.refresh();
      },
    },
  ];

  return (
    <>
      <ChecklistList
        checklists={checklists}
        emptyMessage="No checklists yet"
        emptyDescription="Create a checklist from a template to start tracking your progress!"
        showDiscoverButton={true}
        discoverHref="/discover"
        defaultViewMode="list"
        contextMenuItems={contextMenuItems}
        bulkActions={bulkActions}
        onSelectionChange={handleSelectionChange}
      />

      {editTarget && (
        <EditChecklistDialog
          checklistId={editTarget.id}
          currentName={editTarget.name}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSuccess={() => {
            router.refresh();
          }}
        />
      )}
    </>
  );
}
