"use client";

/**
 * Question Manager Component
 * 
 * Allows template owners to define conditional questions that customize
 * which items are included when creating checklists.
 */

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  HelpCircle,
  GripVertical,
  X,
} from "lucide-react";
import type { TemplateQuestion, ConditionAnswerType } from "@/lib/pocketbase-types";
import { generateQuestionId } from "@/lib/services/condition";

// ============================================================================
// Types
// ============================================================================

interface QuestionManagerProps {
  /** Current questions */
  questions: TemplateQuestion[];
  /** Callback when questions change */
  onChange: (questions: TemplateQuestion[]) => void;
  /** Whether editing is allowed */
  canEdit: boolean;
}

interface QuestionEditorProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback when dialog closes */
  onClose: () => void;
  /** Callback when question is saved */
  onSave: (question: TemplateQuestion) => void;
  /** Existing question to edit (undefined for new) */
  editingQuestion?: TemplateQuestion;
}

// ============================================================================
// Question Editor Dialog
// ============================================================================

function QuestionEditor({
  isOpen,
  onClose,
  onSave,
  editingQuestion,
}: QuestionEditorProps) {
  const [questionText, setQuestionText] = useState(editingQuestion?.question ?? "");
  const [answerType, setAnswerType] = useState<ConditionAnswerType>(
    editingQuestion?.answerType ?? "boolean"
  );
  const [enumOptions, setEnumOptions] = useState<string[]>(
    editingQuestion?.enumOptions ?? ["Option 1", "Option 2"]
  );
  const [newOption, setNewOption] = useState("");
  const [defaultBool, setDefaultBool] = useState(
    editingQuestion?.defaultValue as boolean ?? false
  );
  const [defaultEnum, setDefaultEnum] = useState(
    editingQuestion?.defaultValue as string ?? ""
  );

  const handleSave = useCallback(() => {
    if (!questionText.trim()) return;

    const question: TemplateQuestion = {
      id: editingQuestion?.id ?? generateQuestionId(),
      question: questionText.trim(),
      answerType,
      ...(answerType === "enum" && { enumOptions }),
      ...(answerType === "boolean" && defaultBool !== undefined && { defaultValue: defaultBool }),
      ...(answerType === "enum" && defaultEnum && { defaultValue: defaultEnum }),
    };

    onSave(question);
    onClose();
  }, [questionText, answerType, enumOptions, defaultBool, defaultEnum, editingQuestion, onSave, onClose]);

  const handleAddOption = useCallback(() => {
    if (newOption.trim() && !enumOptions.includes(newOption.trim())) {
      setEnumOptions([...enumOptions, newOption.trim()]);
      setNewOption("");
    }
  }, [newOption, enumOptions]);

  const handleRemoveOption = useCallback((option: string) => {
    setEnumOptions(enumOptions.filter(o => o !== option));
    if (defaultEnum === option) {
      setDefaultEnum("");
    }
  }, [enumOptions, defaultEnum]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingQuestion ? "Edit Question" : "Add Question"}
          </DialogTitle>
          <DialogDescription>
            Define a question that will customize which items are included in checklists.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Question Text */}
          <div className="space-y-2">
            <Label htmlFor="question-text">Question</Label>
            <Input
              id="question-text"
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="e.g., Have you already chosen a baby name?"
              autoComplete="off"
            />
          </div>

          {/* Answer Type */}
          <div className="space-y-2">
            <Label htmlFor="answer-type">Answer Type</Label>
            <Select
              value={answerType}
              onValueChange={(value) => setAnswerType(value as ConditionAnswerType)}
            >
              <SelectTrigger id="answer-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="boolean">Yes / No</SelectItem>
                <SelectItem value="enum">Multiple Choice</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Enum Options */}
          {answerType === "enum" && (
            <div className="space-y-2">
              <Label>Options</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {enumOptions.map((option) => (
                  <Badge
                    key={option}
                    variant="secondary"
                    className="flex items-center gap-1 pr-1"
                  >
                    {option}
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(option)}
                      className="ml-1 hover:bg-destructive/20 rounded p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  placeholder="Add option..."
                  onKeyDown={(e) => e.key === "Enter" && handleAddOption()}
                  autoComplete="off"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleAddOption}
                  disabled={!newOption.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Default Value */}
          <div className="space-y-2">
            <Label>Default Value (optional)</Label>
            {answerType === "boolean" ? (
              <div className="flex items-center gap-2">
                <Switch
                  checked={defaultBool}
                  onCheckedChange={setDefaultBool}
                />
                <span className="text-sm text-muted-foreground">
                  {defaultBool ? "Yes" : "No"}
                </span>
              </div>
            ) : (
              <Select 
                value={defaultEnum || "__no_default__"} 
                onValueChange={(val) => setDefaultEnum(val === "__no_default__" ? "" : val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No default" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__no_default__">No default</SelectItem>
                  {enumOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!questionText.trim()}>
            {editingQuestion ? "Save Changes" : "Add Question"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Question Item Component
// ============================================================================

interface QuestionItemProps {
  question: TemplateQuestion;
  onEdit: () => void;
  onDelete: () => void;
  canEdit: boolean;
}

function QuestionItem({ question, onEdit, onDelete, canEdit }: QuestionItemProps) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors group">
      {canEdit && (
        <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-grab" />
      )}
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{question.question}</p>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="outline" className="text-xs">
            {question.answerType === "boolean" ? "Yes/No" : "Choice"}
          </Badge>
          {question.answerType === "enum" && question.enumOptions && (
            <span className="text-xs text-muted-foreground">
              {question.enumOptions.length} options
            </span>
          )}
          {question.defaultValue !== undefined && (
            <span className="text-xs text-muted-foreground">
              Default: {String(question.defaultValue)}
            </span>
          )}
        </div>
      </div>

      {canEdit && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onEdit}
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function QuestionManager({
  questions,
  onChange,
  canEdit,
}: QuestionManagerProps) {
  const [showEditor, setShowEditor] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<TemplateQuestion | undefined>();

  const handleAddQuestion = useCallback(() => {
    setEditingQuestion(undefined);
    setShowEditor(true);
  }, []);

  const handleEditQuestion = useCallback((question: TemplateQuestion) => {
    setEditingQuestion(question);
    setShowEditor(true);
  }, []);

  const handleSaveQuestion = useCallback((question: TemplateQuestion) => {
    if (editingQuestion) {
      // Update existing
      onChange(questions.map(q => q.id === question.id ? question : q));
    } else {
      // Add new
      onChange([...questions, question]);
    }
  }, [questions, editingQuestion, onChange]);

  const handleDeleteQuestion = useCallback((questionId: string) => {
    onChange(questions.filter(q => q.id !== questionId));
  }, [questions, onChange]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Conditional Questions</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Questions that customize which items are included in checklists
          </p>
        </div>
        {canEdit && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddQuestion}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Question
          </Button>
        )}
      </div>

      {questions.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
          <HelpCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No conditional questions defined</p>
          {canEdit && (
            <p className="text-xs mt-1">
              Add questions to let users customize their checklists
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {questions.map((question) => (
            <QuestionItem
              key={question.id}
              question={question}
              onEdit={() => handleEditQuestion(question)}
              onDelete={() => handleDeleteQuestion(question.id)}
              canEdit={canEdit}
            />
          ))}
        </div>
      )}

      <QuestionEditor
        isOpen={showEditor}
        onClose={() => setShowEditor(false)}
        onSave={handleSaveQuestion}
        editingQuestion={editingQuestion}
      />
    </div>
  );
}
