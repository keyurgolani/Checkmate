"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronsUpDown,
  FolderKanban,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Workspace } from "@/lib/pocketbase-types";

interface WorkspaceSwitcherProps {
  isCollapsed?: boolean;
  initialWorkspaces?: Workspace[];
}

// Local storage key for persisting selected workspace
const SELECTED_WORKSPACE_KEY = "checkmate_selected_workspace";

export function WorkspaceSwitcher({ isCollapsed = false, initialWorkspaces = [] }: WorkspaceSwitcherProps) {
  const router = useRouter();
  const [workspaces, setWorkspaces] = React.useState<Workspace[]>(initialWorkspaces);
  const [selectedWorkspace, setSelectedWorkspace] = React.useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  // Ensure component only renders on client to avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Update workspaces when initialWorkspaces prop changes
  React.useEffect(() => {
    setWorkspaces(initialWorkspaces);
  }, [initialWorkspaces]);

  // Restore selected workspace from localStorage or select first one
  React.useEffect(() => {
    if (workspaces.length === 0) {
      setSelectedWorkspace(null);
      return;
    }

    const savedWorkspaceId = localStorage.getItem(SELECTED_WORKSPACE_KEY);
    const savedWorkspace = workspaces.find((w) => w.id === savedWorkspaceId);
    
    if (savedWorkspace) {
      setSelectedWorkspace(savedWorkspace);
    } else {
      const firstWorkspace = workspaces[0] ?? null;
      if (firstWorkspace) {
        setSelectedWorkspace(firstWorkspace);
        localStorage.setItem(SELECTED_WORKSPACE_KEY, firstWorkspace.id);
      }
    }
  }, [workspaces]);

  const handleSelectWorkspace = (workspace: Workspace) => {
    setSelectedWorkspace(workspace);
    localStorage.setItem(SELECTED_WORKSPACE_KEY, workspace.id);
    setIsOpen(false);
  };

  const handleCreateWorkspace = () => {
    setIsOpen(false);
    router.push("/workspaces?create=true");
  };

  // Prevent hydration mismatch
  if (!mounted) {
    if (isCollapsed) {
      return (
        <div className="flex h-10 w-full items-center justify-center">
          <FolderKanban className="h-5 w-5 text-sidebar-foreground/50" aria-hidden="true" />
        </div>
      );
    }
    return (
      <div className="flex h-10 items-center gap-2 rounded-md px-3">
        <FolderKanban className="h-4 w-4 text-sidebar-foreground/50" aria-hidden="true" />
        <span className="text-sm text-sidebar-foreground/50">Workspace</span>
      </div>
    );
  }

  // No workspaces state
  if (workspaces.length === 0) {
    if (isCollapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCreateWorkspace}
              className="h-10 w-full text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Create workspace"
            >
              <Plus className="h-5 w-5" aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Create Workspace</TooltipContent>
        </Tooltip>
      );
    }
    return (
      <Button
        variant="ghost"
        onClick={handleCreateWorkspace}
        className="h-10 w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label="Create your first workspace"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        <span className="text-sm">Create Workspace</span>
      </Button>
    );
  }

  // Collapsed view with tooltip
  if (isCollapsed) {
    return (
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-full text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label={`Current workspace: ${selectedWorkspace?.name || "Select Workspace"}`}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
              >
                <FolderKanban className="h-5 w-5" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="right">
            {selectedWorkspace?.name || "Select Workspace"}
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent side="right" align="start" className="w-56" role="listbox" aria-label="Workspaces">
          <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {workspaces.map((workspace) => (
            <DropdownMenuItem
              key={workspace.id}
              onClick={() => handleSelectWorkspace(workspace)}
              className="flex items-center justify-between"
              role="option"
              aria-selected={selectedWorkspace?.id === workspace.id}
            >
              <span className="truncate">{workspace.name}</span>
              {selectedWorkspace?.id === workspace.id && (
                <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleCreateWorkspace}>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            <span>Create Workspace</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Expanded view
  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={isOpen}
          aria-label={`Select workspace, current: ${selectedWorkspace?.name || "none selected"}`}
          aria-haspopup="listbox"
          className={cn(
            "h-10 w-full justify-between gap-2 px-3",
            "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          )}
        >
          <div className="flex items-center gap-2 truncate">
            <FolderKanban className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate text-sm font-medium">
              {selectedWorkspace?.name || "Select Workspace"}
            </span>
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56" role="listbox" aria-label="Workspaces">
        <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {workspaces.map((workspace) => (
          <DropdownMenuItem
            key={workspace.id}
            onClick={() => handleSelectWorkspace(workspace)}
            className="flex items-center justify-between"
            role="option"
            aria-selected={selectedWorkspace?.id === workspace.id}
          >
            <span className="truncate">{workspace.name}</span>
            {selectedWorkspace?.id === workspace.id && (
              <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleCreateWorkspace}>
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          <span>Create Workspace</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
