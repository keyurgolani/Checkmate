"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FolderKanban,
  Archive,
  ArchiveRestore,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { formatDate, cn } from "@/lib/utils";
import { EntityContextMenu, type ContextMenuItemConfig } from "@/components/shared/entity-context-menu";
import { SelectionOverlay } from "@/components/shared/selection-overlay";
import { useLongPress } from "@/lib/hooks/use-long-press";
import type { WorkspaceData } from "@/app/(dashboard)/workspaces/page";

export interface WorkspaceCardProps {
  workspace: WorkspaceData;
  index?: number;
  onEdit: (workspace: WorkspaceData) => void;
  onArchive: (workspace: WorkspaceData) => void;
  onUnarchive: (workspace: WorkspaceData) => void;
  onDelete: (workspace: WorkspaceData) => void;
  isPending: boolean;
  contextMenuItems?: ContextMenuItemConfig<WorkspaceData>[];
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onSelectionClick?: (id: string, event: React.MouseEvent) => void;
  onSelect?: (id: string) => void;
  onEnterSelectionMode?: (id: string) => void;
}

export function WorkspaceCard({
  workspace,
  index = 0,
  onEdit,
  onArchive,
  onUnarchive,
  onDelete,
  isPending,
  contextMenuItems = [],
  isSelectionMode = false,
  isSelected = false,
  onSelectionClick,
  onSelect,
  onEnterSelectionMode,
}: WorkspaceCardProps) {
  const router = useRouter();

  const longPressHandlers = useLongPress({
    onLongPress: () => onEnterSelectionMode?.(workspace.id),
    disabled: isSelectionMode || !onEnterSelectionMode,
  });

  const handleCardClick = (e: React.MouseEvent) => {
    // Only handle left-click (button 0), not right-click
    if (e.button !== 0) return;
    if (isSelectionMode && onSelectionClick) {
      onSelectionClick(workspace.id, e);
    } else {
      router.push(`/workspaces/${workspace.id}`);
    }
  };

  const card = (
    <motion.div
      key={workspace.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -4 }}
      onClick={handleCardClick}
      {...(isSelectionMode ? {} : longPressHandlers)}
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
          {!isSelectionMode && (
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
                <DropdownMenuItem onClick={() => onEdit(workspace)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {workspace.isArchived ? (
                  <DropdownMenuItem onClick={() => onUnarchive(workspace)}>
                    <ArchiveRestore className="mr-2 h-4 w-4" />
                    Unarchive
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => onArchive(workspace)}>
                    <Archive className="mr-2 h-4 w-4" />
                    Archive
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => onDelete(workspace)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
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
  );

  return (
    <EntityContextMenu
      entityId={workspace.id}
      entity={workspace}
      menuItems={contextMenuItems}
      isSelectionMode={isSelectionMode}
      isSelected={isSelected}
      onSelect={onSelect}
      onEnterSelectionMode={onEnterSelectionMode}
    >
      <SelectionOverlay
        isSelectionMode={isSelectionMode}
        isSelected={isSelected}
      >
        {card}
      </SelectionOverlay>
    </EntityContextMenu>
  );
}
