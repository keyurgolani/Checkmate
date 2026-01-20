"use client";

/**
 * Step Editor Component
 *
 * Provides a modal/inline editor for template steps with support for:
 * - Text task editing
 * - Reference picker for selecting templates to reference
 * - Circular dependency warnings
 *
 * Requirements: 3.2, 3.3
 */

import { useState, useEffect, useRef, useCallback, useId } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ItemType } from "@/lib/pocketbase-types";
import type { Template, ResourceLink } from "@/lib/pocketbase-types";
import {
  Check,
  X,
  Link as LinkIcon,
  FileText,
  AlertTriangle,
  Search,
  Loader2,
  ChevronDown,
  Plus,
  Trash2,
  ExternalLink,
  ChevronUp,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

interface StepEditorProps {
  /** Initial content for the step */
  initialContent?: string;
  /** Initial description for the step */
  initialDescription?: string | null;
  /** Initial resources for the step */
  initialResources?: ResourceLink[] | null;
  /** Initial step type (task or reference) */
  initialType?: "task" | "reference";
  /** Initial reference ID if editing a reference step */
  initialReferenceId?: string | null;
  /** Current template ID (used for circular dependency detection) */
  currentTemplateId?: string;
  /** Callback when step is saved */
  onSave: (data: {
    content: string;
    description?: string | null;
    resources?: ResourceLink[] | null;
    itemType: "task" | "reference";
    referenceId?: string | null;
  }) => void;
  /** Callback when editing is cancelled */
  onCancel: () => void;
  /** Whether this is a new step (affects button text) */
  isNew?: boolean;
}

interface TemplateOption {
  id: string;
  title: string;
  description: string | null;
  stepCount?: number;
  hasCircularDependency?: boolean;
  circularDependencyChain?: string[];
}

interface CircularDependencyCheckResult {
  hasCycle: boolean;
  dependencyChain: string[];
  message?: string;
}


// ============================================================================
// Reference Picker Component
// ============================================================================

interface ReferencePickerProps {
  currentTemplateId?: string;
  selectedReferenceId: string | null;
  onSelect: (templateId: string | null, template?: TemplateOption) => void;
  onCircularDependencyDetected: (result: CircularDependencyCheckResult) => void;
}

function ReferencePicker({
  currentTemplateId,
  selectedReferenceId,
  onSelect,
  onCircularDependencyDetected,
}: ReferencePickerProps) {
  const uniqueId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] =
    useState<TemplateOption | null>(null);
  const [checkingDependency, setCheckingDependency] = useState<string | null>(
    null
  );
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Fetch templates when dropdown opens or search changes
  useEffect(() => {
    if (!isOpen) return;

    const fetchTemplates = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (searchQuery) {
          params.set("q", searchQuery);
        }
        params.set("limit", "20");

        const response = await fetch(`/api/templates?${params.toString()}`);
        if (!response.ok) {
          throw new Error("Failed to fetch templates");
        }

        const data = await response.json();
        if (data.success && data.templates) {
          // Filter out the current template to prevent self-reference
          const filteredTemplates = data.templates
            .filter(
              (bp: Template) =>
                !currentTemplateId || bp.id !== currentTemplateId
            )
            .map((bp: Template) => ({
              id: bp.id,
              title: bp.title,
              description: bp.description,
              stepCount: bp.instanceCount,
            }));

          setTemplates(filteredTemplates);
        }
      } catch (err) {
        console.error("Error fetching templates:", err);
        setError("Failed to load templates");
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchTemplates, 300);
    return () => clearTimeout(debounceTimer);
  }, [isOpen, searchQuery, currentTemplateId]);

  // Load selected template details if we have an initial reference
  useEffect(() => {
    if (selectedReferenceId && !selectedTemplate) {
      const fetchSelectedTemplate = async () => {
        try {
          const response = await fetch(
            `/api/templates/${selectedReferenceId}`
          );
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.template) {
              setSelectedTemplate({
                id: data.template.id,
                title: data.template.title,
                description: data.template.description,
              });
            }
          }
        } catch (err) {
          console.error("Error fetching selected template:", err);
        }
      };

      fetchSelectedTemplate();
    }
  }, [selectedReferenceId, selectedTemplate]);

  // Check for circular dependency when selecting a template
  const checkCircularDependency = useCallback(
    async (targetTemplateId: string): Promise<CircularDependencyCheckResult> => {
      if (!currentTemplateId) {
        return { hasCycle: false, dependencyChain: [] };
      }

      // Self-reference check
      if (targetTemplateId === currentTemplateId) {
        return {
          hasCycle: true,
          dependencyChain: [currentTemplateId, targetTemplateId],
          message: "A template cannot reference itself",
        };
      }

      try {
        const response = await fetch(
          `/api/templates/${currentTemplateId}/items`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              itemType: ItemType.REFERENCE,
              content: "Dependency check",
              referenceId: targetTemplateId,
              dryRun: true,
            }),
          }
        );

        // If we get a 400 with circular reference error, there's a cycle
        if (!response.ok) {
          const data = await response.json();
          if (data.error?.code === "ITEM_011") {
            return {
              hasCycle: true,
              dependencyChain: data.error.details?.dependencyChain || [],
              message: data.error.message,
            };
          }
        }

        return { hasCycle: false, dependencyChain: [] };
      } catch (err) {
        console.error("Error checking circular dependency:", err);
        return { hasCycle: false, dependencyChain: [] };
      }
    },
    [currentTemplateId]
  );

  const handleSelectTemplate = async (template: TemplateOption) => {
    setCheckingDependency(template.id);

    const result = await checkCircularDependency(template.id);

    setCheckingDependency(null);

    if (result.hasCycle) {
      setTemplates((prev) =>
        prev.map((bp) =>
          bp.id === template.id
            ? {
                ...bp,
                hasCircularDependency: true,
                circularDependencyChain: result.dependencyChain,
              }
            : bp
        )
      );
      onCircularDependencyDetected(result);
      return;
    }

    setSelectedTemplate(template);
    onSelect(template.id, template);
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleClearSelection = () => {
    setSelectedTemplate(null);
    onSelect(null);
  };

  return (
    <div className="space-y-2 relative" ref={dropdownRef}>
      <Label>Referenced Template</Label>

      {selectedTemplate ? (
        <div className="flex items-center gap-2 p-3 border rounded-lg bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <LinkIcon className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">
              {selectedTemplate.title}
            </p>
            {selectedTemplate.description && (
              <p className="text-xs text-muted-foreground truncate">
                {selectedTemplate.description}
              </p>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClearSelection}
            className="shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full justify-between"
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className="text-muted-foreground">Select a template...</span>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </Button>
      )}

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg max-h-80 overflow-hidden">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                id={`reference-search-${uniqueId}`}
                name={`reference-search-${uniqueId}`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search templates..."
                className="pl-8"
                autoComplete="off"
              />
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">
                  Loading...
                </span>
              </div>
            ) : error ? (
              <div className="p-4 text-center text-sm text-destructive">
                {error}
              </div>
            ) : templates.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {searchQuery
                  ? "No templates found"
                  : "No templates available"}
              </div>
            ) : (
              <div className="py-1">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    className={`w-full px-3 py-2 text-left hover:bg-accent transition-colors ${
                      template.hasCircularDependency
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    } ${checkingDependency === template.id ? "bg-accent" : ""}`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!template.hasCircularDependency && checkingDependency === null) {
                        handleSelectTemplate(template);
                      }
                    }}
                    disabled={
                      template.hasCircularDependency ||
                      checkingDependency !== null
                    }
                  >
                    <div className="flex items-start gap-2">
                      {checkingDependency === template.id ? (
                        <Loader2 className="h-4 w-4 mt-0.5 animate-spin text-muted-foreground shrink-0" />
                      ) : template.hasCircularDependency ? (
                        <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
                      ) : (
                        <FileText className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {template.title}
                        </p>
                        {template.description && (
                          <p className="text-xs text-muted-foreground truncate">
                            {template.description}
                          </p>
                        )}
                        {template.hasCircularDependency && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                            Would create circular dependency
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


// ============================================================================
// Resource Editor Component
// ============================================================================

interface ResourceEditorProps {
  resources: ResourceLink[];
  onChange: (resources: ResourceLink[]) => void;
}

function ResourceEditor({ resources, onChange }: ResourceEditorProps) {
  const [isExpanded, setIsExpanded] = useState(resources.length > 0);
  const uniqueId = useId();

  const addResource = () => {
    onChange([...resources, { title: "", url: "" }]);
    setIsExpanded(true);
  };

  const updateResource = (index: number, field: keyof ResourceLink, value: string) => {
    const updated = [...resources];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeResource = (index: number) => {
    onChange(resources.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <ExternalLink className="h-4 w-4" />
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
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={addResource}
            className="h-7 px-2"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isExpanded && resources.length > 0 && (
        <div className="space-y-3 pl-1">
          {resources.map((resource, index) => (
            <div key={index} className="space-y-2 p-3 border rounded-lg bg-muted/30">
              <div className="flex items-start gap-2">
                <div className="flex-1 space-y-2">
                  <Input
                    id={`resource-title-${uniqueId}-${index}`}
                    value={resource.title}
                    onChange={(e) => updateResource(index, "title", e.target.value)}
                    placeholder="Resource title"
                    className="h-8 text-sm"
                  />
                  <Input
                    id={`resource-url-${uniqueId}-${index}`}
                    value={resource.url}
                    onChange={(e) => updateResource(index, "url", e.target.value)}
                    placeholder="https://..."
                    type="url"
                    className="h-8 text-sm"
                  />
                  <Input
                    id={`resource-desc-${uniqueId}-${index}`}
                    value={resource.description || ""}
                    onChange={(e) => updateResource(index, "description", e.target.value)}
                    placeholder="Brief description (optional)"
                    className="h-8 text-sm"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeResource(index)}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {resources.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Add helpful links like documentation, tutorials, or tools.
        </p>
      )}
    </div>
  );
}

// ============================================================================
// Circular Dependency Warning Component
// ============================================================================

interface CircularDependencyWarningProps {
  result: CircularDependencyCheckResult;
  onDismiss: () => void;
}

function CircularDependencyWarning({
  result,
  onDismiss,
}: CircularDependencyWarningProps) {
  return (
    <div className="p-3 border border-amber-200 dark:border-amber-800 rounded-lg bg-amber-50 dark:bg-amber-950">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-medium text-sm text-amber-800 dark:text-amber-200">
            Circular Dependency Detected
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
            {result.message ||
              "Adding this reference would create a circular dependency."}
          </p>
          {result.dependencyChain.length > 0 && (
            <div className="mt-2 p-2 bg-amber-100 dark:bg-amber-900 rounded text-xs font-mono">
              <p className="text-amber-800 dark:text-amber-200">
                Dependency chain:
              </p>
              <p className="text-amber-700 dark:text-amber-300 mt-1">
                {result.dependencyChain.join(" → ")}
              </p>
            </div>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="shrink-0 -mt-1 -mr-1"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Step Editor Component
// ============================================================================

export function StepEditor({
  initialContent = "",
  initialDescription = null,
  initialResources = null,
  initialType = "task",
  initialReferenceId = null,
  currentTemplateId,
  onSave,
  onCancel,
  isNew = false,
}: StepEditorProps) {
  const uniqueId = useId();
  const [content, setContent] = useState(initialContent);
  const [description, setDescription] = useState(initialDescription || "");
  const [resources, setResources] = useState<ResourceLink[]>(initialResources || []);
  const [stepType, setStepType] = useState<"task" | "reference">(initialType);
  const [referenceId, setReferenceId] = useState<string | null>(
    initialReferenceId
  );
  const [error, setError] = useState<string | null>(null);
  const [circularDependencyWarning, setCircularDependencyWarning] =
    useState<CircularDependencyCheckResult | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(
    Boolean(initialDescription) || (initialResources && initialResources.length > 0)
  );
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      if (!isNew) {
        inputRef.current.select();
      }
    }
  }, [isNew]);

  const handleSave = () => {
    if (!content.trim()) {
      setError("Content is required");
      return;
    }

    if (stepType === "reference" && !referenceId) {
      setError("Please select a template to reference");
      return;
    }

    if (circularDependencyWarning?.hasCycle) {
      setError("Cannot save: circular dependency detected");
      return;
    }

    // Filter out empty resources
    const validResources = resources.filter(r => r.title.trim() && r.url.trim());

    onSave({
      content: content.trim(),
      description: description.trim() || null,
      resources: validResources.length > 0 ? validResources : null,
      itemType: stepType,
      referenceId: stepType === "reference" ? referenceId : null,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      onCancel();
    }
  };

  const handleReferenceSelect = (
    templateId: string | null,
    template?: TemplateOption
  ) => {
    setReferenceId(templateId);
    setError(null);
    setCircularDependencyWarning(null);

    // Auto-fill content with template title if content is empty
    if (templateId && template && !content.trim()) {
      setContent(template.title);
    }
  };

  const handleCircularDependencyDetected = (
    result: CircularDependencyCheckResult
  ) => {
    setCircularDependencyWarning(result);
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-card relative">
      {/* Step Type Selector */}
      <div className="space-y-2">
        <Label>Step Type</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={stepType === "task" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setStepType("task");
              setReferenceId(null);
              setError(null);
              setCircularDependencyWarning(null);
            }}
          >
            <FileText className="h-4 w-4 mr-2" />
            Task
          </Button>
          <Button
            type="button"
            variant={stepType === "reference" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setStepType("reference");
              setError(null);
            }}
          >
            <LinkIcon className="h-4 w-4 mr-2" />
            Reference
          </Button>
        </div>
      </div>

      {/* Content Input */}
      <div className="space-y-2">
        <Label htmlFor={`step-content-${uniqueId}`}>
          {stepType === "task" ? "Task Description" : "Reference Label"}
        </Label>
        <Input
          ref={inputRef}
          id={`step-content-${uniqueId}`}
          name={`step-content-${uniqueId}`}
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            setError(null);
          }}
          onKeyDown={handleKeyDown}
          placeholder={
            stepType === "task"
              ? "Enter task description..."
              : "Enter a label for this reference..."
          }
          autoComplete="off"
        />
        {stepType === "reference" && (
          <p className="text-xs text-muted-foreground">
            This label will be displayed for the reference. You can use the
            template title or a custom description.
          </p>
        )}
      </div>

      {/* Reference Picker */}
      {stepType === "reference" && (
        <ReferencePicker
          currentTemplateId={currentTemplateId}
          selectedReferenceId={referenceId}
          onSelect={handleReferenceSelect}
          onCircularDependencyDetected={handleCircularDependencyDetected}
        />
      )}

      {/* Advanced Options Toggle */}
      <div className="border-t pt-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full justify-between text-muted-foreground hover:text-foreground"
        >
          <span className="text-sm">
            {showAdvanced ? "Hide" : "Show"} description & resources
          </span>
          {showAdvanced ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Description and Resources (Advanced) */}
      {showAdvanced && (
        <div className="space-y-4 pt-2">
          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor={`step-description-${uniqueId}`}>
              Description
            </Label>
            <textarea
              id={`step-description-${uniqueId}`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add detailed instructions or notes for this step..."
              className="w-full min-h-[80px] px-3 py-2 text-sm rounded-md border border-input bg-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
            />
            <p className="text-xs text-muted-foreground">
              Provide additional context or instructions for completing this step.
            </p>
          </div>

          {/* Resources */}
          <ResourceEditor resources={resources} onChange={setResources} />
        </div>
      )}

      {/* Circular Dependency Warning */}
      {circularDependencyWarning?.hasCycle && (
        <CircularDependencyWarning
          result={circularDependencyWarning}
          onDismiss={() => setCircularDependencyWarning(null)}
        />
      )}

      {/* Error Message */}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleSave}
          disabled={circularDependencyWarning?.hasCycle}
        >
          <Check className="h-4 w-4 mr-2" />
          {isNew ? "Add Step" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}

// Keep backward compatibility alias
export { StepEditor as ItemEditor };
