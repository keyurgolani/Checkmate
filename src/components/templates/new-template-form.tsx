"use client";

/**
 * New Template Form Component
 *
 * Form for creating a new template with title, description, and workspace selection.
 *
 * Requirements: 3.1 - Template creation with owner and default visibility
 */

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, ChevronDown } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

interface Workspace {
  id: string;
  name: string;
}

interface NewTemplateFormProps {
  workspaces: Workspace[];
  defaultWorkspaceId?: string;
}

// ============================================================================
// New Template Form Component
// ============================================================================

export function NewTemplateForm({
  workspaces,
  defaultWorkspaceId,
}: NewTemplateFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [workspaceId, setWorkspaceId] = useState(defaultWorkspaceId ?? "");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;
    setError(null);

    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    if (!workspaceId) {
      setError("Please select a workspace");
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          title: title.trim(),
          description: description.trim() || null,
          category: category.trim() || null,
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      });

      const data = await response.json();

      if (data.success && data.template) {
        // Redirect to the new template's editor
        router.push(`/templates/${data.template.id}`);
      } else {
        setError(data.error?.message ?? "Failed to create template");
      }
    } catch (err) {
      console.error("Failed to create template:", err);
      setError("An unexpected error occurred");
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };


  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="rounded-3xl border bg-card/50 backdrop-blur-xl shadow-xl overflow-hidden">
        <CardHeader className="border-b border-border/50 bg-muted/20 pb-4">
          <CardTitle className="text-xl font-semibold">Template Details</CardTitle>
        </CardHeader>
        <CardContent className="p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter template title"
                maxLength={200}
                required
                autoComplete="off"
                className="rounded-xl h-11 bg-background/50 focus:bg-background transition-colors"
              />
              <p className="text-xs text-muted-foreground text-right">
                {title.length}/200 characters
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">Description</Label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description (optional)"
                className="w-full min-h-[120px] px-4 py-3 text-sm rounded-xl border border-input bg-background/50 shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none focus:bg-background transition-colors"
                rows={4}
                autoComplete="off"
              />
            </div>

            {/* Workspace */}
            <div className="space-y-2">
              <Label htmlFor="workspace" className="text-sm font-medium">
                Workspace <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <select
                  id="workspace"
                  value={workspaceId}
                  onChange={(e) => setWorkspaceId(e.target.value)}
                  className="w-full h-11 px-4 py-2 text-sm rounded-xl border border-input bg-background/50 shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring appearance-none focus:bg-background transition-colors cursor-pointer"
                  required
                >
                  <option value="">Select a workspace</option>
                  {workspaces.map((ws) => (
                    <option key={ws.id} value={ws.id}>
                      {ws.name}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                  <ChevronDown className="h-4 w-4" />
                </div>
              </div>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category" className="text-sm font-medium">Category</Label>
              <Input
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g., Travel, Home, Work"
                className="rounded-xl h-11 bg-background/50 focus:bg-background transition-colors"
              />
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label htmlFor="tags" className="text-sm font-medium">Tags</Label>
              <Input
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Enter tags separated by commas"
                className="rounded-xl h-11 bg-background/50 focus:bg-background transition-colors"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm border border-destructive/20 flex items-center justify-center">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isSubmitting}
                className="rounded-xl h-11 px-6 hover:bg-muted/50"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="rounded-xl h-11 px-6 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Create Template
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
