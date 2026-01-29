"use client";

/**
 * Condition Editor Component
 * 
 * Allows setting conditions on template items that determine
 * whether they should be included based on question answers.
 */

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  Filter,
  X,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import type { TemplateQuestion, ItemCondition } from "@/lib/pocketbase-types";

// ============================================================================
// Types
// ============================================================================

interface ConditionEditorProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback when dialog closes */
  onClose: () => void;
  /** Current conditions on the item */
  conditions: ItemCondition[];
  /** Available questions to reference */
  questions: TemplateQuestion[];
  /** Callback when conditions are saved */
  onSave: (conditions: ItemCondition[]) => void;
}

interface ConditionRowProps {
  condition: ItemCondition;
  questions: TemplateQuestion[];
  onChange: (condition: ItemCondition) => void;
  onRemove: () => void;
}

// ============================================================================
// Condition Row Component
// ============================================================================

function ConditionRow({ condition, questions, onChange, onRemove }: ConditionRowProps) {
  const question = questions.find(q => q.id === condition.questionId);
  
  const handleQuestionChange = useCallback((questionId: string) => {
    const newQuestion = questions.find(q => q.id === questionId);
    onChange({
      ...condition,
      questionId,
      // Reset value when question changes
      value: newQuestion?.answerType === 'boolean' ? true : (newQuestion?.enumOptions?.[0] ?? ''),
    });
  }, [condition, questions, onChange]);

  const handleOperatorChange = useCallback((operator: 'equals' | 'notEquals') => {
    onChange({ ...condition, operator });
  }, [condition, onChange]);

  const handleValueChange = useCallback((value: string) => {
    const newValue = question?.answerType === 'boolean' ? value === 'true' : value;
    onChange({ ...condition, value: newValue });
  }, [condition, question, onChange]);

  return (
    <div className="group relative flex flex-col gap-3 p-4 rounded-xl border border-violet-200/50 dark:border-violet-800/30 bg-gradient-to-br from-violet-50/50 to-transparent dark:from-violet-950/20 dark:to-transparent hover:border-violet-300/70 dark:hover:border-violet-700/50 transition-colors">
      {/* Remove Button - positioned top right */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={onRemove}
        aria-label="Remove condition"
      >
        <X className="h-3.5 w-3.5" />
      </Button>

      {/* Question row */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground w-12 flex-shrink-0">When</span>
        <Select value={condition.questionId} onValueChange={handleQuestionChange}>
          <SelectTrigger className="flex-1 h-9 text-sm bg-background">
            <SelectValue placeholder="Select question..." />
          </SelectTrigger>
          <SelectContent>
            {questions.map((q) => (
              <SelectItem key={q.id} value={q.id} className="text-sm">
                {q.question}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Operator and Value row */}
      <div className="flex items-center gap-2">
        <span className="w-12 flex-shrink-0" />
        <Select value={condition.operator} onValueChange={handleOperatorChange}>
          <SelectTrigger className="w-24 h-9 text-sm bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="equals" className="text-sm">is</SelectItem>
            <SelectItem value="notEquals" className="text-sm">is not</SelectItem>
          </SelectContent>
        </Select>

        {question?.answerType === 'boolean' ? (
          <Select 
            value={String(condition.value)} 
            onValueChange={handleValueChange}
          >
            <SelectTrigger className="w-28 h-9 text-sm bg-background font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true" className="text-sm">Yes</SelectItem>
              <SelectItem value="false" className="text-sm">No</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <Select 
            value={String(condition.value)} 
            onValueChange={handleValueChange}
          >
            <SelectTrigger className="flex-1 h-9 text-sm bg-background font-medium">
              <SelectValue placeholder="Select value..." />
            </SelectTrigger>
            <SelectContent>
              {question?.enumOptions?.map((option) => (
                <SelectItem key={option} value={option} className="text-sm">
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ConditionEditor({
  isOpen,
  onClose,
  conditions: initialConditions,
  questions,
  onSave,
}: ConditionEditorProps) {
  const [conditions, setConditions] = useState<ItemCondition[]>(initialConditions);

  const handleAddCondition = useCallback(() => {
    if (questions.length === 0) return;
    
    const firstQuestion = questions[0];
    if (!firstQuestion) return;
    const newCondition: ItemCondition = {
      questionId: firstQuestion.id,
      operator: 'equals',
      value: firstQuestion.answerType === 'boolean' ? true : (firstQuestion.enumOptions?.[0] ?? ''),
    };
    
    setConditions([...conditions, newCondition]);
  }, [conditions, questions]);

  const handleUpdateCondition = useCallback((index: number, condition: ItemCondition) => {
    setConditions(conditions.map((c, i) => i === index ? condition : c));
  }, [conditions]);

  const handleRemoveCondition = useCallback((index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  }, [conditions]);

  const handleSave = useCallback(() => {
    onSave(conditions);
    onClose();
  }, [conditions, onSave, onClose]);

  const handleClear = useCallback(() => {
    setConditions([]);
  }, []);

  // Reset conditions when dialog opens
  const handleOpenChange = useCallback((open: boolean) => {
    if (open) {
      setConditions(initialConditions);
    } else {
      onClose();
    }
  }, [initialConditions, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-violet-100 dark:bg-violet-900/50">
              <Filter className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            <span>Conditional Display</span>
          </DialogTitle>
          <DialogDescription className="text-sm">
            Define when this item should appear in checklists based on question answers.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4 max-h-[400px] overflow-y-auto">
          {questions.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-xl bg-muted/20">
              <div className="flex items-center justify-center h-12 w-12 mx-auto mb-3 rounded-full bg-muted/50">
                <Filter className="h-5 w-5 opacity-50" />
              </div>
              <p className="text-sm font-medium">No questions available</p>
              <p className="text-xs mt-1 text-muted-foreground/70">
                Add questions to the template first to create conditions
              </p>
            </div>
          ) : conditions.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-xl bg-muted/20">
              <div className="flex items-center justify-center h-12 w-12 mx-auto mb-3 rounded-full bg-violet-100/50 dark:bg-violet-900/30">
                <Filter className="h-5 w-5 text-violet-500/50" />
              </div>
              <p className="text-sm font-medium">No conditions set</p>
              <p className="text-xs mt-1 text-muted-foreground/70">
                This item will always appear in checklists
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddCondition}
                className="mt-4"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Add First Condition
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {conditions.map((condition, index) => (
                <div key={index} className="relative">
                  {index > 0 && (
                    <div className="flex items-center justify-center -mt-1.5 -mb-1.5 relative z-10">
                      <Badge variant="outline" className="bg-background text-[10px] px-2 py-0 h-5 font-medium text-muted-foreground">
                        AND
                      </Badge>
                    </div>
                  )}
                  <ConditionRow
                    condition={condition}
                    questions={questions}
                    onChange={(c) => handleUpdateCondition(index, c)}
                    onRemove={() => handleRemoveCondition(index)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 border-t pt-4">
          <div className="flex gap-2 flex-1">
            {questions.length > 0 && conditions.length > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddCondition}
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  Clear All
                </Button>
              </>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="min-w-[100px]">
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Condition Badge Component (for displaying on items)
// ============================================================================

interface ConditionBadgeProps {
  conditions: ItemCondition[];
  questions: TemplateQuestion[];
  onClick?: () => void;
}

/**
 * Formats a condition value for display
 */
function formatConditionValue(value: boolean | string): string {
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  return String(value);
}

/**
 * Truncates text to a maximum length with ellipsis
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '…';
}

/**
 * Gets the operator display text
 */
function getOperatorText(operator: 'equals' | 'notEquals'): string {
  return operator === 'equals' ? 'is' : 'is not';
}

/**
 * ConditionBadge - A polished indicator showing item conditions
 * 
 * Design principles:
 * - Clean, minimal inline display with full details in tooltip
 * - Visual distinction between single and multiple conditions
 * - Consistent with app's design language (primary color accents)
 * - Accessible with proper ARIA labels and keyboard support
 */
export function ConditionBadge({ conditions, questions, onClick }: ConditionBadgeProps) {
  if (!conditions || conditions.length === 0) {
    return null;
  }

  const conditionCount = conditions.length;
  const isSingleCondition = conditionCount === 1;

  // Build detailed condition info for tooltip
  const conditionDetails = conditions.map(condition => {
    const question = questions.find(q => q.id === condition.questionId);
    return {
      questionText: question?.question ?? 'Unknown question',
      operator: condition.operator,
      operatorText: getOperatorText(condition.operator),
      value: formatConditionValue(condition.value),
    };
  });

  // For single condition, show a compact summary
  const singleCondition = isSingleCondition ? conditionDetails[0] : null;

  const badgeContent = (
    <button
      type="button"
      onClick={onClick}
      className={`
        inline-flex items-center gap-1.5
        h-7 px-2.5
        text-xs font-medium
        rounded-md
        border border-violet-200/70 dark:border-violet-700/50
        bg-violet-50/80 dark:bg-violet-950/40
        text-violet-700 dark:text-violet-300
        hover:bg-violet-100 dark:hover:bg-violet-900/50
        hover:border-violet-300 dark:hover:border-violet-600/60
        transition-all duration-150
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 focus-visible:ring-offset-1
        ${onClick ? 'cursor-pointer' : 'cursor-default'}
      `}
      aria-label={`${conditionCount} condition${conditionCount > 1 ? 's' : ''} applied. ${onClick ? 'Click to edit.' : ''}`}
    >
      <Filter className="h-3 w-3 flex-shrink-0" aria-hidden="true" />

      {isSingleCondition && singleCondition ? (
        <span className="flex items-center gap-1 min-w-0">
          <span className="truncate max-w-[80px] text-violet-600/80 dark:text-violet-400/70">
            {truncateText(singleCondition.questionText, 16)}
          </span>
          <span className="text-violet-500/60 dark:text-violet-400/50">=</span>
          <span className="font-semibold truncate max-w-[60px]">
            {truncateText(singleCondition.value, 12)}
          </span>
        </span>
      ) : (
        <span className="flex items-center gap-1">
          <span className="font-semibold">{conditionCount}</span>
          <span className="text-violet-600/70 dark:text-violet-400/60">conditions</span>
        </span>
      )}
    </button>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {badgeContent}
      </TooltipTrigger>
      <TooltipContent 
        side="top" 
        align="center"
        className="max-w-sm p-0 overflow-hidden shadow-lg"
      >
        <div className="bg-popover rounded-lg overflow-hidden">
          {/* Header */}
          <div className="px-3 py-2 bg-violet-50 dark:bg-violet-950/60 border-b border-violet-100 dark:border-violet-900/50">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center h-5 w-5 rounded bg-violet-100 dark:bg-violet-900/50">
                <Filter className="h-3 w-3 text-violet-600 dark:text-violet-400" aria-hidden="true" />
              </div>
              <span className="text-xs font-semibold text-violet-700 dark:text-violet-300">
                Show when {conditionCount > 1 ? 'all match' : 'condition matches'}
              </span>
            </div>
          </div>

          {/* Conditions list */}
          <div className="p-2 space-y-1.5">
            {conditionDetails.map((detail, index) => (
              <div 
                key={index}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted/40 text-xs"
              >
                {conditionCount > 1 && (
                  <span className="flex items-center justify-center h-4 w-4 rounded bg-violet-100 dark:bg-violet-900/50 text-[10px] font-bold text-violet-600 dark:text-violet-400 flex-shrink-0">
                    {index + 1}
                  </span>
                )}
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <span className="text-muted-foreground truncate flex-1" title={detail.questionText}>
                    {detail.questionText}
                  </span>
                  <span className="text-muted-foreground/60 flex-shrink-0">{detail.operatorText}</span>
                  <span className="font-semibold text-violet-700 dark:text-violet-300 px-1.5 py-0.5 rounded bg-violet-100/80 dark:bg-violet-900/50 flex-shrink-0">
                    {detail.value}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Footer hint */}
          {onClick && (
            <div className="px-3 py-1.5 bg-muted/30 border-t border-border/30">
              <p className="text-[10px] text-muted-foreground text-center">
                Click to edit
              </p>
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
