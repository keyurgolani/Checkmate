"use client";

/**
 * AI Generate Dialog Component
 *
 * Dialog for generating templates using AI from natural language queries.
 * Supports multiple LLM providers configured in user settings.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Bot,
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Settings,
  ChevronDown,
  Wand2,
} from "lucide-react";
import type { LLMSettings } from "@/lib/pocketbase-types";
import type { GeneratedTemplate } from "@/lib/services/llm";

// ============================================================================
// Types
// ============================================================================

interface Workspace {
  id: string;
  name: string;
}

interface AIGenerateDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  workspaces: Workspace[];
  defaultWorkspaceId: string;
  llmSettings: LLMSettings | null;
  onSuccess?: (templateId: string) => void;
}

type GenerationStep = "input" | "generating" | "preview" | "saving" | "success" | "error";

// ============================================================================
// Example Prompts
// ============================================================================

const EXAMPLE_PROMPTS = [
  "Moving to a new apartment checklist",
  "Launch a new product marketing campaign",
  "Plan a week-long vacation trip",
  "Onboard a new team member",
  "Organize a birthday party",
  "Prepare for a job interview",
  "Set up a home office",
  "Plan a wedding ceremony",
];

// ============================================================================
// Component
// ============================================================================

export function AIGenerateDialog({
  isOpen,
  onOpenChange,
  workspaces,
  defaultWorkspaceId,
  llmSettings,
  onSuccess,
}: AIGenerateDialogProps) {
  const router = useRouter();
  const [step, setStep] = React.useState<GenerationStep>("input");
  const [query, setQuery] = React.useState("");
  const [workspaceId, setWorkspaceId] = React.useState(defaultWorkspaceId);
  const [generatedTemplate, setGeneratedTemplate] = React.useState<GeneratedTemplate | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [createdTemplateId, setCreatedTemplateId] = React.useState<string | null>(null);

  // Reset state when dialog opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setStep("input");
      setQuery("");
      setWorkspaceId(defaultWorkspaceId);
      setGeneratedTemplate(null);
      setError(null);
      setCreatedTemplateId(null);
    }
  }, [isOpen, defaultWorkspaceId]);

  const isConfigured = llmSettings?.provider && llmSettings?.selectedModel;

  const handleGenerate = async () => {
    if (!query.trim() || !isConfigured) return;

    setStep("generating");
    setError(null);

    try {
      const response = await fetch("/api/llm/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: llmSettings,
          query: query.trim(),
        }),
      });

      const data = await response.json();

      if (data.success && data.template) {
        setGeneratedTemplate(data.template);
        setStep("preview");
      } else {
        setError(data.error?.message || "Failed to generate template");
        setStep("error");
      }
    } catch (err) {
      setError("Failed to connect to AI service");
      setStep("error");
    }
  };

  const handleSaveTemplate = async () => {
    if (!generatedTemplate || !workspaceId) return;

    setStep("saving");
    setError(null);

    try {
      // Step 1: Create the template with questions
      const templateResponse = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          title: generatedTemplate.title,
          description: generatedTemplate.description,
          resources: generatedTemplate.resources,
          questions: generatedTemplate.questions || [],
        }),
      });

      const templateData = await templateResponse.json();

      if (!templateData.success || !templateData.template) {
        throw new Error(templateData.error?.message || "Failed to create template");
      }

      const templateId = templateData.template.id;

      // Step 2: Create items for the template (with conditions)
      // Helper function to recursively create items with proper phase/task types
      const createItemsRecursively = async (
        items: typeof generatedTemplate.items,
        parentId?: string
      ) => {
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (!item) continue;
          
          // Build metadata with conditions if present
          const metadata = item.conditions && item.conditions.length > 0
            ? { conditions: item.conditions }
            : null;
          
          // Determine item type - respect the generated itemType (phase or task)
          // Default to 'task' if not specified
          const itemType = item.itemType === 'phase' ? 'phase' : 'task';
          
          // Phases don't need resources - they are organizational containers
          const resources = itemType === 'phase' ? null : (item.resources || null);
          
          const itemResponse = await fetch(`/api/templates/${templateId}/items`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              content: item.content,
              description: item.description || null,
              resources,
              metadata,
              itemType,
              position: i,
              parentId,
            }),
          });

          const itemData = await itemResponse.json();

          if (!itemData.success) {
            console.warn(`Failed to create item: ${item.content}`);
            continue;
          }

          // Recursively create children if any (with conditions)
          if (item.children && item.children.length > 0) {
            await createItemsRecursively(item.children, itemData.item.id);
          }
        }
      };

      await createItemsRecursively(generatedTemplate.items);

      setCreatedTemplateId(templateId);
      setStep("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save template");
      setStep("error");
    }
  };

  const handleViewTemplate = () => {
    if (createdTemplateId) {
      onOpenChange(false);
      router.push(`/templates/${createdTemplateId}`);
      router.refresh();
      onSuccess?.(createdTemplateId);
    }
  };

  const handleExampleClick = (example: string) => {
    setQuery(example);
  };

  // Count total items including children (recursive)
  const getTotalItemCount = (template: GeneratedTemplate): number => {
    const countItems = (items: typeof template.items): number => {
      let count = 0;
      for (const item of items) {
        count++;
        if (item.children) {
          count += countItems(item.children);
        }
      }
      return count;
    };
    return countItems(template.items);
  };

  // Count phases in the template
  const getPhaseCount = (template: GeneratedTemplate): number => {
    const countPhases = (items: typeof template.items): number => {
      let count = 0;
      for (const item of items) {
        if (item.itemType === 'phase') {
          count++;
        }
        if (item.children) {
          count += countPhases(item.children);
        }
      }
      return count;
    };
    return countPhases(template.items);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Generate Template with AI
          </DialogTitle>
          <DialogDescription>
            Describe what you want to create and AI will generate a complete checklist template for you.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {/* Not Configured State */}
          {!isConfigured && step === "input" && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="p-4 rounded-full bg-muted mb-4">
                <Settings className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium mb-2">AI Not Configured</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                Configure an AI provider in Settings to start generating templates with AI.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  router.push("/settings");
                }}
                className="gap-2"
              >
                <Settings className="h-4 w-4" />
                Go to Settings
              </Button>
            </div>
          )}

          {/* Input Step */}
          {isConfigured && step === "input" && (
            <div className="space-y-6">
              {/* Query Input */}
              <div className="space-y-2">
                <Label htmlFor="ai-query" className="text-sm font-medium">
                  What would you like to create?
                </Label>
                <textarea
                  id="ai-query"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Describe your checklist in detail. For example: 'A comprehensive checklist for planning a destination wedding, including venue selection, guest management, catering, and day-of coordination.'"
                  className="w-full min-h-[120px] px-4 py-3 text-sm rounded-xl border border-input bg-background shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Be specific about what you need. The more detail you provide, the better the result.
                </p>
              </div>

              {/* Workspace Selection */}
              <div className="space-y-2">
                <Label htmlFor="ai-workspace" className="text-sm font-medium">
                  Save to Workspace
                </Label>
                <div className="relative">
                  <select
                    id="ai-workspace"
                    value={workspaceId}
                    onChange={(e) => setWorkspaceId(e.target.value)}
                    className="w-full h-11 px-4 py-2 text-sm rounded-xl border border-input bg-background shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring appearance-none cursor-pointer"
                  >
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

              {/* Example Prompts */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">
                  Or try an example
                </Label>
                <div className="flex flex-wrap gap-2">
                  {EXAMPLE_PROMPTS.map((example) => (
                    <button
                      key={example}
                      onClick={() => handleExampleClick(example)}
                      className="px-3 py-1.5 text-xs rounded-full border border-border bg-muted/50 hover:bg-muted transition-colors"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>

              {/* Provider Info */}
              <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50 text-sm">
                <Sparkles className="h-4 w-4 text-primary shrink-0" />
                <span className="text-muted-foreground">
                  Using <span className="font-medium text-foreground">{llmSettings?.selectedModel}</span>
                </span>
              </div>
            </div>
          )}

          {/* Generating Step */}
          {step === "generating" && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="relative mb-6">
                <div className="p-4 rounded-full bg-primary/10">
                  <Wand2 className="h-8 w-8 text-primary" />
                </div>
                <div className="absolute inset-0 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
              </div>
              <h3 className="font-medium mb-2">Generating your template...</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                AI is creating a comprehensive checklist based on your description. This may take a moment.
              </p>
            </div>
          )}

          {/* Preview Step */}
          {step === "preview" && generatedTemplate && (
            <div className="space-y-4">
              {/* Template Header */}
              <div className="p-4 rounded-xl border bg-muted/30">
                <h3 className="font-semibold text-lg mb-1">{generatedTemplate.title}</h3>
                <p className="text-sm text-muted-foreground">{generatedTemplate.description}</p>
                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                  <span>{getTotalItemCount(generatedTemplate)} items</span>
                  {getPhaseCount(generatedTemplate) > 0 && (
                    <span>{getPhaseCount(generatedTemplate)} phases</span>
                  )}
                  {generatedTemplate.questions && generatedTemplate.questions.length > 0 && (
                    <span>{generatedTemplate.questions.length} questions</span>
                  )}
                  {generatedTemplate.resources && generatedTemplate.resources.length > 0 && (
                    <span>{generatedTemplate.resources.length} resources</span>
                  )}
                </div>
              </div>

              {/* Questions Preview */}
              {generatedTemplate.questions && generatedTemplate.questions.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Conditional Questions</Label>
                  <div className="space-y-2">
                    {generatedTemplate.questions.map((q, index) => (
                      <div key={q.id || index} className="flex items-start gap-3 p-3 rounded-lg border bg-primary/5">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium shrink-0">
                          Q{index + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{q.question}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {q.answerType === 'boolean' ? (
                              <>Yes/No • Default: {q.defaultValue ? 'Yes' : 'No'}</>
                            ) : (
                              <>Options: {q.enumOptions?.join(', ')} • Default: {String(q.defaultValue)}</>
                            )}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Items Preview */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                <Label className="text-sm font-medium">Items</Label>
                {generatedTemplate.items.map((item, index) => (
                  <div key={index} className="space-y-1">
                    <div className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border",
                      item.itemType === 'phase' 
                        ? "bg-primary/10 border-primary/30" 
                        : "bg-background"
                    )}>
                      <span className={cn(
                        "flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium shrink-0",
                        item.itemType === 'phase'
                          ? "bg-primary/20 text-primary"
                          : "bg-primary/10 text-primary"
                      )}>
                        {item.itemType === 'phase' ? 'P' : index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{item.content}</p>
                          {item.itemType === 'phase' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-medium">
                              Phase
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {item.description}
                          </p>
                        )}
                        {item.conditions && item.conditions.length > 0 && (
                          <p className="text-xs text-primary mt-1">
                            ⚡ Conditional
                          </p>
                        )}
                      </div>
                    </div>
                    {/* Children */}
                    {item.children && item.children.length > 0 && (
                      <div className="ml-9 space-y-1">
                        {item.children.map((child, childIndex) => (
                          <div
                            key={childIndex}
                            className={cn(
                              "flex items-start gap-2 p-2 rounded-lg border",
                              child.itemType === 'phase'
                                ? "bg-primary/5 border-primary/20"
                                : "border-dashed bg-muted/30"
                            )}
                          >
                            <span className="text-xs text-muted-foreground shrink-0">
                              {child.itemType === 'phase' ? 'P' : `${index + 1}.${childIndex + 1}`}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm">{child.content}</p>
                                {child.itemType === 'phase' && (
                                  <span className="text-[10px] px-1 py-0.5 rounded bg-primary/20 text-primary font-medium">
                                    Phase
                                  </span>
                                )}
                              </div>
                              {child.description && (
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                  {child.description}
                                </p>
                              )}
                              {child.conditions && child.conditions.length > 0 && (
                                <p className="text-xs text-primary mt-1">
                                  ⚡ Conditional
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Saving Step */}
          {step === "saving" && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
              <h3 className="font-medium mb-2">Saving template...</h3>
              <p className="text-sm text-muted-foreground">
                Creating your template and all its items.
              </p>
            </div>
          )}

          {/* Success Step */}
          {step === "success" && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-4 rounded-full bg-green-500/10 mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <h3 className="font-medium mb-2">Template Created!</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                Your AI-generated template has been saved and is ready to use.
              </p>
              <Button onClick={handleViewTemplate} className="gap-2">
                <Sparkles className="h-4 w-4" />
                View Template
              </Button>
            </div>
          )}

          {/* Error Step */}
          {step === "error" && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-4 rounded-full bg-destructive/10 mb-4">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <h3 className="font-medium mb-2">Something went wrong</h3>
              <p className="text-sm text-destructive mb-6 max-w-sm">{error}</p>
              <Button variant="outline" onClick={() => setStep("input")} className="gap-2">
                Try Again
              </Button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {(step === "input" || step === "preview") && isConfigured && (
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {step === "input" && (
              <Button
                onClick={handleGenerate}
                disabled={!query.trim()}
                className="gap-2"
              >
                <Wand2 className="h-4 w-4" />
                Generate
              </Button>
            )}
            {step === "preview" && (
              <>
                <Button variant="outline" onClick={() => setStep("input")}>
                  Edit Query
                </Button>
                <Button onClick={handleSaveTemplate} className="gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Save Template
                </Button>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
