"use client";

/**
 * Edit Checklist Dialog Component
 * 
 * Dialog for editing checklist details (currently just the name).
 * Includes validation and error handling.
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface EditChecklistDialogProps {
  checklistId: string;
  currentName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (newName: string) => void;
}

export function EditChecklistDialog({
  checklistId,
  currentName,
  open,
  onOpenChange,
  onSuccess,
}: EditChecklistDialogProps) {
  const [name, setName] = useState(currentName);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setName(currentName);
      setError(null);
    }
    onOpenChange(newOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate name
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Checklist name is required");
      return;
    }

    if (trimmedName === currentName) {
      // No change, just close
      onOpenChange(false);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/checklists/${checklistId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: trimmedName }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to update checklist");
      }

      // Success
      onSuccess(trimmedName);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Checklist</DialogTitle>
            <DialogDescription>
              Update the name of your checklist.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="space-y-2">
              <Label htmlFor="checklist-name">Checklist Name</Label>
              <Input
                id="checklist-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter checklist name"
                disabled={isSubmitting}
                autoFocus
              />
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
