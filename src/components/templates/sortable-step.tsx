"use client";

/**
 * Sortable Step Component
 *
 * A draggable step in the template editor that supports:
 * - Drag and drop reordering
 * - Nested indentation
 * - Inline editing
 * - Conditional visibility based on questions
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
  Check,
  X,
  Link as LinkIcon,
  ChevronRight,
  FileText,
  Filter,
} from "lucide-react";
import type { StepData } from "./template-editor";
import type { TemplateQuestion, ItemCondition } from "@/lib/pocketbase-types";
import { StepEditor } from "./step-editor";
import { ConditionEditor, ConditionBadge } from "./condition-editor";

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
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: (content: string, itemType?: "task" | "reference", referenceId?: string | null) => void;
  onDelete: () => void;
  onAddSubStep: () => void;
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
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onAddSubStep,
  onUpdateConditions,
}: SortableStepProps) {
  const [editContent, setEditContent] = useState(step.content);
  const [showConditionEditor, setShowConditionEditor] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Reset edit content when step changes
  useEffect(() => {
    setEditContent(step.content);
  }, [step.content]);

  const handleSave = () => {
    if (editContent.trim()) {
      onSaveEdit(editContent.trim());
    } else {
      onCancelEdit();
    }
  };

  const handleEditorSave = (data: {
    content: string;
    itemType: "task" | "reference";
    referenceId?: string | null;
  }) => {
    onSaveEdit(data.content, data.itemType, data.referenceId);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setEditContent(step.content);
      onCancelEdit();
    }
  };

  const isReference = step.itemType === "reference";
  const canAddSubStep = depth < MAX_DEPTH - 1;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group flex items-center gap-4 p-3 rounded-xl border
        ${isReference 
          ? "bg-gradient-to-r from-blue-50 to-card dark:from-blue-950/30 dark:to-card border-blue-200 dark:border-blue-800/50" 
          : "bg-card"}
        ${isDragging ? "opacity-50 shadow-lg" : ""}
        ${isEditing ? "ring-2 ring-primary" : isReference ? "hover:bg-blue-50/80 dark:hover:bg-blue-950/40" : "hover:bg-accent/50"}
        transition-colors
      `}
    >
      {/* Drag handle - Requirements: 13.2 keyboard navigation */}
      {canEdit && (
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
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

      {/* Depth indicator */}
      {depth > 0 && (
        <div className="flex items-center text-muted-foreground">
          <ChevronRight className="h-3 w-3" />
        </div>
      )}

      {/* Step type indicator */}
      {isReference && (
        <div
          className="flex items-center justify-center h-6 w-6 rounded bg-blue-100 dark:bg-blue-900/50"
          title="Reference to another template"
        >
          <FileText className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          isReference ? (
            /* Use full StepEditor for reference steps */
            <StepEditor
              initialContent={step.content}
              initialType="reference"
              initialReferenceId={step.referenceId}
              currentTemplateId={currentTemplateId}
              onSave={handleEditorSave}
              onCancel={() => {
                setEditContent(step.content);
                onCancelEdit();
              }}
              isNew={false}
            />
          ) : (
            /* Simple inline editor for task steps */
            <div className="flex items-center gap-2">
              <Input
                ref={inputRef}
                id={`edit-step-${step.id}`}
                name={`edit-step-${step.id}`}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={handleKeyDown}
                className="h-8"
                placeholder="Step content"
                aria-label="Step content"
                autoComplete="off"
              />
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 shrink-0"
                onClick={handleSave}
              >
                <Check className="h-4 w-4 text-green-600" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 shrink-0"
                onClick={() => {
                  setEditContent(step.content);
                  onCancelEdit();
                }}
              >
                <X className="h-4 w-4 text-red-600" />
              </Button>
            </div>
          )
        ) : (
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

      {/* Actions - Requirements: 13.2 keyboard navigation */}
      {canEdit && !isEditing && (
        <div 
          className="flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
          role="group"
          aria-label="Step actions"
        >
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
    </div>
  );
}

// Keep backward compatibility alias
export { SortableStep as SortableItem };
