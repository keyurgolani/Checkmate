"use client";

/**
 * Template Preview Component
 * 
 * Allows users to preview how a template will look with different
 * condition answers applied. Shows which items would be included
 * or excluded based on the current answers.
 */

import { useState, useMemo, useCallback } from "react";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Eye, RotateCcw, Check, X, ListChecks } from "lucide-react";
import type { TemplateQuestion, ConditionAnswers, ItemCondition } from "@/lib/pocketbase-types";
import { filterItemsByConditions } from "@/lib/services/condition";

// ============================================================================
// Types
// ============================================================================

interface PreviewItem {
  id: string;
  content: string;
  parentId: string | null;
  metadata: {
    conditions?: ItemCondition[];
    [key: string]: unknown;
  } | null;
}

interface TemplatePreviewProps {
  /** Template questions */
  questions: TemplateQuestion[];
  /** Template items/steps */
  items: PreviewItem[];
  /** Trigger element */
  children?: React.ReactNode;
}

// ============================================================================
// Preview Item Component
// ============================================================================

interface PreviewItemRowProps {
  item: PreviewItem;
  isIncluded: boolean;
  depth: number;
}

function PreviewItemRow({ item, isIncluded, depth }: PreviewItemRowProps) {
  return (
    <div
      className={`flex items-center gap-3 py-2.5 px-3 rounded-xl transition-all ${
        isIncluded
          ? "bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800/50"
          : "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 opacity-60"
      }`}
      style={{ marginLeft: `${depth * 20}px` }}
    >
      <div className={`p-1 rounded-lg ${isIncluded ? 'bg-green-100 dark:bg-green-900/50' : 'bg-red-100 dark:bg-red-900/50'}`}>
        {isIncluded ? (
          <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
        ) : (
          <X className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
        )}
      </div>
      <span className={`text-sm flex-1 ${!isIncluded ? "line-through text-muted-foreground" : ""}`}>
        {item.content}
      </span>
      {item.metadata?.conditions && item.metadata.conditions.length > 0 && (
        <Badge variant="outline" className="text-[10px] h-5 px-1.5 rounded-md">
          {item.metadata.conditions.length} rule{item.metadata.conditions.length > 1 ? "s" : ""}
        </Badge>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function TemplatePreview({
  questions,
  items,
  children,
}: TemplatePreviewProps) {
  const [answers, setAnswers] = useState<ConditionAnswers>({});
  const [isOpen, setIsOpen] = useState(false);

  // Calculate which items are included based on current answers
  const { excludedIds } = useMemo(() => {
    // Convert PreviewItem[] to Item[] format for the filter function
    const itemsForFilter = items.map(item => ({
      ...item,
      id: item.id,
      parent: item.parentId,
      metadata: item.metadata,
    })) as unknown as Parameters<typeof filterItemsByConditions>[0];
    
    return filterItemsByConditions(itemsForFilter, answers);
  }, [items, answers]);

  // Build tree structure for display
  const itemTree = useMemo(() => {
    const itemMap = new Map<string, { item: PreviewItem; depth: number }>();
    const rootItems: Array<{ item: PreviewItem; depth: number }> = [];

    // First pass: create map
    for (const item of items) {
      itemMap.set(item.id, { item, depth: 0 });
    }

    // Second pass: calculate depths and find roots
    for (const item of items) {
      if (item.parentId && itemMap.has(item.parentId)) {
        const parent = itemMap.get(item.parentId)!;
        itemMap.get(item.id)!.depth = parent.depth + 1;
      } else {
        rootItems.push(itemMap.get(item.id)!);
      }
    }

    // Flatten tree in order
    const result: Array<{ item: PreviewItem; depth: number }> = [];
    const addWithChildren = (itemId: string) => {
      const entry = itemMap.get(itemId);
      if (entry) {
        result.push(entry);
        // Add children
        for (const item of items) {
          if (item.parentId === itemId) {
            addWithChildren(item.id);
          }
        }
      }
    };

    for (const root of rootItems) {
      addWithChildren(root.item.id);
    }

    return result;
  }, [items]);

  const handleAnswerChange = useCallback((questionId: string, value: boolean | string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value,
    }));
  }, []);

  const handleReset = useCallback(() => {
    setAnswers({});
  }, []);

  const includedCount = items.length - excludedIds.size;
  const hasAnswers = Object.keys(answers).length > 0;

  if (questions.length === 0) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children ?? (
          <Button variant="outline" size="sm" className="rounded-lg">
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl rounded-[var(--radius)] border bg-card/95 backdrop-blur-xl shadow-2xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Eye className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">Template Preview</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Answer questions to see which items would be included
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh]">
          <div className="p-6 space-y-6">
            {/* Questions Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  Questions
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                    {questions.length}
                  </Badge>
                </h3>
                {hasAnswers && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleReset}
                    className="h-7 text-xs rounded-lg"
                  >
                    <RotateCcw className="h-3 w-3 mr-1.5" />
                    Reset
                  </Button>
                )}
              </div>

              <div className="space-y-3">
                {questions.map((question) => (
                  <div
                    key={question.id}
                    className="p-4 rounded-xl bg-muted/30 border"
                  >
                    {question.answerType === "boolean" ? (
                      <div className="flex items-center justify-between gap-4">
                        <Label
                          htmlFor={`preview-${question.id}`}
                          className="text-sm cursor-pointer flex-1"
                        >
                          {question.question}
                        </Label>
                        <Switch
                          id={`preview-${question.id}`}
                          checked={(answers[question.id] as boolean) ?? question.defaultValue ?? false}
                          onCheckedChange={(value) => handleAnswerChange(question.id, value)}
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label htmlFor={`preview-${question.id}`} className="text-sm">
                          {question.question}
                        </Label>
                        <Select
                          value={(answers[question.id] as string) ?? question.defaultValue?.toString() ?? ""}
                          onValueChange={(value) => handleAnswerChange(question.id, value)}
                        >
                          <SelectTrigger id={`preview-${question.id}`} className="rounded-lg">
                            <SelectValue placeholder="Select an option..." />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {question.enumOptions?.map((option) => (
                              <SelectItem key={option} value={option} className="rounded-lg">
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Results Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-muted-foreground" />
                  Items Preview
                </h3>
                <Badge 
                  variant={hasAnswers ? "default" : "secondary"}
                  className="rounded-full"
                >
                  {includedCount} of {items.length}
                </Badge>
              </div>

              <div className="space-y-2">
                {itemTree.map(({ item, depth }) => (
                  <PreviewItemRow
                    key={item.id}
                    item={item}
                    isIncluded={!excludedIds.has(item.id)}
                    depth={depth}
                  />
                ))}
              </div>

              {!hasAnswers && (
                <div className="text-center py-4 px-6 rounded-xl bg-muted/30 border border-dashed">
                  <p className="text-xs text-muted-foreground">
                    Answer the questions above to see how items would be filtered when creating a checklist
                  </p>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
