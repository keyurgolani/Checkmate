"use client";

/**
 * Condition Questionnaire Component
 * 
 * Displays conditional questions when creating a checklist from a template.
 * Users can answer questions to customize which items are included,
 * or skip to include all items.
 */

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, HelpCircle, SkipForward } from "lucide-react";
import type { TemplateQuestion, ConditionAnswers } from "@/lib/pocketbase-types";

// ============================================================================
// Types
// ============================================================================

interface ConditionQuestionnaireProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** The questions to display */
  questions: TemplateQuestion[];
  /** Template title for context */
  templateTitle: string;
  /** Callback when user submits answers */
  onSubmit: (answers: ConditionAnswers) => void;
  /** Callback when user skips (include all items) */
  onSkip: () => void;
  /** Whether submission is in progress */
  isSubmitting?: boolean;
}

// ============================================================================
// Question Components
// ============================================================================

interface BooleanQuestionProps {
  question: TemplateQuestion;
  value: boolean | undefined;
  onChange: (value: boolean) => void;
}

function BooleanQuestion({ question, value, onChange }: BooleanQuestionProps) {
  return (
    <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
      <Label 
        htmlFor={question.id} 
        className="text-sm font-medium cursor-pointer flex-1 pr-4"
      >
        {question.question}
      </Label>
      <Switch
        id={question.id}
        checked={value ?? (question.defaultValue as boolean) ?? false}
        onCheckedChange={onChange}
      />
    </div>
  );
}

interface EnumQuestionProps {
  question: TemplateQuestion;
  value: string | undefined;
  onChange: (value: string) => void;
}

function EnumQuestion({ question, value, onChange }: EnumQuestionProps) {
  const options = question.enumOptions ?? [];
  
  return (
    <div className="space-y-2 py-3 px-4 rounded-lg bg-secondary/30">
      <Label htmlFor={question.id} className="text-sm font-medium">
        {question.question}
      </Label>
      <Select
        value={value ?? question.defaultValue?.toString() ?? ""}
        onValueChange={onChange}
      >
        <SelectTrigger id={question.id} className="w-full">
          <SelectValue placeholder="Select an option..." />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ConditionQuestionnaire({
  isOpen,
  onOpenChange,
  questions,
  templateTitle,
  onSubmit,
  onSkip,
  isSubmitting = false,
}: ConditionQuestionnaireProps) {
  const [answers, setAnswers] = useState<ConditionAnswers>({});

  const handleAnswerChange = useCallback((questionId: string, value: boolean | string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value,
    }));
  }, []);

  const handleSubmit = useCallback(() => {
    onSubmit(answers);
  }, [answers, onSubmit]);

  const handleSkip = useCallback(() => {
    setAnswers({});
    onSkip();
  }, [onSkip]);

  // Reset answers when dialog closes
  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setAnswers({});
    }
    onOpenChange(open);
  }, [onOpenChange]);

  const answeredCount = Object.keys(answers).length;
  const totalQuestions = questions.length;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            Customize Your Checklist
          </DialogTitle>
          <DialogDescription>
            Answer these questions to customize which items are included in your 
            checklist for &quot;{templateTitle}&quot;. You can skip to include all items.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4 max-h-[400px] overflow-y-auto">
          {questions.map((question) => {
            if (question.answerType === 'boolean') {
              return (
                <BooleanQuestion
                  key={question.id}
                  question={question}
                  value={answers[question.id] as boolean | undefined}
                  onChange={(value) => handleAnswerChange(question.id, value)}
                />
              );
            }
            
            if (question.answerType === 'enum') {
              return (
                <EnumQuestion
                  key={question.id}
                  question={question}
                  value={answers[question.id] as string | undefined}
                  onChange={(value) => handleAnswerChange(question.id, value)}
                />
              );
            }
            
            return null;
          })}
        </div>

        {answeredCount > 0 && (
          <p className="text-xs text-muted-foreground text-center">
            {answeredCount} of {totalQuestions} questions answered
          </p>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleSkip}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            <SkipForward className="h-4 w-4 mr-2" />
            Skip & Include All
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Checklist
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
