"use client";

import { useState, useId } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link as LinkIcon, ChevronDown, Plus, ChevronUp, Trash2 } from "lucide-react";
import type { ResourceLink } from "@/lib/pocketbase-types";

// ============================================================================
// Resource Editor Component
// ============================================================================

export interface ResourceEditorProps {
  resources: ResourceLink[];
  onChange: (resources: ResourceLink[]) => void;
  canEdit?: boolean;
}

export function ResourceEditor({ resources, onChange, canEdit = true }: ResourceEditorProps) {
  const [isExpanded, setIsExpanded] = useState(resources.length > 0);
  const uniqueId = useId();

  const addResource = () => {
    onChange([...resources, { title: "", url: "" }]);
    setIsExpanded(true);
  };

  const updateResource = (index: number, field: keyof ResourceLink, value: string) => {
    const updated = [...resources];
    const currentResource = updated[index];
    if (currentResource) {
      updated[index] = {
        title: field === 'title' ? value : currentResource.title,
        url: field === 'url' ? value : currentResource.url,
        description: field === 'description' ? value : currentResource.description,
      };
    }
    onChange(updated);
  };

  const removeResource = (index: number) => {
    onChange(resources.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <LinkIcon className="h-4 w-4" />
          Resources
          {resources.length > 0 && (
            <span className="text-xs text-muted-foreground">({resources.length})</span>
          )}
        </Label>
        <div className="flex items-center gap-1">
          {resources.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-7 px-2"
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          )}
          {canEdit && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={addResource}
              className="h-7 px-2"
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {isExpanded && resources.length > 0 && (
        <div className="space-y-3 pl-1">
          {resources.map((resource, index) => (
            <div key={index} className="space-y-2 p-3 border rounded-lg bg-muted/30" role="group" aria-label={`Resource ${index + 1}`}>
              <div className="flex items-start gap-2">
                <div className="flex-1 space-y-2">
                  <div className="space-y-1">
                    <Label htmlFor={`resource-title-${uniqueId}-${index}`} className="sr-only">
                      Resource {index + 1} title
                    </Label>
                    <Input
                      id={`resource-title-${uniqueId}-${index}`}
                      value={resource.title}
                      onChange={(e) => updateResource(index, "title", e.target.value)}
                      placeholder="Resource title"
                      className="h-8 text-sm"
                      disabled={!canEdit}
                      aria-label={`Resource ${index + 1} title`}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`resource-url-${uniqueId}-${index}`} className="sr-only">
                      Resource {index + 1} URL
                    </Label>
                    <Input
                      id={`resource-url-${uniqueId}-${index}`}
                      value={resource.url}
                      onChange={(e) => updateResource(index, "url", e.target.value)}
                      placeholder="https://..."
                      type="url"
                      className="h-8 text-sm"
                      disabled={!canEdit}
                      aria-label={`Resource ${index + 1} URL`}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`resource-desc-${uniqueId}-${index}`} className="sr-only">
                      Resource {index + 1} description (optional)
                    </Label>
                    <Input
                      id={`resource-desc-${uniqueId}-${index}`}
                      value={resource.description || ""}
                      onChange={(e) => updateResource(index, "description", e.target.value)}
                      placeholder="Brief description (optional)"
                      className="h-8 text-sm"
                      disabled={!canEdit}
                      aria-label={`Resource ${index + 1} description (optional)`}
                    />
                  </div>
                </div>
                {canEdit && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeResource(index)}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    aria-label={`Remove resource ${index + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {resources.length === 0 && canEdit && (
        <p className="text-xs text-muted-foreground italic">
          Add links to documentation, tutorials, or other helpful materials for this step.
        </p>
      )}
    </div>
  );
}
