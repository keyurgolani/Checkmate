"use client";

/**
 * AI Improve Dialog Component
 *
 * Dialog for improving templates or individual steps using AI.
 */

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Plus,
  Lightbulb,
  Link2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { LLMSettings, ResourceLink } from "@/lib/pocketbase-types";
import type { TemplateImprovements, StepImprovement, GeneratedTemplateItem } from "@/lib/services/llm";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";

// ============================================================================
// Types
// ============================================================================

interface AIImproveTemplateDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  llmSettings: LLMSettings | null;
  template: {
    id: string;
    title: string;
    description: string | null;
    items: Array<{ id: string; content: string; description?: string | null }>;
  };
  onAddItems: (items: GeneratedTemplateItem[]) => Promise<void>;
  onUpdateTemplate?: (updates: { title?: string; description?: string }) => Promise<void>;
}

interface AIImproveStepDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  llmSettings: LLMSettings | null;
  step: {
    id: string;
    content: string;
    description?: string | null;
    resources?: ResourceLink[] | null;
  };
  templateContext: {
    title: string;
    description: string | null;
    resources?: ResourceLink[] | null;
    allSteps: Array<{ content: string; description?: string | null }>;
    currentStepIndex: number;
  };
  onApplyImprovement: (improvement: {
    content: string;
    description: string;
    resources?: ResourceLink[];
  }) => Promise<void>;
  onAddSubSteps?: (subSteps: Array<{ content: string; description?: string }>) => Promise<void>;
}

type GenerationStep = "idle" | "generating" | "preview" | "applying" | "success" | "error";

// ============================================================================
// Template Improvement Dialog
// ============================================================================

export function AIImproveTemplateDialog({
  isOpen,
  onOpenChange,
  llmSettings,
  template,
  onAddItems,
  onUpdateTemplate,
}: AIImproveTemplateDialogProps) {
  const [step, setStep] = React.useState<GenerationStep>("idle");
  const [improvements, setImprovements] = React.useState<TemplateImprovements | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedItems, setSelectedItems] = React.useState<Set<number>>(new Set());
  const [showReasoning, setShowReasoning] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setStep("idle");
      setImprovements(null);
      setError(null);
      setSelectedItems(new Set());
    }
  }, [isOpen]);

  const isConfigured = llmSettings?.provider && llmSettings?.selectedModel;

  const handleGenerate = async () => {
    if (!isConfigured) return;

    setStep("generating");
    setError(null);

    try {
      const response = await fetch("/api/llm/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "template",
          settings: llmSettings,
          template: {
            title: template.title,
            description: template.description,
            items: template.items.map((item) => ({
              content: item.content,
              description: item.description,
            })),
          },
        }),
      });

      const data = await response.json();

      if (data.success && data.improvements) {
        setImprovements(data.improvements);
        // Select all items by default
        setSelectedItems(new Set(data.improvements.suggestedItems.map((_: GeneratedTemplateItem, i: number) => i)));
        setStep("preview");
      } else {
        setError(data.error?.message || "Failed to generate improvements");
        setStep("error");
      }
    } catch {
      setError("Failed to connect to AI service");
      setStep("error");
    }
  };

  const handleApply = async () => {
    if (!improvements) return;

    setStep("applying");

    try {
      const itemsToAdd = improvements.suggestedItems.filter((_, i) => selectedItems.has(i));
      
      if (itemsToAdd.length > 0) {
        await onAddItems(itemsToAdd);
      }

      setStep("success");
      setTimeout(() => onOpenChange(false), 1500);
    } catch {
      setError("Failed to apply improvements");
      setStep("error");
    }
  };

  const toggleItem = (index: number) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Improve Template with AI
          </DialogTitle>
          <DialogDescription>
            AI will analyze your template and suggest additional steps to make it more comprehensive.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {/* Not Configured */}
          {!isConfigured && step === "idle" && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="h-8 w-8 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">
                Configure an AI provider in Settings to use this feature.
              </p>
            </div>
          )}

          {/* Idle State */}
          {isConfigured && step === "idle" && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="p-4 rounded-full bg-primary/10 mb-4">
                <Lightbulb className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-medium mb-2">Ready to Improve</h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-6">
                AI will analyze "{template.title}" and suggest additional steps based on best practices.
              </p>
              <Button onClick={handleGenerate} className="gap-2">
                <Sparkles className="h-4 w-4" />
                Generate Suggestions
              </Button>
            </div>
          )}

          {/* Generating */}
          {step === "generating" && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
              <h3 className="font-medium mb-2">Analyzing template...</h3>
              <p className="text-sm text-muted-foreground">
                AI is reviewing your template and generating suggestions.
              </p>
            </div>
          )}

          {/* Preview */}
          {step === "preview" && improvements && (
            <div className="space-y-4">
              {/* Reasoning */}
              {improvements.reasoning && (
                <div className="p-3 rounded-lg bg-muted/50">
                  <button
                    onClick={() => setShowReasoning(!showReasoning)}
                    className="flex items-center gap-2 w-full text-left text-sm font-medium"
                  >
                    <Lightbulb className="h-4 w-4 text-primary" />
                    AI Analysis
                    {showReasoning ? (
                      <ChevronUp className="h-4 w-4 ml-auto" />
                    ) : (
                      <ChevronDown className="h-4 w-4 ml-auto" />
                    )}
                  </button>
                  {showReasoning && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {improvements.reasoning}
                    </p>
                  )}
                </div>
              )}

              {/* Suggested Items */}
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  Suggested Steps ({selectedItems.size} of {improvements.suggestedItems.length} selected)
                </p>
                {improvements.suggestedItems.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => toggleItem(index)}
                    className={cn(
                      "w-full p-3 rounded-lg border text-left transition-all",
                      selectedItems.has(index)
                        ? item.itemType === 'phase'
                          ? "border-primary bg-primary/10"
                          : "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground/50"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5",
                          selectedItems.has(index)
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/30"
                        )}
                      >
                        {selectedItems.has(index) && <CheckCircle2 className="h-3 w-3" />}
                      </div>
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
                        {/* Show children count for phases */}
                        {item.itemType === 'phase' && item.children && item.children.length > 0 && (
                          <p className="text-xs text-primary mt-1">
                            Contains {item.children.length} task{item.children.length !== 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                      <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                  </button>
                ))}
              </div>

              {/* Resources */}
              {improvements.resources && improvements.resources.length > 0 && (
                <div className="space-y-2 pt-2 border-t">
                  <p className="text-sm font-medium">Suggested Resources</p>
                  {improvements.resources.map((resource, index) => (
                    <a
                      key={index}
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{resource.title}</p>
                        {resource.description && (
                          <p className="text-xs text-muted-foreground truncate">
                            {resource.description}
                          </p>
                        )}
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Applying */}
          {step === "applying" && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
              <h3 className="font-medium">Applying improvements...</h3>
            </div>
          )}

          {/* Success */}
          {step === "success" && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-4 rounded-full bg-green-500/10 mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <h3 className="font-medium">Improvements Applied!</h3>
            </div>
          )}

          {/* Error */}
          {step === "error" && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-4 rounded-full bg-destructive/10 mb-4">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <h3 className="font-medium mb-2">Something went wrong</h3>
              <p className="text-sm text-destructive mb-4">{error}</p>
              <Button variant="outline" onClick={() => setStep("idle")}>
                Try Again
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === "preview" && (
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleApply} disabled={selectedItems.size === 0} className="gap-2">
              <Plus className="h-4 w-4" />
              Add {selectedItems.size} Step{selectedItems.size !== 1 ? "s" : ""}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Step Improvement Dialog
// ============================================================================

export function AIImproveStepDialog({
  isOpen,
  onOpenChange,
  llmSettings,
  step,
  templateContext,
  onApplyImprovement,
  onAddSubSteps,
}: AIImproveStepDialogProps) {
  const [status, setStatus] = React.useState<GenerationStep>("idle");
  const [improvement, setImprovement] = React.useState<StepImprovement | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [applyContent, setApplyContent] = React.useState(true);
  const [applyDescription, setApplyDescription] = React.useState(true);
  const [applySubSteps, setApplySubSteps] = React.useState(true);

  // Debug: Log when onAddSubSteps changes
  React.useEffect(() => {
    console.log('[AIImproveStepDialog] onAddSubSteps prop:', {
      isDefined: !!onAddSubSteps,
      type: typeof onAddSubSteps,
    });
  }, [onAddSubSteps]);

  React.useEffect(() => {
    if (isOpen) {
      setStatus("idle");
      setImprovement(null);
      setError(null);
      setApplyContent(true);
      setApplyDescription(true);
      setApplySubSteps(true);
    }
  }, [isOpen]);

  const isConfigured = llmSettings?.provider && llmSettings?.selectedModel;

  const handleGenerate = async () => {
    if (!isConfigured) return;

    setStatus("generating");
    setError(null);

    try {
      const response = await fetch("/api/llm/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "step",
          settings: llmSettings,
          step: {
            content: step.content,
            description: step.description,
            resources: step.resources,
          },
          templateContext,
        }),
      });

      const data = await response.json();

      if (data.success && data.improvement) {
        setImprovement(data.improvement);
        setStatus("preview");
      } else {
        setError(data.error?.message || "Failed to generate improvement");
        setStatus("error");
      }
    } catch {
      setError("Failed to connect to AI service");
      setStatus("error");
    }
  };

  const handleApply = async () => {
    if (!improvement) return;

    setStatus("applying");

    try {
      console.log('[AIImproveStepDialog] Applying improvement...');
      console.log('[AIImproveStepDialog] improvement:', JSON.stringify(improvement, null, 2));
      
      await onApplyImprovement({
        content: applyContent ? improvement.content : step.content,
        description: applyDescription ? improvement.description : (step.description || ""),
        resources: improvement.resources,
      });

      console.log('[AIImproveStepDialog] Checking sub-steps:', {
        applySubSteps,
        suggestedSubSteps: improvement.suggestedSubSteps,
        suggestedSubStepsLength: improvement.suggestedSubSteps?.length,
        hasOnAddSubSteps: !!onAddSubSteps,
        onAddSubStepsType: typeof onAddSubSteps,
      });

      if (applySubSteps && improvement.suggestedSubSteps && improvement.suggestedSubSteps.length > 0 && onAddSubSteps) {
        console.log('[AIImproveStepDialog] Calling onAddSubSteps with:', JSON.stringify(improvement.suggestedSubSteps));
        await onAddSubSteps(improvement.suggestedSubSteps);
        console.log('[AIImproveStepDialog] onAddSubSteps completed');
      } else {
        console.log('[AIImproveStepDialog] Skipping sub-steps - condition not met');
      }

      setStatus("success");
      setTimeout(() => onOpenChange(false), 1500);
    } catch (err) {
      console.error('[AIImproveStepDialog] Error applying improvement:', err);
      setError("Failed to apply improvement");
      setStatus("error");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Improve Step with AI
          </DialogTitle>
          <DialogDescription>
            AI will suggest improvements to make this step clearer and more actionable.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {/* Not Configured */}
          {!isConfigured && status === "idle" && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="h-8 w-8 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">
                Configure an AI provider in Settings to use this feature.
              </p>
            </div>
          )}

          {/* Idle */}
          {isConfigured && status === "idle" && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg border bg-muted/30">
                <p className="text-sm font-medium mb-1">Current Step</p>
                <p className="font-medium">{step.content}</p>
                {step.description && (
                  <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
                )}
              </div>
              <div className="flex justify-center">
                <Button onClick={handleGenerate} className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  Generate Improvement
                </Button>
              </div>
            </div>
          )}

          {/* Generating */}
          {status === "generating" && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
              <h3 className="font-medium">Analyzing step...</h3>
            </div>
          )}

          {/* Preview */}
          {status === "preview" && improvement && (
            <div className="space-y-4">
              {/* Reasoning */}
              {improvement.reasoning && (
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground">{improvement.reasoning}</p>
                  </div>
                </div>
              )}

              {/* Content Improvement */}
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={applyContent}
                    onChange={(e) => setApplyContent(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm font-medium">Improved Title</span>
                </label>
                <div className={cn("p-3 rounded-lg border", applyContent ? "bg-primary/5 border-primary/20" : "bg-muted/30")}>
                  <p className="font-medium">{improvement.content}</p>
                </div>
              </div>

              {/* Description Improvement */}
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={applyDescription}
                    onChange={(e) => setApplyDescription(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm font-medium">Detailed Instructions</span>
                </label>
                <div className={cn("p-3 rounded-lg border", applyDescription ? "bg-primary/5 border-primary/20" : "bg-muted/30")}>
                  <p className="text-sm">{improvement.description}</p>
                </div>
              </div>

              {/* Sub-steps */}
              {improvement.suggestedSubSteps && improvement.suggestedSubSteps.length > 0 && onAddSubSteps && (
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={applySubSteps}
                      onChange={(e) => setApplySubSteps(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm font-medium">
                      Add Sub-steps ({improvement.suggestedSubSteps.length})
                    </span>
                  </label>
                  <div className={cn("space-y-1 pl-6", !applySubSteps && "opacity-50")}>
                    {improvement.suggestedSubSteps.map((subStep, i) => (
                      <div key={i} className="p-2 rounded border bg-muted/30 text-sm">
                        {subStep.content}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Resources */}
              {improvement.resources && improvement.resources.length > 0 && (
                <div className="space-y-2 pt-2 border-t">
                  <p className="text-sm font-medium">Helpful Resources</p>
                  {improvement.resources.map((resource, i) => (
                    <a
                      key={i}
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 rounded border hover:bg-muted/50 text-sm"
                    >
                      <Link2 className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{resource.title}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Applying */}
          {status === "applying" && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
              <h3 className="font-medium">Applying improvement...</h3>
            </div>
          )}

          {/* Success */}
          {status === "success" && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-4 rounded-full bg-green-500/10 mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <h3 className="font-medium">Step Improved!</h3>
            </div>
          )}

          {/* Error */}
          {status === "error" && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-4 rounded-full bg-destructive/10 mb-4">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <h3 className="font-medium mb-2">Something went wrong</h3>
              <p className="text-sm text-destructive mb-4">{error}</p>
              <Button variant="outline" onClick={() => setStatus("idle")}>
                Try Again
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        {status === "preview" && (
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleApply} className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Apply Improvement
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}


// ============================================================================
// Template Enhancement Dialog (Enhance ALL existing steps)
// ============================================================================

interface AIEnhanceTemplateDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  llmSettings: LLMSettings | null;
  template: {
    id: string;
    title: string;
    description: string | null;
    items: Array<{
      id: string;
      content: string;
      description?: string | null;
      resources?: ResourceLink[] | null;
      itemType?: 'task' | 'reference' | 'phase' | null;
    }>;
  };
  onUpdateItems: (updates: Array<{
    id: string;
    content: string;
    description: string;
    resources: ResourceLink[];
  }>) => Promise<void>;
  onAddItems?: (items: GeneratedTemplateItem[]) => Promise<void>;
  onUpdateTemplate?: (updates: { title?: string; description?: string; resources?: ResourceLink[] }) => Promise<void>;
}

interface EnhancedItem {
  id: string;
  content: string;
  description: string;
  resources: ResourceLink[];
}

interface TemplateEnhancementResult {
  title?: string;
  description?: string;
  enhancedItems: EnhancedItem[];
  newItems?: GeneratedTemplateItem[];
  templateResources?: ResourceLink[];
  reasoning: string;
}

export function AIEnhanceTemplateDialog({
  isOpen,
  onOpenChange,
  llmSettings,
  template,
  onUpdateItems,
  onAddItems,
  onUpdateTemplate,
}: AIEnhanceTemplateDialogProps) {
  const [step, setStep] = React.useState<GenerationStep>("idle");
  const [enhancement, setEnhancement] = React.useState<TemplateEnhancementResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedItems, setSelectedItems] = React.useState<Set<string>>(new Set());
  const [selectedNewItems, setSelectedNewItems] = React.useState<Set<number>>(new Set());
  const [applyTemplateChanges, setApplyTemplateChanges] = React.useState(true);
  const [showReasoning, setShowReasoning] = React.useState(false);
  const [expandedItems, setExpandedItems] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    if (isOpen) {
      setStep("idle");
      setEnhancement(null);
      setError(null);
      setSelectedItems(new Set());
      setSelectedNewItems(new Set());
      setApplyTemplateChanges(true);
      setExpandedItems(new Set());
    }
  }, [isOpen]);

  const isConfigured = llmSettings?.provider && llmSettings?.selectedModel;

  const handleGenerate = async () => {
    if (!isConfigured) return;

    setStep("generating");
    setError(null);

    try {
      const response = await fetch("/api/llm/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: llmSettings,
          template: {
            title: template.title,
            description: template.description,
            items: template.items.map((item) => ({
              id: item.id,
              content: item.content,
              description: item.description,
              resources: item.resources,
              itemType: item.itemType,
            })),
          },
        }),
      });

      const data = await response.json();

      if (data.success && data.enhancement) {
        setEnhancement(data.enhancement);
        // Select all enhanced items by default
        setSelectedItems(new Set(data.enhancement.enhancedItems.map((item: EnhancedItem) => item.id)));
        // Select all new items by default
        if (data.enhancement.newItems) {
          setSelectedNewItems(new Set(data.enhancement.newItems.map((_: GeneratedTemplateItem, i: number) => i)));
        }
        setStep("preview");
      } else {
        setError(data.error?.message || "Failed to generate enhancements");
        setStep("error");
      }
    } catch {
      setError("Failed to connect to AI service");
      setStep("error");
    }
  };

  const handleApply = async () => {
    if (!enhancement) return;

    setStep("applying");

    try {
      // Apply enhanced items
      const itemsToUpdate = enhancement.enhancedItems.filter((item) => selectedItems.has(item.id));
      if (itemsToUpdate.length > 0) {
        await onUpdateItems(itemsToUpdate);
      }

      // Apply new items if any selected
      if (onAddItems && enhancement.newItems && enhancement.newItems.length > 0) {
        const newItemsToAdd = enhancement.newItems.filter((_, i) => selectedNewItems.has(i));
        if (newItemsToAdd.length > 0) {
          await onAddItems(newItemsToAdd);
        }
      }

      // Apply template-level changes
      if (applyTemplateChanges && onUpdateTemplate) {
        const templateUpdates: { title?: string; description?: string; resources?: ResourceLink[] } = {};
        if (enhancement.title) templateUpdates.title = enhancement.title;
        if (enhancement.description) templateUpdates.description = enhancement.description;
        if (enhancement.templateResources) templateUpdates.resources = enhancement.templateResources;
        
        if (Object.keys(templateUpdates).length > 0) {
          await onUpdateTemplate(templateUpdates);
        }
      }

      setStep("success");
      setTimeout(() => onOpenChange(false), 1500);
    } catch {
      setError("Failed to apply enhancements");
      setStep("error");
    }
  };

  const toggleItem = (id: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleNewItem = (index: number) => {
    setSelectedNewItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const toggleExpanded = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (enhancement) {
      setSelectedItems(new Set(enhancement.enhancedItems.map((item) => item.id)));
      if (enhancement.newItems) {
        setSelectedNewItems(new Set(enhancement.newItems.map((_, i) => i)));
      }
    }
  };

  const selectNone = () => {
    setSelectedItems(new Set());
    setSelectedNewItems(new Set());
  };

  const totalSelected = selectedItems.size + selectedNewItems.size;
  const totalAvailable = (enhancement?.enhancedItems.length || 0) + (enhancement?.newItems?.length || 0);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Enhance Template with AI
          </DialogTitle>
          <DialogDescription>
            AI will improve ALL existing steps with better descriptions and resources.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {/* Not Configured */}
          {!isConfigured && step === "idle" && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="h-8 w-8 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">
                Configure an AI provider in Settings to use this feature.
              </p>
            </div>
          )}

          {/* Idle State */}
          {isConfigured && step === "idle" && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="p-4 rounded-full bg-primary/10 mb-4">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-medium mb-2">Ready to Enhance</h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-2">
                AI will analyze "{template.title}" and improve all {template.items.length} steps with:
              </p>
              <ul className="text-sm text-muted-foreground mb-6 space-y-1">
                <li>• Detailed, actionable descriptions</li>
                <li>• Helpful resources and links</li>
                <li>• Clearer step titles</li>
                <li>• Suggestions for missing steps</li>
              </ul>
              <Button onClick={handleGenerate} className="gap-2">
                <Sparkles className="h-4 w-4" />
                Enhance All Steps
              </Button>
            </div>
          )}

          {/* Generating */}
          {step === "generating" && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
              <h3 className="font-medium mb-2">Enhancing template...</h3>
              <p className="text-sm text-muted-foreground">
                AI is improving all {template.items.length} steps. This may take a moment.
              </p>
            </div>
          )}

          {/* Preview */}
          {step === "preview" && enhancement && (
            <div className="space-y-4">
              {/* Reasoning */}
              {enhancement.reasoning && (
                <div className="p-3 rounded-lg bg-muted/50">
                  <button
                    onClick={() => setShowReasoning(!showReasoning)}
                    className="flex items-center gap-2 w-full text-left text-sm font-medium"
                  >
                    <Lightbulb className="h-4 w-4 text-primary" />
                    AI Analysis
                    {showReasoning ? (
                      <ChevronUp className="h-4 w-4 ml-auto" />
                    ) : (
                      <ChevronDown className="h-4 w-4 ml-auto" />
                    )}
                  </button>
                  {showReasoning && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {enhancement.reasoning}
                    </p>
                  )}
                </div>
              )}

              {/* Template-level changes */}
              {(enhancement.title || enhancement.description || enhancement.templateResources) && onUpdateTemplate && (
                <div className="space-y-2 p-3 rounded-lg border bg-primary/5">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={applyTemplateChanges}
                      onChange={(e) => setApplyTemplateChanges(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm font-medium">Apply Template Improvements</span>
                  </label>
                  {applyTemplateChanges && (
                    <div className="pl-6 space-y-2 text-sm text-muted-foreground">
                      {enhancement.title && <p>• New title: {enhancement.title}</p>}
                      {enhancement.description && <p>• Improved description</p>}
                      {enhancement.templateResources && enhancement.templateResources.length > 0 && (
                        <p>• {enhancement.templateResources.length} template resources</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Selection controls */}
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  Enhanced Steps ({selectedItems.size} of {enhancement.enhancedItems.length} selected)
                </p>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={selectAll} className="text-xs h-7">
                    Select All
                  </Button>
                  <Button variant="ghost" size="sm" onClick={selectNone} className="text-xs h-7">
                    Select None
                  </Button>
                </div>
              </div>

              {/* Enhanced Items */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {enhancement.enhancedItems.map((item) => {
                  const originalItem = template.items.find((i) => i.id === item.id);
                  const isExpanded = expandedItems.has(item.id);
                  const hasChanges = originalItem && (
                    item.content !== originalItem.content ||
                    item.description !== (originalItem.description || "") ||
                    JSON.stringify(item.resources) !== JSON.stringify(originalItem.resources || [])
                  );

                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "rounded-lg border transition-all",
                        selectedItems.has(item.id)
                          ? "border-primary bg-primary/5"
                          : "border-border"
                      )}
                    >
                      <button
                        onClick={() => toggleItem(item.id)}
                        className="w-full p-3 text-left"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5",
                              selectedItems.has(item.id)
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-muted-foreground/30"
                            )}
                          >
                            {selectedItems.has(item.id) && <CheckCircle2 className="h-3 w-3" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm">{item.content}</p>
                              {hasChanges && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                                  Updated
                                </span>
                              )}
                            </div>
                            {!isExpanded && item.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                {item.description}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpanded(item.id);
                            }}
                            className="p-1 hover:bg-muted rounded"
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </button>
                        </div>
                      </button>
                      
                      {isExpanded && (
                        <div className="px-3 pb-3 pt-0 border-t mx-3 mt-2 space-y-2">
                          {item.description && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">Description</p>
                              <MarkdownRenderer content={item.description} compact className="text-sm" />
                            </div>
                          )}
                          {item.resources && item.resources.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">Resources</p>
                              <div className="space-y-1">
                                {item.resources.map((resource, i) => (
                                  <a
                                    key={i}
                                    href={resource.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="flex items-center gap-2 p-1.5 rounded border hover:bg-muted/50 text-xs"
                                  >
                                    <Link2 className="h-3 w-3 shrink-0" />
                                    <span className="truncate">{resource.title}</span>
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* New Items */}
              {enhancement.newItems && enhancement.newItems.length > 0 && onAddItems && (
                <div className="space-y-2 pt-4 border-t">
                  <p className="text-sm font-medium">
                    Suggested New Steps ({selectedNewItems.size} of {enhancement.newItems.length} selected)
                  </p>
                  {enhancement.newItems.map((item, index) => (
                    <button
                      key={index}
                      onClick={() => toggleNewItem(index)}
                      className={cn(
                        "w-full p-3 rounded-lg border text-left transition-all",
                        selectedNewItems.has(index)
                          ? item.itemType === 'phase'
                            ? "border-primary bg-primary/10"
                            : "border-primary bg-primary/5"
                          : "border-border hover:border-muted-foreground/50"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5",
                            selectedNewItems.has(index)
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-muted-foreground/30"
                          )}
                        >
                          {selectedNewItems.has(index) && <CheckCircle2 className="h-3 w-3" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{item.content}</p>
                            {item.itemType === 'phase' ? (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-medium">
                                Phase
                              </span>
                            ) : (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-600 font-medium">
                                New
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                              {item.description}
                            </p>
                          )}
                          {/* Show children count for phases */}
                          {item.itemType === 'phase' && item.children && item.children.length > 0 && (
                            <p className="text-xs text-primary mt-1">
                              Contains {item.children.length} task{item.children.length !== 1 ? 's' : ''}
                            </p>
                          )}
                        </div>
                        <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Applying */}
          {step === "applying" && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
              <h3 className="font-medium">Applying enhancements...</h3>
            </div>
          )}

          {/* Success */}
          {step === "success" && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-4 rounded-full bg-green-500/10 mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <h3 className="font-medium">Template Enhanced!</h3>
            </div>
          )}

          {/* Error */}
          {step === "error" && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-4 rounded-full bg-destructive/10 mb-4">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <h3 className="font-medium mb-2">Something went wrong</h3>
              <p className="text-sm text-destructive mb-4">{error}</p>
              <Button variant="outline" onClick={() => setStep("idle")}>
                Try Again
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === "preview" && (
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleApply} disabled={totalSelected === 0} className="gap-2">
              <Sparkles className="h-4 w-4" />
              Apply {totalSelected} Enhancement{totalSelected !== 1 ? "s" : ""}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
