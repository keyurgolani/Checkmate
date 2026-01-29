"use client";

/**
 * Visibility Settings Panel Component
 *
 * Provides visibility management for templates including:
 * - Visibility selector (private/public/shared)
 * - Collaborator management interface
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5 - Visibility management
 * Requirements: 13.3 - Proper ARIA labels for interactive elements
 * Requirements: 13.4 - Announce state changes to screen readers
 */

import { useState, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  Globe,
  Lock,
  Users,
  UserPlus,
  Loader2,
  ChevronDown,
  Trash2,
  Check,
  AlertCircle,
  Settings,
} from "lucide-react";
import { Visibility, PermissionLevel } from "@/lib/pocketbase-types";
import { LiveRegion } from "@/components/ui/live-region";

// ============================================================================
// Types
// ============================================================================

export interface CollaboratorData {
  id: string;
  templateId: string;
  userId: string;
  permissionLevel: string;
  invitedAt: string;
  acceptedAt: string | null;
  user?: {
    id: string;
    email: string;
    displayName: string | null;
  };
}

interface VisibilitySettingsPanelProps {
  templateId: string;
  currentVisibility: string;
  isOwner: boolean;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onVisibilityChange?: (visibility: string) => void;
}

// ============================================================================
// Constants
// ============================================================================

const VISIBILITY_OPTIONS = [
  {
    value: Visibility.PRIVATE,
    label: "Private",
    description: "Only you can access this template",
    icon: Lock,
    className: "text-destructive",
    bgClass: "bg-destructive/10 border-destructive/20",
  },
  {
    value: Visibility.PUBLIC,
    label: "Public",
    description: "Anyone can view this template",
    icon: Globe,
    className: "text-green-600 dark:text-green-400",
    bgClass: "bg-green-500/10 border-green-500/20",
  },
  {
    value: Visibility.SHARED,
    label: "Shared",
    description: "Only you and collaborators can access",
    icon: Users,
    className: "text-blue-600 dark:text-blue-400",
    bgClass: "bg-blue-500/10 border-blue-500/20",
  },
];

const PERMISSION_OPTIONS = [
  { value: PermissionLevel.VIEWER, label: "Viewer", description: "Can view only" },
  { value: PermissionLevel.EDITOR, label: "Editor", description: "Can view and edit" },
  { value: PermissionLevel.ADMIN, label: "Admin", description: "Can manage collaborators" },
];

// ============================================================================
// Visibility Settings Panel Component
// ============================================================================

export function VisibilitySettingsPanel({
  templateId,
  currentVisibility,
  isOwner,
  isOpen,
  onOpenChange,
  onVisibilityChange,
}: VisibilitySettingsPanelProps) {
  const [visibility, setVisibility] = useState(currentVisibility);
  const [collaborators, setCollaborators] = useState<CollaboratorData[]>([]);
  const [isLoadingCollaborators, setIsLoadingCollaborators] = useState(false);
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePermission, setInvitePermission] = useState<PermissionLevel>(PermissionLevel.VIEWER);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [statusAnnouncement, setStatusAnnouncement] = useState("");

  const loadCollaborators = useCallback(async () => {
    setIsLoadingCollaborators(true);
    try {
      const response = await fetch(`/api/templates/${templateId}/collaborators`);
      const data = await response.json();
      if (data.success && data.collaborators) {
        setCollaborators(data.collaborators);
      }
    } catch (err) {
      console.error("Failed to load collaborators:", err);
    } finally {
      setIsLoadingCollaborators(false);
    }
  }, [templateId]);

  useEffect(() => {
    setVisibility(currentVisibility);
  }, [currentVisibility]);

  useEffect(() => {
    if (isOpen) loadCollaborators();
  }, [isOpen, loadCollaborators]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [successMessage]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [error]);

  const handleVisibilityChange = useCallback(
    async (newVisibility: Visibility) => {
      if (!isOwner) return;

      if (newVisibility === Visibility.SHARED && collaborators.length === 0) {
        setError("Add at least one collaborator before setting visibility to Shared");
        setStatusAnnouncement("Error: Add at least one collaborator before setting visibility to Shared");
        return;
      }

      setIsUpdatingVisibility(true);
      setError(null);

      try {
        const response = await fetch(`/api/templates/${templateId}/visibility`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visibility: newVisibility }),
        });

        const data = await response.json();

        if (data.success) {
          setVisibility(newVisibility);
          setSuccessMessage("Visibility updated successfully");
          setStatusAnnouncement(`Visibility changed to ${newVisibility}`);
          onVisibilityChange?.(newVisibility);
        } else {
          setError(data.error?.message || "Failed to update visibility");
          setStatusAnnouncement(`Error: ${data.error?.message || "Failed to update visibility"}`);
        }
      } catch (err) {
        console.error("Failed to update visibility:", err);
        setError("Failed to update visibility");
        setStatusAnnouncement("Error: Failed to update visibility");
      } finally {
        setIsUpdatingVisibility(false);
      }
    },
    [templateId, isOwner, collaborators.length, onVisibilityChange]
  );

  const handleInviteCollaborator = useCallback(async () => {
    if (!inviteEmail.trim()) {
      setError("Please enter an email address");
      setStatusAnnouncement("Error: Please enter an email address");
      return;
    }

    setIsInviting(true);
    setError(null);

    try {
      const response = await fetch(`/api/templates/${templateId}/collaborators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), permissionLevel: invitePermission }),
      });

      const data = await response.json();

      if (data.success) {
        setInviteEmail("");
        setSuccessMessage("Invitation sent successfully");
        setStatusAnnouncement(`Invitation sent to ${inviteEmail}`);
        await loadCollaborators();
      } else {
        setError(data.error?.message || "Failed to invite collaborator");
        setStatusAnnouncement(`Error: ${data.error?.message || "Failed to invite collaborator"}`);
      }
    } catch (err) {
      console.error("Failed to invite collaborator:", err);
      setError("Failed to invite collaborator");
      setStatusAnnouncement("Error: Failed to invite collaborator");
    } finally {
      setIsInviting(false);
    }
  }, [templateId, inviteEmail, invitePermission, loadCollaborators]);

  const handleUpdatePermission = useCallback(
    async (collaboratorId: string, newPermission: PermissionLevel) => {
      try {
        const response = await fetch(`/api/collaborators/${collaboratorId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ permissionLevel: newPermission }),
        });

        const data = await response.json();

        if (data.success) {
          setCollaborators((prev) =>
            prev.map((c) => (c.id === collaboratorId ? { ...c, permissionLevel: newPermission } : c))
          );
          setSuccessMessage("Permission updated");
          setStatusAnnouncement(`Permission updated to ${newPermission}`);
        } else {
          setError(data.error?.message || "Failed to update permission");
          setStatusAnnouncement(`Error: ${data.error?.message || "Failed to update permission"}`);
        }
      } catch (err) {
        console.error("Failed to update permission:", err);
        setError("Failed to update permission");
        setStatusAnnouncement("Error: Failed to update permission");
      }
    },
    []
  );

  const handleRemoveCollaborator = useCallback(async (collaboratorId: string) => {
    try {
      const response = await fetch(`/api/collaborators/${collaboratorId}`, { method: "DELETE" });
      const data = await response.json();

      if (data.success) {
        setCollaborators((prev) => prev.filter((c) => c.id !== collaboratorId));
        setSuccessMessage("Collaborator removed");
        setStatusAnnouncement("Collaborator removed");
      } else {
        setError(data.error?.message || "Failed to remove collaborator");
        setStatusAnnouncement(`Error: ${data.error?.message || "Failed to remove collaborator"}`);
      }
    } catch (err) {
      console.error("Failed to remove collaborator:", err);
      setError("Failed to remove collaborator");
      setStatusAnnouncement("Error: Failed to remove collaborator");
    }
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden" aria-label="Visibility settings">
        <LiveRegion message={statusAnnouncement} politeness={error ? "assertive" : "polite"} />
        
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Visibility Settings</DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                Control who can access this template
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh]">
          <div className="p-6 space-y-6">
            {/* Error/Success Messages */}
            {error && (
              <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 dark:bg-red-950/50 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-800/50" role="alert">
                <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            {successMessage && (
              <div className="flex items-center gap-2 p-3 text-sm text-green-600 bg-green-50 dark:bg-green-950/50 dark:text-green-400 rounded-xl border border-green-200 dark:border-green-800/50" role="status">
                <Check className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Visibility Selector */}
            <fieldset className="space-y-3">
              <legend className="text-sm font-medium">Visibility</legend>
              <div className="grid gap-2" role="radiogroup" aria-label="Template visibility options">
                {VISIBILITY_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const isSelected = visibility === option.value;
                  const isDisabled = !isOwner || isUpdatingVisibility;

                  return (
                    <button
                      key={option.value}
                      onClick={() => handleVisibilityChange(option.value)}
                      disabled={isDisabled}
                      role="radio"
                      aria-checked={isSelected}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                        isSelected
                          ? `${option.bgClass} border-current`
                          : "border-border hover:border-primary/30 hover:bg-muted/50"
                      } ${isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      <div className={`p-2 rounded-lg ${isSelected ? "bg-background/50" : "bg-muted"}`}>
                        <Icon className={`h-4 w-4 ${option.className}`} aria-hidden="true" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{option.label}</span>
                          {isSelected && <Check className="h-4 w-4 text-primary" aria-hidden="true" />}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{option.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <Separator />

            {/* Collaborators Section */}
            <div className="space-y-4" role="region" aria-label="Collaborators management">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Collaborators</Label>
                {isLoadingCollaborators && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="Loading collaborators" />
                )}
              </div>

              {/* Invite Form */}
              {isOwner && (
                <div className="space-y-3 p-4 rounded-xl bg-muted/30 border">
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="Enter email address"
                      autoComplete="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && inviteEmail.trim()) handleInviteCollaborator();
                      }}
                      className="flex-1 rounded-lg"
                      aria-label="Collaborator email address"
                    />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="w-28 rounded-lg">
                          {PERMISSION_OPTIONS.find((p) => p.value === invitePermission)?.label}
                          <ChevronDown className="h-4 w-4 ml-1" aria-hidden="true" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl">
                        {PERMISSION_OPTIONS.map((option) => (
                          <DropdownMenuItem key={option.value} onClick={() => setInvitePermission(option.value)} className="rounded-lg">
                            <div>
                              <div className="font-medium">{option.label}</div>
                              <div className="text-xs text-muted-foreground">{option.description}</div>
                            </div>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <Button onClick={handleInviteCollaborator} disabled={isInviting || !inviteEmail.trim()} className="w-full rounded-lg" size="sm">
                    {isInviting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden="true" />
                    ) : (
                      <UserPlus className="h-4 w-4 mr-2" aria-hidden="true" />
                    )}
                    Invite Collaborator
                  </Button>
                </div>
              )}

              {/* Collaborators List */}
              <div className="space-y-2" role="list" aria-label={`${collaborators.length} collaborators`}>
                {collaborators.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="p-3 rounded-full bg-muted/50 inline-block mb-3">
                      <Users className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">No collaborators yet</p>
                  </div>
                ) : (
                  collaborators.map((collaborator) => (
                    <CollaboratorItem
                      key={collaborator.id}
                      collaborator={collaborator}
                      isOwner={isOwner}
                      onUpdatePermission={handleUpdatePermission}
                      onRemove={handleRemoveCollaborator}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Collaborator Item Component
// ============================================================================

interface CollaboratorItemProps {
  collaborator: CollaboratorData;
  isOwner: boolean;
  onUpdatePermission: (collaboratorId: string, permission: PermissionLevel) => void;
  onRemove: (collaboratorId: string) => void;
}

function CollaboratorItem({ collaborator, isOwner, onUpdatePermission, onRemove }: CollaboratorItemProps) {
  const displayName = collaborator.user?.displayName || collaborator.user?.email || "Unknown User";
  const email = collaborator.user?.email || "";
  const isPending = !collaborator.acceptedAt;
  const currentPermission = PERMISSION_OPTIONS.find((p) => p.value === collaborator.permissionLevel);

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-muted/30 transition-colors" role="listitem">
      <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-sm font-medium text-primary" aria-hidden="true">
        {displayName.charAt(0).toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{displayName}</span>
          {isPending && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 font-medium">
              Pending
            </span>
          )}
        </div>
        {email && displayName !== email && (
          <p className="text-xs text-muted-foreground truncate">{email}</p>
        )}
      </div>

      {isOwner ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 px-2 rounded-lg">
              {currentPermission?.label || "Viewer"}
              <ChevronDown className="h-3 w-3 ml-1" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl">
            {PERMISSION_OPTIONS.map((option) => (
              <DropdownMenuItem key={option.value} onClick={() => onUpdatePermission(collaborator.id, option.value)} className="rounded-lg">
                <div className="flex items-center gap-2">
                  {collaborator.permissionLevel === option.value && <Check className="h-4 w-4" aria-hidden="true" />}
                  <span className={collaborator.permissionLevel !== option.value ? "ml-6" : ""}>{option.label}</span>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <span className="text-xs text-muted-foreground">{currentPermission?.label || "Viewer"}</span>
      )}

      {isOwner && (
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive" onClick={() => onRemove(collaborator.id)}>
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}
