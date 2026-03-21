"use client";

import * as React from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { CheckSquare, Square } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface ContextMenuItemConfig<T = unknown> {
  label: string | ((entity: T) => string);
  icon: LucideIcon | ((entity: T) => LucideIcon);
  action: (id: string, entity: T) => void;
  variant?: "default" | "destructive";
  separator?: "before" | "after";
  submenu?: ContextMenuItemConfig<T>[];
}

interface EntityContextMenuProps<T> {
  children: React.ReactNode;
  entityId: string;
  entity: T;
  menuItems: ContextMenuItemConfig<T>[];
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  onEnterSelectionMode?: (id: string) => void;
  disabled?: boolean;
}

function resolveLabel<T>(label: string | ((entity: T) => string), entity: T): string {
  return typeof label === "function" ? label(entity) : label;
}

function resolveIcon<T>(icon: LucideIcon | ((entity: T) => LucideIcon), entity: T): LucideIcon {
  // LucideIcon components are forwardRef objects (typeof === "object" with a render function).
  // Factory functions are plain functions (typeof === "function").
  if (typeof icon === "function") {
    return (icon as (entity: T) => LucideIcon)(entity);
  }
  // It's a React component (forwardRef object) — return as-is
  return icon;
}

export function EntityContextMenu<T>({
  children,
  entityId,
  entity,
  menuItems,
  isSelectionMode = false,
  isSelected = false,
  onSelect,
  onEnterSelectionMode,
  disabled = false,
}: EntityContextMenuProps<T>) {
  if (disabled) {
    return <>{children}</>;
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent>
        {isSelectionMode && onSelect && (
          <>
            <ContextMenuItem onSelect={() => onSelect(entityId)}>
              {isSelected ? (
                <Square className="size-4" />
              ) : (
                <CheckSquare className="size-4" />
              )}
              {isSelected ? "Deselect" : "Select"}
            </ContextMenuItem>
            <ContextMenuSeparator />
          </>
        )}

        {menuItems.map((item, index) => {
          const label = resolveLabel(item.label, entity);
          const Icon = resolveIcon(item.icon, entity);

          return (
            <React.Fragment key={`${label}-${index}`}>
              {item.separator === "before" && <ContextMenuSeparator />}

              {item.submenu ? (
                <ContextMenuSub>
                  <ContextMenuSubTrigger>
                    <Icon className="size-4" />
                    {label}
                  </ContextMenuSubTrigger>
                  <ContextMenuSubContent>
                    {item.submenu.map((subItem, subIndex) => {
                      const subLabel = resolveLabel(subItem.label, entity);
                      const SubIcon = resolveIcon(subItem.icon, entity);
                      return (
                        <ContextMenuItem
                          key={`${subLabel}-${subIndex}`}
                          variant={subItem.variant}
                          onSelect={() => subItem.action(entityId, entity)}
                        >
                          <SubIcon className="size-4" />
                          {subLabel}
                        </ContextMenuItem>
                      );
                    })}
                  </ContextMenuSubContent>
                </ContextMenuSub>
              ) : (
                <ContextMenuItem
                  variant={item.variant}
                  onSelect={() => item.action(entityId, entity)}
                >
                  <Icon className="size-4" />
                  {label}
                </ContextMenuItem>
              )}

              {item.separator === "after" && <ContextMenuSeparator />}
            </React.Fragment>
          );
        })}

        {!isSelectionMode && onEnterSelectionMode && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onSelect={() => onEnterSelectionMode(entityId)}>
              <CheckSquare className="size-4" />
              Select
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
