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
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  Filter,
  X,
} from "lucide-react";
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
    <div className="flex items-center gap-2 p-3 rounded-lg border bg-secondary/20">
      {/* Question Select */}
      <Select value={condition.questionId} onValueChange={handleQuestionChange}>
        <SelectTrigger className="flex-1">
          <SelectValue placeholder="Select question..." />
        </SelectTrigger>
        <SelectContent>
          {questions.map((q) => (
            <SelectItem key={q.id} value={q.id}>
              {q.question}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Operator Select */}
      <Select value={condition.operator} onValueChange={handleOperatorChange}>
        <SelectTrigger className="w-28">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="equals">is</SelectItem>
          <SelectItem value="notEquals">is not</SelectItem>
        </SelectContent>
      </Select>

      {/* Value Select */}
      {question?.answerType === 'boolean' ? (
        <Select 
          value={String(condition.value)} 
          onValueChange={handleValueChange}
        >
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">Yes</SelectItem>
            <SelectItem value="false">No</SelectItem>
          </SelectContent>
        </Select>
      ) : (
        <Select 
          value={String(condition.value)} 
          onValueChange={handleValueChange}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            {question?.enumOptions?.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Remove Button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
        onClick={onRemove}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            Item Conditions
          </DialogTitle>
          <DialogDescription>
            Set conditions to control when this item is included in checklists.
            All conditions must be met for the item to appear.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4 max-h-[400px] overflow-y-auto">
          {questions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
              <Filter className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No questions defined</p>
              <p className="text-xs mt-1">
                Add questions to the template first to set conditions
              </p>
            </div>
          ) : conditions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
              <Filter className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No conditions set</p>
              <p className="text-xs mt-1">
                This item will always be included in checklists
              </p>
            </div>
          ) : (
            conditions.map((condition, index) => (
              <ConditionRow
                key={index}
                condition={condition}
                questions={questions}
                onChange={(c) => handleUpdateCondition(index, c)}
                onRemove={() => handleRemoveCondition(index)}
              />
            ))
          )}
        </div>

        {conditions.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Logic:</span>
            <Badge variant="outline">AND</Badge>
            <span>- All conditions must be true</span>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex gap-2 flex-1">
            {questions.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddCondition}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Condition
              </Button>
            )}
            {conditions.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="text-destructive hover:text-destructive"
              >
                <X className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Conditions
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

export function ConditionBadge({ conditions, questions, onClick }: ConditionBadgeProps) {
  if (!conditions || conditions.length === 0) {
    return null;
  }

  const getConditionSummary = () => {
    if (conditions.length === 1) {
      const condition = conditions[0];
      if (!condition) return null;
      const question = questions.find(q => q.id === condition.questionId);
      if (question) {
        const op = condition.operator === 'equals' ? '=' : '≠';
        const val = typeof condition.value === 'boolean' 
          ? (condition.value ? 'Yes' : 'No')
          : condition.value;
        // Truncate question text more gracefully
        const questionText = question.question.length > 15 
          ? `${question.question.substring(0, 15)}…` 
          : question.question;
        return { questionText, op, val };
      }
    }
    return null;
  };

  const summary = getConditionSummary();

  return (
    <Badge
      variant="outline"
      className="cursor-pointer hover:bg-accent text-xs gap-1.5 px-2.5 py-1 h-auto"
      onClick={onClick}
    >
      <Filter className="h-3 w-3 flex-shrink-0" />
      {summary ? (
        <span className="flex items-center gap-1.5">
          <span className="truncate max-w-[100px]">{summary.questionText}</span>
          <span className="text-muted-foreground">{summary.op}</span>
          <span className="font-medium">{summary.val}</span>
        </span>
      ) : (
        <span>{conditions.length} condition{conditions.length > 1 ? 's' : ''}</span>
      )}
    </Badge>
  );
}
