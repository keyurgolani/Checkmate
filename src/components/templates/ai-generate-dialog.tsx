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
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Bot,
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Settings,
  ChevronDown,
  ChevronUp,
  Wand2,
} from "lucide-react";
import type { LLMSettings } from "@/lib/pocketbase-types";
import type { GeneratedTemplate, GeneratedTemplateItem } from "@/lib/services/llm";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { llmClient } from '@/lib/services/llm-client';

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
// Generation Progress Stages
// ============================================================================

const GENERATION_STAGES = [
  { message: "Analyzing your request...", target: 12 },
  { message: "Researching best practices...", target: 28 },
  { message: "Designing template structure...", target: 44 },
  { message: "Creating phases and steps...", target: 60 },
  { message: "Adding descriptions and resources...", target: 75 },
  { message: "Polishing the details...", target: 88 },
  { message: "Almost there...", target: 95 },
] as const;

const STAGE_DELAYS = [0, 3000, 7000, 12000, 18000, 26000, 38000];

// Sparkle particle configs (positioned around the icon circle)
const SPARKLE_PARTICLES = [
  { sx: "-8px",  sy: "-20px", ex: "-18px", ey: "-40px", dur: "2.2s", delay: "0s",   size: 3 },
  { sx: "14px",  sy: "-16px", ex: "28px",  ey: "-36px", dur: "2.6s", delay: "0.5s", size: 2 },
  { sx: "20px",  sy: "4px",   ex: "38px",  ey: "0px",   dur: "2.0s", delay: "1.0s", size: 3 },
  { sx: "10px",  sy: "18px",  ex: "20px",  ey: "36px",  dur: "2.8s", delay: "0.3s", size: 2 },
  { sx: "-14px", sy: "14px",  ex: "-30px", ey: "28px",  dur: "2.4s", delay: "0.8s", size: 2 },
  { sx: "-20px", sy: "-4px",  ex: "-36px", ey: "-8px",  dur: "2.3s", delay: "1.3s", size: 3 },
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
  const [questionsExpanded, setQuestionsExpanded] = React.useState(false);
  const [generationStage, setGenerationStage] = React.useState(0);

  // Progress through generation stages with decelerating timing
  React.useEffect(() => {
    if (step !== "generating") {
      setGenerationStage(0);
      return;
    }
    const timers = STAGE_DELAYS.map((delay, index) =>
      setTimeout(() => setGenerationStage(index), delay)
    );
    return () => timers.forEach(clearTimeout);
  }, [step]);

  // Reset state when dialog opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setStep("input");
      setQuery("");
      setWorkspaceId(defaultWorkspaceId);
      setGeneratedTemplate(null);
      setError(null);
      setCreatedTemplateId(null);
      setQuestionsExpanded(false);
    }
  }, [isOpen, defaultWorkspaceId]);

  const isConfigured = llmSettings?.provider && llmSettings?.selectedModel;

  const handleGenerate = async () => {
    if (!query.trim() || !isConfigured) return;

    setStep("generating");
    setError(null);

    try {
      const data = await llmClient.generate(llmSettings!, query.trim());

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

  // Shared questions list rendering
  const renderQuestions = () => {
    if (!generatedTemplate?.questions) return null;
    return generatedTemplate.questions.map((q, index) => (
      <div key={q.id || index} className="flex items-start gap-3 p-3 rounded-lg border bg-primary/5">
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium shrink-0">
          Q{index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{q.question}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {q.answerType === 'boolean' ? (
              <>Yes/No &bull; Default: {q.defaultValue ? 'Yes' : 'No'}</>
            ) : (
              <>Options: {q.enumOptions?.join(', ')} &bull; Default: {String(q.defaultValue)}</>
            )}
          </p>
        </div>
      </div>
    ));
  };

  // Render a single child item (task or nested phase within a phase)
  const renderChildItem = (child: GeneratedTemplateItem, parentIndex: number, childIndex: number) => (
    <div
      key={childIndex}
      className={cn(
        "flex items-start gap-2 p-2.5 rounded-lg border",
        child.itemType === 'phase'
          ? "bg-primary/5 border-primary/20"
          : "bg-background"
      )}
    >
      <span className={cn(
        "flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-medium shrink-0 mt-0.5",
        child.itemType === 'phase'
          ? "bg-primary/15 text-primary"
          : "bg-muted text-muted-foreground"
      )}>
        {child.itemType === 'phase' ? 'P' : `${childIndex + 1}`}
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
          <MarkdownRenderer content={child.description} compact className="text-xs text-muted-foreground mt-0.5 line-clamp-1" />
        )}
        {child.conditions && child.conditions.length > 0 && (
          <p className="text-xs text-primary mt-1">
            ⚡ Conditional
          </p>
        )}
      </div>
    </div>
  );

  // Render items list - phases as section headers, tasks as list items
  const renderItems = () => {
    if (!generatedTemplate) return null;
    let taskCounter = 0;
    return generatedTemplate.items.map((item, index) => {
      if (item.itemType === 'phase') {
        // Phase rendered as a section header
        return (
          <div key={index} className={cn("space-y-1.5", index > 0 && "pt-3")}>
            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-primary/10 border border-primary/20">
              <div className="w-1 h-5 rounded-full bg-primary shrink-0" />
              <h4 className="font-semibold text-sm">{item.content}</h4>
            </div>
            {item.description && (
              <MarkdownRenderer content={item.description} compact className="text-xs text-muted-foreground px-3" />
            )}
            {item.conditions && item.conditions.length > 0 && (
              <p className="text-xs text-primary px-3">⚡ Conditional</p>
            )}
            {item.children && item.children.length > 0 && (
              <div className="space-y-1 pl-4 ml-1.5 border-l-2 border-primary/20">
                {item.children.map((child, childIndex) =>
                  renderChildItem(child, index, childIndex)
                )}
              </div>
            )}
          </div>
        );
      }

      // Regular top-level task
      taskCounter++;
      return (
        <div key={index} className="space-y-1">
          <div className="flex items-start gap-3 p-3 rounded-lg border bg-background">
            <span className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium shrink-0 bg-primary/10 text-primary">
              {taskCounter}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm">{item.content}</p>
              </div>
              {item.description && (
                <MarkdownRenderer content={item.description} compact className="text-xs text-muted-foreground mt-0.5 line-clamp-2" />
              )}
              {item.conditions && item.conditions.length > 0 && (
                <p className="text-xs text-primary mt-1">⚡ Conditional</p>
              )}
            </div>
          </div>
          {item.children && item.children.length > 0 && (
            <div className="ml-9 space-y-1">
              {item.children.map((child, childIndex) =>
                renderChildItem(child, index, childIndex)
              )}
            </div>
          )}
        </div>
      );
    });
  };

  const hasQuestions = !!(generatedTemplate?.questions && generatedTemplate.questions.length > 0);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-none sm:w-[75vw] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Generate Template with AI
          </DialogTitle>
          <DialogDescription>
            Describe what you want to create and AI will generate a complete checklist template for you.
          </DialogDescription>
        </DialogHeader>

        <div className={cn(
          "flex-1 py-4 min-h-0 flex flex-col",
          step === "preview" ? "overflow-hidden" : "overflow-y-auto"
        )}>
          {/* Not Configured State */}
          {!isConfigured && step === "input" && (
            <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
              <div className="p-5 rounded-full bg-muted mb-5">
                <Settings className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">AI Not Configured</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md">
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
            <div className="flex flex-col lg:flex-row gap-6 h-full">
              {/* Left column: Query + Workspace */}
              <div className="flex-1 flex flex-col gap-5 min-w-0">
                {/* Query Input */}
                <div className="flex-1 flex flex-col gap-2">
                  <Label htmlFor="ai-query" className="text-sm font-medium">
                    What would you like to create?
                  </Label>
                  <textarea
                    id="ai-query"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Describe your checklist in detail. For example: 'A comprehensive checklist for planning a destination wedding, including venue selection, guest management, catering, and day-of coordination.'"
                    className="w-full flex-1 min-h-[120px] px-4 py-3 text-sm rounded-xl border border-input bg-background shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
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
              </div>

              {/* Right column: Examples + Provider */}
              <div className="lg:w-72 xl:w-80 shrink-0 flex flex-col gap-5">
                {/* Example Prompts */}
                <div className="flex-1 space-y-2">
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
            </div>
          )}

          {/* Generating Step */}
          {step === "generating" && (
            <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
              {/* Magic animation container */}
              <div className="relative w-28 h-28 mb-10">
                {/* Outer SVG orbit spinner - smooth rotation */}
                <svg
                  className="absolute inset-0 w-full h-full text-primary animate-spin"
                  style={{ animationDuration: '3s' }}
                  viewBox="0 0 100 100"
                  fill="none"
                >
                  <circle
                    cx="50" cy="50" r="46"
                    stroke="currentColor"
                    strokeWidth="2"
                    opacity="0.12"
                  />
                  <circle
                    cx="50" cy="50" r="46"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeDasharray="90 199"
                    strokeLinecap="round"
                  />
                </svg>

                {/* Secondary counter-rotating ring */}
                <svg
                  className="absolute inset-2 w-[calc(100%-1rem)] h-[calc(100%-1rem)] text-primary/40"
                  style={{ animation: 'spin 5s linear infinite reverse' }}
                  viewBox="0 0 100 100"
                  fill="none"
                >
                  <circle
                    cx="50" cy="50" r="46"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeDasharray="40 249"
                    strokeLinecap="round"
                  />
                </svg>

                {/* Glowing background pulse */}
                <div className="absolute inset-4 rounded-full bg-primary/10 animate-magic-glow" />

                {/* Wand icon with glow */}
                <div className="absolute inset-0 flex items-center justify-center animate-magic-glow">
                  <Wand2 className="h-10 w-10 text-primary" />
                </div>

                {/* Sparkle particles */}
                {SPARKLE_PARTICLES.map((p, i) => (
                  <div
                    key={i}
                    className="absolute left-1/2 top-1/2 rounded-full bg-primary animate-sparkle-drift"
                    style={{
                      width: p.size,
                      height: p.size,
                      '--sx': p.sx,
                      '--sy': p.sy,
                      '--ex': p.ex,
                      '--ey': p.ey,
                      '--dur': p.dur,
                      '--delay': p.delay,
                    } as React.CSSProperties}
                  />
                ))}
              </div>

              {/* Status message - transitions between stages */}
              <div className="min-h-[3.5rem] flex flex-col items-center justify-center">
                <h3 key={generationStage} className="text-lg font-medium mb-1 animate-fade-in">
                  {GENERATION_STAGES[generationStage]?.message ?? "Generating your template..."}
                </h3>
                <p className="text-sm text-muted-foreground">
                  This may take a moment
                </p>
              </div>

              {/* Fake progress bar */}
              <div className="w-full max-w-sm mt-6 px-4">
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary relative overflow-hidden"
                    style={{
                      width: `${GENERATION_STAGES[generationStage]?.target ?? 5}%`,
                      transition: 'width 2s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  >
                    <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/25 to-transparent" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Preview Step */}
          {step === "preview" && generatedTemplate && (
            <div className="flex flex-col h-full min-h-0">
              {/* Template Header — capped to at most half the container so items always get space */}
              <div className="p-4 rounded-xl border bg-muted/30 mb-4 max-h-[45%] flex flex-col shrink-0 min-h-0">
                <h3 className="font-semibold text-lg mb-1 shrink-0">{generatedTemplate.title}</h3>
                <div className="overflow-y-auto min-h-0">
                  <MarkdownRenderer content={generatedTemplate.description} compact className="text-sm text-muted-foreground" />
                </div>
                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground shrink-0">
                  <span>{getTotalItemCount(generatedTemplate)} items</span>
                  {getPhaseCount(generatedTemplate) > 0 && (
                    <span>{getPhaseCount(generatedTemplate)} phases</span>
                  )}
                  {hasQuestions && (
                    <span>{generatedTemplate.questions!.length} questions</span>
                  )}
                  {generatedTemplate.resources && generatedTemplate.resources.length > 0 && (
                    <span>{generatedTemplate.resources.length} resources</span>
                  )}
                </div>
              </div>

              {/* Content area: side-by-side on xl, stacked on smaller */}
              <div className="flex-1 min-h-0 flex flex-col xl:flex-row xl:gap-6">
                {/* Items Panel - Primary content, always visible */}
                <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                  <div className="space-y-1.5">
                    {renderItems()}
                  </div>
                </div>

                {/* Questions Sidebar - visible on xl screens */}
                {hasQuestions && (
                  <div className="hidden xl:flex xl:flex-col xl:w-72 xl:shrink-0 xl:border-l xl:pl-4 min-h-0">
                    <Label className="text-sm font-medium mb-3 shrink-0">Conditional Questions</Label>
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                      {renderQuestions()}
                    </div>
                  </div>
                )}
              </div>

              {/* Questions Collapsible Footer - visible on smaller screens */}
              {hasQuestions && (
                <div className="xl:hidden shrink-0 border-t mt-3 -mx-4 sm:-mx-6">
                  <button
                    onClick={() => setQuestionsExpanded(!questionsExpanded)}
                    className="w-full flex items-center justify-between px-4 sm:px-6 py-3 text-sm font-medium hover:bg-muted/50 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      Conditional Questions
                      <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                        {generatedTemplate.questions!.length}
                      </Badge>
                    </span>
                    {questionsExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                  {questionsExpanded && (
                    <div className="max-h-[30vh] overflow-y-auto px-4 sm:px-6 pb-4 space-y-2">
                      {renderQuestions()}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Saving Step */}
          {step === "saving" && (
            <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
              <div className="p-5 rounded-full bg-primary/10 mb-6">
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
              </div>
              <h3 className="text-lg font-medium mb-2">Saving template...</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Creating your template and all its items.
              </p>
            </div>
          )}

          {/* Success Step */}
          {step === "success" && (
            <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
              <div className="p-5 rounded-full bg-green-500/10 mb-6">
                <CheckCircle2 className="h-10 w-10 text-green-500" />
              </div>
              <h3 className="text-lg font-medium mb-2">Template Created!</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md">
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
            <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
              <div className="p-5 rounded-full bg-destructive/10 mb-6">
                <AlertCircle className="h-10 w-10 text-destructive" />
              </div>
              <h3 className="text-lg font-medium mb-2">Something went wrong</h3>
              <p className="text-sm text-destructive mb-6 max-w-md">{error}</p>
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
