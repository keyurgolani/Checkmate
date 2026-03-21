"use client";

import { useState, useCallback, useEffect, useMemo } from "react";

interface UseSelectionReturn {
  isSelectionMode: boolean;
  selectedIds: Set<string>;
  lastSelectedId: string | null;
  enterSelectionMode: (initialId?: string) => void;
  exitSelectionMode: () => void;
  toggleItem: (id: string) => void;
  handleClick: (id: string, event: React.MouseEvent) => void;
  selectAll: () => void;
  deselectAll: () => void;
  isSelected: (id: string) => boolean;
  announcement: string;
}

export function useSelection(orderedIds: string[]): UseSelectionReturn {
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

  const enterSelectionMode = useCallback((initialId?: string) => {
    setIsSelectionMode(true);
    if (initialId) {
      setSelectedIds(new Set([initialId]));
      setLastSelectedId(initialId);
    }
  }, []);

  const exitSelectionMode = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
    setLastSelectedId(null);
  }, []);

  const toggleItem = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    setLastSelectedId(id);
  }, []);

  const handleClick = useCallback(
    (id: string, event: React.MouseEvent) => {
      if (!isSelectionMode) return;

      // Prevent browser text selection on shift+click and ctrl+click
      event.preventDefault();

      const isCtrlOrCmd = event.metaKey || event.ctrlKey;
      const isShift = event.shiftKey;

      if (isShift && lastSelectedId) {
        const startIndex = orderedIds.indexOf(lastSelectedId);
        const endIndex = orderedIds.indexOf(id);
        if (startIndex !== -1 && endIndex !== -1) {
          const [from, to] =
            startIndex < endIndex
              ? [startIndex, endIndex]
              : [endIndex, startIndex];
          const rangeIds = orderedIds.slice(from, to + 1);
          setSelectedIds((prev) => {
            const next = new Set(prev);
            for (const rangeId of rangeIds) {
              next.add(rangeId);
            }
            return next;
          });
        }
      } else if (isCtrlOrCmd) {
        toggleItem(id);
      } else {
        setSelectedIds(new Set([id]));
        setLastSelectedId(id);
      }
    },
    [isSelectionMode, lastSelectedId, orderedIds, toggleItem]
  );

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(orderedIds));
  }, [orderedIds]);

  const deselectAll = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
    setLastSelectedId(null);
  }, []);

  const isSelected = useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds]
  );

  const announcement = useMemo(() => {
    if (!isSelectionMode) return "Selection cleared";
    const count = selectedIds.size;
    if (count === 0) return "No items selected";
    if (count === 1) return "1 item selected";
    return `${count} items selected`;
  }, [isSelectionMode, selectedIds.size]);

  // Keyboard shortcuts and text selection prevention
  useEffect(() => {
    if (!isSelectionMode) return;

    // Prevent text selection while in selection mode
    document.body.style.userSelect = "none";
    document.body.style.webkitUserSelect = "none";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        exitSelectionMode();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "a") {
        e.preventDefault();
        selectAll();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.userSelect = "";
      document.body.style.webkitUserSelect = "";
    };
  }, [isSelectionMode, exitSelectionMode, selectAll]);

  return {
    isSelectionMode,
    selectedIds,
    lastSelectedId,
    enterSelectionMode,
    exitSelectionMode,
    toggleItem,
    handleClick,
    selectAll,
    deselectAll,
    isSelected,
    announcement,
  };
}
