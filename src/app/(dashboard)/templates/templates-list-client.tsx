"use client";

/**
 * Templates List Client Wrapper
 *
 * Client component that wires up context menus and bulk actions
 * for the templates list. Wraps the shared TemplateList component
 * with action handlers that use server actions and client-side navigation.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TemplateList } from "@/components/templates/template-list";
import type { TemplateCardData } from "@/components/templates/template-card";
import type { ContextMenuItemConfig } from "@/components/shared/entity-context-menu";
import type { BulkAction } from "@/components/shared/bulk-action-bar";
import { BulkConfirmDialog } from "@/components/shared/bulk-confirm-dialog";
import { Visibility } from "@/lib/pocketbase-types";
import {
  Pencil,
  Copy,
  Eye,
  Download,
  Trash2,
  Lock,
  Globe,
  Users,
} from "lucide-react";
import {
  duplicateTemplate,
  bulkDeleteTemplates,
  bulkChangeVisibility,
  bulkExportTemplates,
} from "./actions";

interface TemplatesListClientProps {
  templates: TemplateCardData[];
  currentUserId?: string | null;
}

export function TemplatesListClient({
  templates,
  currentUserId,
}: TemplatesListClientProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingBulkAction, setPendingBulkAction] = useState<(() => void) | null>(null);

  // We need a ref to get selected IDs from TemplateList's selection state.
  // Since TemplateList manages selection internally, we'll use a callback pattern.
  // For bulk actions, the BulkAction's action() is called with no args,
  // so we need to capture selectedIds at the time the action bar renders.
  // The simplest approach: we store a getter that TemplateList will provide via a ref.
  // Actually, looking at the architecture, BulkAction.action() is called from BulkActionBar
  // which is rendered inside TemplateList. The TemplateList has access to selection.selectedIds.
  // So we need to pass bulk action factories that close over the selectedIds.
  // But BulkAction[] is static... Let me re-read BulkActionBar.

  // BulkAction has action: () => void. This is called when the user clicks the action button.
  // The selectedIds are available in TemplateList where selection lives.
  // The issue: we define bulkActions here, but selection lives in TemplateList.
  //
  // Solution: We need to lift selection state or use a different pattern.
  // Looking at the task spec more carefully, it says to pass bulkActions to TemplateList.
  // The TemplateList renders BulkActionBar with those actions.
  // But the actions need to know which IDs are selected.
  //
  // The cleanest approach: make TemplateList expose selectedIds via a callback,
  // or have TemplateList create the bulk actions internally.
  //
  // Actually, the simplest approach that matches the spec: since TemplateList owns
  // the selection state, we can have it pass selectedIds through a render prop or
  // we can make the bulk actions accept selectedIds.
  //
  // Looking at this pragmatically: Let me make TemplateList accept
  // `bulkActionFactory` that receives selectedIds and returns BulkAction[].
  // OR: I can use a simpler pattern where I store selectedIds in a ref
  // that gets updated by TemplateList.
  //
  // Actually, the simplest approach: have TemplateList accept an
  // onBulkAction callback and define the actions there.
  // But the task spec says to pass BulkAction[].
  //
  // Let me use a shared ref pattern. We'll create a state that TemplateList updates.
  // Wait - let me re-examine. The BulkActionBar is inside TemplateList.
  // The action() closures can capture selection.selectedIds because they're created
  // inside TemplateList's render scope... but we're passing them from outside.
  //
  // OK, the practical approach: I'll modify TemplateList to accept a
  // `bulkActions` that is a function receiving selectedIds, returning BulkAction[].
  // This way the actions have access to the selected IDs.

  // Actually wait - let me look at this differently. I'll use a simpler approach:
  // store the selectedIds in a state here via an onSelectionChange callback,
  // and re-create bulkActions whenever it changes. But TemplateList doesn't
  // expose onSelectionChange...
  //
  // The cleanest path: accept `bulkActions` as a factory function in TemplateList.
  // Let me update TemplateList to support this.

  // For now, I will use the pattern where TemplateList accepts
  // bulkActionDefs that are factory functions receiving selectedIds.

  const contextMenuItems: ContextMenuItemConfig<TemplateCardData>[] = [
    {
      label: "Edit",
      icon: Pencil,
      action: (id) => {
        router.push(`/templates/${id}`);
      },
    },
    {
      label: "Duplicate",
      icon: Copy,
      action: (id) => {
        startTransition(async () => {
          await duplicateTemplate(id);
          router.refresh();
        });
      },
    },
    {
      label: "Change Visibility",
      icon: Eye,
      action: () => {},
      submenu: [
        {
          label: "Private",
          icon: Lock,
          action: (id) => {
            startTransition(async () => {
              await bulkChangeVisibility([id], Visibility.PRIVATE);
              router.refresh();
            });
          },
        },
        {
          label: "Public",
          icon: Globe,
          action: (id) => {
            startTransition(async () => {
              await bulkChangeVisibility([id], Visibility.PUBLIC);
              router.refresh();
            });
          },
        },
        {
          label: "Shared",
          icon: Users,
          action: (id) => {
            startTransition(async () => {
              await bulkChangeVisibility([id], Visibility.SHARED);
              router.refresh();
            });
          },
        },
      ],
    },
    {
      label: "Export",
      icon: Download,
      action: (id) => {
        startTransition(async () => {
          const result = await bulkExportTemplates([id]);
          if (result.success && result.exports && result.exports.length > 0) {
            const exportData = result.exports[0];
            if (!exportData) return;
            const blob = new Blob(
              [JSON.stringify(exportData.data, null, 2)],
              { type: "application/json" }
            );
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `template-${id}.json`;
            a.click();
            URL.revokeObjectURL(url);
          }
        });
      },
      separator: "after",
    },
    {
      label: "Delete",
      icon: Trash2,
      variant: "destructive",
      separator: "before",
      action: (id) => {
        setPendingDeleteId(id);
        setDeleteDialogOpen(true);
      },
    },
  ];

  const handleConfirmDelete = () => {
    if (!pendingDeleteId) return;
    startTransition(async () => {
      await bulkDeleteTemplates([pendingDeleteId]);
      router.refresh();
    });
    setPendingDeleteId(null);
    setDeleteDialogOpen(false);
  };

  // Bulk actions use a factory pattern. We pass a function to TemplateList
  // that creates BulkAction[] given the current selectedIds.
  const bulkActionFactory = (selectedIds: Set<string>): BulkAction[] => {
    const ids = Array.from(selectedIds);
    return [
      {
        label: "Change Visibility",
        icon: Eye,
        action: () => {
          // For bulk visibility, default to private
          startTransition(async () => {
            await bulkChangeVisibility(ids, Visibility.PRIVATE);
            router.refresh();
          });
        },
      },
      {
        label: "Export",
        icon: Download,
        action: () => {
          startTransition(async () => {
            const result = await bulkExportTemplates(ids);
            if (result.success && result.exports) {
              const blob = new Blob(
                [JSON.stringify(result.exports, null, 2)],
                { type: "application/json" }
              );
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `templates-export.json`;
              a.click();
              URL.revokeObjectURL(url);
            }
          });
        },
      },
      {
        label: "Delete",
        icon: Trash2,
        variant: "destructive" as const,
        action: () => {
          setPendingBulkAction(() => () => {
            startTransition(async () => {
              await bulkDeleteTemplates(ids);
              router.refresh();
            });
          });
          setBulkDeleteDialogOpen(true);
        },
      },
    ];
  };

  return (
    <>
      <TemplateList
        templates={templates}
        emptyMessage="No templates yet"
        emptyDescription="Create your first template to get started organizing your tasks!"
        showCreateButton={true}
        createHref="/templates/new"
        currentUserId={currentUserId}
        contextMenuItems={contextMenuItems}
        bulkActionFactory={bulkActionFactory}
      />

      <BulkConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Template"
        description="Are you sure you want to delete this template? This action cannot be undone."
        actionLabel="Delete"
        onConfirm={handleConfirmDelete}
        variant="destructive"
      />

      <BulkConfirmDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
        title="Delete Templates"
        description="Are you sure you want to delete the selected templates? This action cannot be undone."
        actionLabel="Delete All"
        onConfirm={() => {
          pendingBulkAction?.();
          setPendingBulkAction(null);
          setBulkDeleteDialogOpen(false);
        }}
        variant="destructive"
      />
    </>
  );
}
