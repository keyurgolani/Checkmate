"use client";

/**
 * Sortable Step Component
 *
 * A draggable step in the template editor that supports:
 * - Drag and drop reordering
 * - Nested indentation
 * - Full step editing with description and resources
 * - Conditional visibility based on questions
 * - Expandable readonly view for full description and resources
 * - Phase items as collapsible section headers
 *
 * Requirements: 3.5, 3.6
 */

import { useState, useRef, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  GripVertical,
  Pencil,
  Trash2,
  Plus,
  ChevronRight,
  ChevronDown,
  FileText,
  Filter,
  Sparkles,
  Link2,
  Layers,
  Check,
  X,
} from "lucide-react";
import { DescriptionPreview } from "@/components/ui/description-preview";
import { ResourceIndicator } from "@/components/ui/resource-indicator";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import type { StepData } from "./template-editor";
import type { TemplateQuestion, ItemCondition, LLMSettings, ResourceLink } from "@/lib/pocketbase-types";
import { StepEditor } from "./step-editor";
import { ConditionEditor, ConditionBadge } from "./condition-editor";
import { AIImproveStepDialog } from "./ai-improve-dialog";

// ============================================================================
// Phase Editor Component (Simple inline editor for phase titles)
// ============================================================================

interface PhaseEditorProps {
  initialContent: string;
  onSave: (content: string) => void;
  onCancel: () => void;
}

function PhaseEditor({ initialContent, onSave, onCancel }: PhaseEditorProps) {
  const [content, setContent] = useState(initialContent);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  const handleSave = () => {
    if (content.trim()) {
      onSave(content.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      onCancel();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        ref={inputRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Phase name..."
        className="flex-1 h-9 text-base font-semibold bg-white dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 focus-visible:ring-amber-500"
        autoComplete="off"
      />
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100 dark:hover:bg-green-900/30"
        onClick={handleSave}
        title="Save"
      >
        <Check className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
        onClick={onCancel}
        title="Cancel"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

// ============================================================================
// Types
// ============================================================================

interface SortableStepProps {
  step: StepData;
  depth: number;
  canEdit: boolean;
  isEditing: boolean;
  currentTemplateId?: string;
  /** Available questions for conditions */
  questions?: TemplateQuestion[];
  /** LLM settings for AI features */
  llmSettings?: LLMSettings | null;
  /** Template context for AI improvements */
  templateContext?: {
    title: string;
    description: string | null;
    resources?: ResourceLink[] | null;
    allSteps: Array<{ content: string; description?: string | null }>;
    currentStepIndex: number;
  };
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: (content: string, itemType?: "task" | "reference" | "phase", referenceId?: string | null, description?: string | null, resources?: import("@/lib/pocketbase-types").ResourceLink[] | null) => void;
  onDelete: () => void;
  onAddSubStep: () => void;
  /** Callback to add multiple sub-steps with content (for AI suggestions) */
  onAddSubStepsWithContent?: (subSteps: Array<{ content: string; description?: string }>) => Promise<void>;
  /** Callback when conditions are updated */
  onUpdateConditions?: (conditions: ItemCondition[]) => void;
}

// ============================================================================
// Constants
// ============================================================================

const INDENT_SIZE = 24; // pixels per level of nesting
const MAX_DEPTH = 5; // Maximum nesting depth (Requirements: 3.5)

// ============================================================================
// Sortable Step Component
// ============================================================================

export function SortableStep({
  step,
  depth,
  canEdit,
  isEditing,
  currentTemplateId,
  questions = [],
  llmSettings,
  templateContext,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onAddSubStep,
  onAddSubStepsWithContent,
  onUpdateConditions,
}: SortableStepProps) {
  const [showConditionEditor, setShowConditionEditor] = useState(false);
  const [showAIImproveDialog, setShowAIImproveDialog] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Check if step has expandable content (description or resources)
  const hasDescription = step.description && step.description.trim().length > 0;
  const hasResources = step.resources && step.resources.length > 0;
  const hasExpandableContent = hasDescription || hasResources;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id, disabled: !canEdit });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    marginLeft: `${depth * INDENT_SIZE}px`,
  };

  const handleEditorSave = (data: {
    content: string;
    description?: string | null;
    resources?: import("@/lib/pocketbase-types").ResourceLink[] | null;
    itemType: "task" | "reference" | "phase";
    referenceId?: string | null;
  }) => {
    onSaveEdit(data.content, data.itemType, data.referenceId, data.description, data.resources);
  };

  const handleToggleExpand = (e: React.MouseEvent) => {
    // Don't toggle if clicking on elements that have stopPropagation or are marked as non-expandable
    const target = e.target as HTMLElement;
    // Check if clicking inside the actions group or on any button element
    if (target.closest('[data-no-expand], button')) {
      return;
    }
    if (hasExpandableContent && !isEditing) {
      setIsExpanded(!isExpanded);
    }
  };

  const isReference = step.itemType === "reference";
  const isPhase = step.itemType === "phase";
  const canAddSubStep = depth < MAX_DEPTH - 1;

  // Phase items render differently - they are section headers
  if (isPhase) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`
          group rounded-xl border-2
          bg-gradient-to-r from-amber-50 to-amber-25 dark:from-amber-950/40 dark:to-amber-900/20
          border-amber-300 dark:border-amber-700/60
          ${isDragging ? "opacity-50 shadow-lg" : ""}
          ${isEditing ? "ring-2 ring-amber-500" : "hover:bg-amber-50/80 dark:hover:bg-amber-950/50"}
          transition-colors
        `}
      >
        {/* Phase header row */}
        <div className="flex items-center gap-4 p-4">
          {/* Drag handle */}
          {canEdit && (
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 rounded flex-shrink-0"
              aria-label={`Drag to reorder phase ${step.content}`}
              aria-describedby={`drag-instructions-${step.id}`}
              type="button"
            >
              <GripVertical className="h-5 w-5" aria-hidden="true" />
              <span id={`drag-instructions-${step.id}`} className="sr-only">
                Press Space or Enter to start dragging. Use arrow keys to move. Press Space or Enter again to drop.
              </span>
            </button>
          )}

          {/* Phase icon */}
          <div
            className="flex items-center justify-center h-8 w-8 rounded-lg bg-amber-200 dark:bg-amber-800/60 flex-shrink-0"
            title="Phase - collapsible section"
          >
            <Layers className="h-4 w-4 text-amber-700 dark:text-amber-300" aria-hidden="true" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <PhaseEditor
                initialContent={step.content}
                onSave={(content) => onSaveEdit(content, "phase", null, null, null)}
                onCancel={onCancelEdit}
              />
            ) : (
              <div className="flex flex-col gap-1">
                <span className="text-base font-semibold text-amber-800 dark:text-amber-200">
                  {step.content}
                </span>
                <span className="text-xs text-amber-600/70 dark:text-amber-400/60 uppercase tracking-wider font-medium">
                  Phase
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          {!isEditing && canEdit && (
            <div 
              className="flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
              role="group"
              aria-label="Phase actions"
              data-no-expand
            >
              {/* Add step inside phase */}
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-amber-600 hover:text-amber-700 hover:bg-amber-200/50 focus-visible:opacity-100"
                onClick={onAddSubStep}
                title="Add step to phase"
                aria-label={`Add step to phase ${step.content}`}
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>

              {/* Edit button */}
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-amber-600 hover:text-amber-700 hover:bg-amber-200/50 focus-visible:opacity-100"
                onClick={onStartEdit}
                title="Edit phase"
                aria-label={`Edit phase ${step.content}`}
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>

              {/* Delete button */}
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10 focus-visible:opacity-100"
                onClick={onDelete}
                title="Delete phase"
                aria-label={`Delete phase ${step.content}`}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group rounded-xl border
        ${isReference 
          ? "bg-gradient-to-r from-blue-50 to-card dark:from-blue-950/30 dark:to-card border-blue-200 dark:border-blue-800/50" 
          : "bg-card"}
        ${isDragging ? "opacity-50 shadow-lg" : ""}
        ${isEditing ? "ring-2 ring-primary" : isReference ? "hover:bg-blue-50/80 dark:hover:bg-blue-950/40" : "hover:bg-accent/50"}
        ${hasExpandableContent && !isEditing ? "cursor-pointer" : ""}
        transition-colors
      `}
      onClick={handleToggleExpand}
      role={hasExpandableContent && !isEditing ? "button" : undefined}
      aria-expanded={hasExpandableContent && !isEditing ? isExpanded : undefined}
      tabIndex={hasExpandableContent && !isEditing ? 0 : undefined}
      onKeyDown={(e) => {
        if (hasExpandableContent && !isEditing && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          setIsExpanded(!isExpanded);
        }
      }}
    >
      {/* Main row */}
      <div className="flex items-center gap-4 p-3">
        {/* Expand/collapse indicator */}
        {hasExpandableContent && !isEditing && (
          <div className="text-muted-foreground flex-shrink-0">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            )}
          </div>
        )}

        {/* Drag handle - Requirements: 13.2 keyboard navigation */}
        {canEdit && (
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded flex-shrink-0"
            aria-label={`Drag to reorder ${step.content}`}
            aria-describedby={`drag-instructions-${step.id}`}
            type="button"
          >
            <GripVertical className="h-4 w-4" aria-hidden="true" />
            <span id={`drag-instructions-${step.id}`} className="sr-only">
              Press Space or Enter to start dragging. Use arrow keys to move. Press Space or Enter again to drop.
            </span>
          </button>
        )}

        {/* Depth indicator - only show if no expandable content indicator */}
        {depth > 0 && !hasExpandableContent && (
          <div className="flex items-center text-muted-foreground">
            <ChevronRight className="h-3 w-3" />
          </div>
        )}

        {/* Step type indicator */}
        {isReference && (
          <div
            className="flex items-center justify-center h-6 w-6 rounded bg-blue-100 dark:bg-blue-900/50 flex-shrink-0"
            title="Reference to another template"
          >
            <FileText className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            /* Use full StepEditor for task/reference types to support description/resources editing */
            <StepEditor
              initialContent={step.content}
              initialDescription={step.description}
              initialResources={step.resources}
              initialType={step.itemType === "reference" ? "reference" : "task"}
              initialReferenceId={step.referenceId}
              currentTemplateId={currentTemplateId}
              onSave={handleEditorSave}
              onCancel={onCancelEdit}
              isNew={false}
            />
          ) : (
            <div className="flex flex-col gap-1">
              <div className={isReference ? "flex items-center gap-2" : ""}>
                <span
                  className={`text-sm ${
                    isReference ? "font-medium text-blue-700 dark:text-blue-300" : ""
                  }`}
                >
                  {step.content}
                </span>
                {isReference && (
                  <span className="text-xs text-blue-500/70 dark:text-blue-400/60">
                    Template reference
                  </span>
                )}
              </div>
              {/* Description preview - only show when collapsed */}
              {!isExpanded && (
                <DescriptionPreview
                  description={step.description ?? null}
                  className="mt-0.5"
                />
              )}
            </div>
          )}
        </div>

        {/* Condition Badge - shows when item has conditions */}
        {!isEditing && step.metadata?.conditions && step.metadata.conditions.length > 0 && (
          <ConditionBadge
            conditions={step.metadata.conditions}
            questions={questions}
            onClick={canEdit ? () => setShowConditionEditor(true) : undefined}
          />
        )}

        {/* Right side container - actions appear on hover, resource indicator always at edge */}
        {!isEditing && (
          <div className="flex items-center gap-1 flex-shrink-0" data-no-expand>
            {/* Actions - appear on hover, positioned before resource indicator */}
            {canEdit && (
              <div 
                className="flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
                role="group"
                aria-label="Step actions"
              >
                {/* AI Improve button */}
                {llmSettings && templateContext && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 focus-visible:opacity-100"
                    onClick={() => setShowAIImproveDialog(true)}
                    title="Improve with AI"
                    aria-label={`Improve ${step.content} with AI`}
                  >
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                )}

                {/* Condition button - only show if questions exist */}
                {questions.length > 0 && onUpdateConditions && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className={`h-7 w-7 focus-visible:opacity-100 ${
                      step.metadata?.conditions?.length ? "text-primary" : ""
                    }`}
                    onClick={() => setShowConditionEditor(true)}
                    title="Set conditions"
                    aria-label={`Set conditions for ${step.content}`}
                  >
                    <Filter className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                )}

                {/* Add sub-step button */}
                {canAddSubStep && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 focus-visible:opacity-100"
                    onClick={onAddSubStep}
                    title="Add sub-step"
                    aria-label={`Add sub-step to ${step.content}`}
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                )}

                {/* Edit button */}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 focus-visible:opacity-100"
                  onClick={onStartEdit}
                  title="Edit step"
                  aria-label={`Edit ${step.content}`}
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>

                {/* Delete button */}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-destructive hover:text-destructive focus-visible:opacity-100"
                  onClick={onDelete}
                  title="Delete step"
                  aria-label={`Delete ${step.content}`}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </div>
            )}

            {/* Resource Indicator - always visible at the edge, only show when collapsed */}
            {!isExpanded && (
              <ResourceIndicator resources={step.resources ?? null} />
            )}
          </div>
        )}
      </div>

      {/* Expanded content - readonly view of description and resources */}
      {isExpanded && !isEditing && hasExpandableContent && (
        <div 
          className="px-3 pb-3 pt-0 border-t border-border/50 mt-0"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="pl-8 space-y-3">
            {/* Full description with markdown rendering */}
            {hasDescription && (
              <div className="pt-3">
                <h4 className="text-xs font-medium text-muted-foreground mb-2">Description</h4>
                <div className="bg-muted/30 rounded-lg p-3">
                  <MarkdownRenderer content={step.description!} />
                </div>
              </div>
            )}

            {/* Resources list */}
            {hasResources && (
              <div className={hasDescription ? "" : "pt-3"}>
                <h4 className="text-xs font-medium text-muted-foreground mb-2">
                  Resources ({step.resources!.length})
                </h4>
                <ul className="space-y-2">
                  {step.resources!.map((resource, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <a
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start gap-2 text-sm text-primary hover:underline group/link"
                      >
                        <Link2 className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" aria-hidden="true" />
                        <span className="flex-1">
                          {resource.title || resource.url}
                          {resource.description && (
                            <span className="block text-xs text-muted-foreground mt-0.5">
                              {resource.description}
                            </span>
                          )}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Condition Editor Dialog */}
      {onUpdateConditions && (
        <ConditionEditor
          isOpen={showConditionEditor}
          onClose={() => setShowConditionEditor(false)}
          conditions={step.metadata?.conditions ?? []}
          questions={questions}
          onSave={onUpdateConditions}
        />
      )}

      {/* AI Improve Step Dialog */}
      {llmSettings && templateContext && (
        <AIImproveStepDialog
          isOpen={showAIImproveDialog}
          onOpenChange={setShowAIImproveDialog}
          llmSettings={llmSettings}
          step={{
            id: step.id,
            content: step.content,
            description: step.description,
            resources: step.resources,
          }}
          templateContext={templateContext}
          onApplyImprovement={async (improvement) => {
            onSaveEdit(
              improvement.content,
              step.itemType,
              step.referenceId,
              improvement.description,
              improvement.resources as ResourceLink[] | null
            );
          }}
          onAddSubSteps={canAddSubStep && onAddSubStepsWithContent ? onAddSubStepsWithContent : undefined}
        />
      )}
    </div>
  );
}

// Keep backward compatibility alias
export { SortableStep as SortableItem };
