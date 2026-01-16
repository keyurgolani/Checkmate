"use client";

/**
 * Template Editor Component
 *
 * Provides editing capabilities for templates including:
 * - Title and description editing
 * - Step list with drag-and-drop reordering
 * - Nested steps with indentation
 * - Realtime updates for collaborators
 *
 * Requirements: 3.1, 3.5, 3.6, 12.4, 13.3, 13.4
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { motion } from "framer-motion";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

import { ItemType, Visibility } from "@/lib/pocketbase-types";
import type { ItemMetadata } from "@/lib/pocketbase-types";
import { useTemplateRealtime } from "@/lib/hooks/use-realtime";
import { SortableStep } from "./sortable-step";
import { StepEditor } from "./step-editor";
import { formatTodayDate } from "@/lib/utils";
import { 
  Plus, 
  Save, 
  Loader2, 
  Globe, 
  Lock, 
  Users, 
  Link as LinkIcon, 
  Download, 
  Upload, 
  Play, 
  Trash2, 
  MoreVertical, 
  Printer, 
  Settings, 
  LayoutList,
  CheckCircle2,
  ArrowLeft,
  Filter
} from "lucide-react";
import { VisibilitySettingsPanel } from "./visibility-settings-panel";
import { ExportDialog } from "./export-dialog";
import { ImportDialog } from "./import-dialog";
import { LiveRegion, useStatusAnnouncer } from "@/components/ui/live-region";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { QuestionManager } from "./question-manager";
import { ConditionQuestionnaire } from "@/components/checklists/condition-questionnaire";
import { TemplatePreview } from "./template-preview";
import type { TemplateQuestion, ConditionAnswers } from "@/lib/pocketbase-types";

// ============================================================================
// Types
// ============================================================================

export interface TemplateData {
  id: string;
  workspaceId: string;
  ownerId: string;
  title: string;
  description: string | null;
  visibility: string;
  category: string | null;
  tags: string[] | null;
  version: number;
  instanceCount: number;
  questions: Array<{
    id: string;
    question: string;
    answerType: 'boolean' | 'enum';
    enumOptions?: string[];
    defaultValue?: boolean | string;
  }> | null;
  createdAt: string;
  updatedAt: string;
}

export interface StepData {
  id: string;
  templateId: string;
  parentId: string | null;
  path: string;
  itemType: "task" | "reference";
  content: string;
  referenceId: string | null;
  position: number;
  metadata: ItemMetadata | null;
  createdAt: string;
  updatedAt: string;
}

// Keep backward compatibility alias
export type ItemData = StepData;

interface TemplateEditorProps {
  template: TemplateData;
  steps: StepData[];
  canEdit: boolean;
}


// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Build a tree structure from flat steps
 */
function buildStepTree(steps: StepData[]): StepData[] {
  // Sort steps by path and position
  const sorted = [...steps].sort((a, b) => {
    const pathCompare = a.path.localeCompare(b.path);
    if (pathCompare !== 0) return pathCompare;
    return a.position - b.position;
  });

  // Return root steps (steps without parent)
  return sorted.filter((step) => !step.parentId);
}

/**
 * Get children of a step
 */
function getChildren(steps: StepData[], parentId: string): StepData[] {
  return steps
    .filter((step) => step.parentId === parentId)
    .sort((a, b) => a.position - b.position);
}

/**
 * Flatten tree for rendering with depth info
 */
function flattenTreeWithDepth(
  steps: StepData[],
  allSteps: StepData[]
): Array<StepData & { depth: number }> {
  const result: Array<StepData & { depth: number }> = [];

  function traverse(step: StepData, depth: number) {
    result.push({ ...step, depth });
    const children = getChildren(allSteps, step.id);
    for (const child of children) {
      traverse(child, depth + 1);
    }
  }

  const rootSteps = buildStepTree(allSteps);
  for (const step of rootSteps) {
    traverse(step, 0);
  }

  return result;
}


// ============================================================================
// Visibility Badge Component
// ============================================================================

function VisibilityBadge({ visibility }: { visibility: string }) {
  const config = {
    [Visibility.PRIVATE]: {
      icon: Lock,
      label: "Private",
      className:
        "bg-destructive/10 text-destructive border border-destructive/20",
    },
    [Visibility.PUBLIC]: {
      icon: Globe,
      label: "Public",
      className:
        "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20",
    },
    [Visibility.SHARED]: {
      icon: Users,
      label: "Shared",
      className:
        "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20",
    },
  };

  const {
    icon: Icon,
    label,
    className,
  } = config[visibility as Visibility] ?? config[Visibility.PRIVATE];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${className}`}
      title={`${label} template`}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}


// ============================================================================
// Template Editor Component
// ============================================================================

export function TemplateEditor({
  template,
  steps: initialSteps,
  canEdit,
}: TemplateEditorProps) {
  const router = useRouter();
  
  // State
  const [title, setTitle] = useState(template.title);
  const [description, setDescription] = useState(template.description ?? "");
  const [currentVisibility, setCurrentVisibility] = useState(template.visibility);
  const [steps, setSteps] = useState<StepData[]>(initialSteps);
  const [questions, setQuestions] = useState<TemplateQuestion[]>(template.questions ?? []);

  // Sync steps state when initialSteps prop changes (e.g., after browser back navigation)
  // This ensures the component displays fresh data from the server
  useEffect(() => {
    setSteps(initialSteps);
  }, [initialSteps]);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [newStepContent, setNewStepContent] = useState("");
  const [showStepEditor, setShowStepEditor] = useState(false);
  const [showVisibilitySettings, setShowVisibilitySettings] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [isCreatingChecklist, setIsCreatingChecklist] = useState(false);
  const [showChecklistNameDialog, setShowChecklistNameDialog] = useState(false);
  const [showConditionQuestionnaire, setShowConditionQuestionnaire] = useState(false);
  const [pendingChecklistName, setPendingChecklistName] = useState("");
  const [checklistName, setChecklistName] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Status announcer for screen readers - Requirements: 13.4
  const { message: statusMessage, politeness, announce, announceAssertive } = useStatusAnnouncer();

  // Track steps added locally to prevent duplicates from realtime subscription
  const recentlyAddedStepsRef = useRef<Set<string>>(new Set());

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );


  // Sync steps when initialSteps changes (e.g., after browser back navigation)
  useEffect(() => {
    setSteps(initialSteps);
  }, [initialSteps]);

  // Track changes
  useEffect(() => {
    const titleChanged = title !== template.title;
    const descriptionChanged = description !== (template.description ?? "");
    setHasChanges(titleChanged || descriptionChanged);
  }, [title, description, template.title, template.description]);

  // Subscribe to realtime updates for collaborators
  // Requirements: 12.4
  useTemplateRealtime(template.id, {
    onTemplateChange: useCallback((event: { action: string; record: { title: string; description: string | null; visibility: string } }) => {
      if (event.action === 'update') {
        // Update local state with changes from other collaborators
        // Only update if we don't have local changes to avoid conflicts
        if (!hasChanges) {
          setTitle(event.record.title);
          setDescription(event.record.description ?? "");
        }
        setCurrentVisibility(event.record.visibility);
      }
    }, [hasChanges]),
    onItemChange: useCallback((event: any) => {
      if (event.action === 'create') {
        // Skip if this step was just added locally
        if (recentlyAddedStepsRef.current.has(event.record.id)) {
          recentlyAddedStepsRef.current.delete(event.record.id);
          return;
        }
        // Add new step from collaborator
        const newStep: StepData = {
          id: event.record.id,
          templateId: event.record.blueprint,
          parentId: event.record.parent,
          path: event.record.path,
          itemType: event.record.itemType as "task" | "reference",
          content: event.record.content,
          referenceId: event.record.reference,
          position: event.record.position,
          metadata: event.record.metadata,
          createdAt: event.record.created,
          updatedAt: event.record.updated,
        };
        setSteps((prev) => {
          // Check if step already exists (avoid duplicates)
          if (prev.some((step) => step.id === newStep.id)) {
            return prev;
          }
          return [...prev, newStep];
        });
      } else if (event.action === 'update') {
        // Update existing step
        setSteps((prev) =>
          prev.map((step) =>
            step.id === event.record.id
              ? {
                  ...step,
                  content: event.record.content,
                  itemType: event.record.itemType as "task" | "reference",
                  referenceId: event.record.reference,
                  position: event.record.position,
                  path: event.record.path,
                  parentId: event.record.parent,
                  updatedAt: event.record.updated,
                }
              : step
          )
        );
      } else if (event.action === 'delete') {
        // Remove deleted step and its children
        setSteps((prev) => {
          const idsToRemove = new Set<string>([event.record.id]);
          const findDescendants = (parentId: string) => {
            prev.forEach((step) => {
              if (step.parentId === parentId) {
                idsToRemove.add(step.id);
                findDescendants(step.id);
              }
            });
          };
          findDescendants(event.record.id);
          return prev.filter((step) => !idsToRemove.has(step.id));
        });
      }
    }, []),
  });


  // Flatten steps for rendering
  const flattenedSteps = flattenTreeWithDepth(steps, steps);

  // Get the active step for drag overlay
  const activeStep = activeId
    ? flattenedSteps.find((step) => step.id === activeId)
    : null;

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (!over || active.id === over.id) {
        return;
      }

      const activeIndex = flattenedSteps.findIndex(
        (step) => step.id === active.id
      );
      const overIndex = flattenedSteps.findIndex((step) => step.id === over.id);

      if (activeIndex === -1 || overIndex === -1) {
        return;
      }

      const activeStep = flattenedSteps[activeIndex];
      const overStep = flattenedSteps[overIndex];

      if (!activeStep || !overStep) {
        return;
      }

      const newParentId = overStep.parentId;
      
      const targetSiblings = steps
        .filter(step => step.parentId === newParentId && step.id !== activeStep.id)
        .sort((a, b) => a.position - b.position);
      
      let newPosition: number;
      
      if (activeIndex < overIndex) {
        const overStepIndex = targetSiblings.findIndex(step => step.id === overStep.id);
        if (overStepIndex === -1) {
          newPosition = overStep.position + 1;
        } else if (overStepIndex === targetSiblings.length - 1) {
          newPosition = targetSiblings[overStepIndex]!.position + 1;
        } else {
          newPosition = targetSiblings[overStepIndex]!.position + 1;
        }
      } else {
        newPosition = overStep.position;
      }

      try {
        const response = await fetch(
          `/api/templates/${template.id}/items/reorder`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              move: {
                itemId: activeStep.id,
                newParentId,
                newPosition,
              },
            }),
          }
        );

        if (response.ok) {
          const stepsResponse = await fetch(
            `/api/templates/${template.id}/items`
          );
          if (stepsResponse.ok) {
            const data = await stepsResponse.json();
            if (data.success && data.items) {
              setSteps(
                data.items.map((step: StepData) => ({
                  ...step,
                  itemType: step.itemType as "task" | "reference",
                }))
              );
              announce(`Step "${activeStep.content}" moved successfully`);
            }
          }
        } else {
          announceAssertive("Failed to reorder steps");
        }
      } catch (error) {
        console.error("Failed to reorder steps:", error);
        announceAssertive("Failed to reorder steps");
      }
    },
    [flattenedSteps, steps, template.id, announce, announceAssertive]
  );


  const handleSaveTemplate = useCallback(async () => {
    if (!canEdit || !hasChanges) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/templates/${template.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || null,
        }),
      });

      if (response.ok) {
        setHasChanges(false);
        announce("Template saved successfully");
      } else {
        announceAssertive("Failed to save template");
      }
    } catch (error) {
      console.error("Failed to save template:", error);
      announceAssertive("Failed to save template");
    } finally {
      setIsSaving(false);
    }
  }, [canEdit, hasChanges, template.id, title, description, announce, announceAssertive]);

  const handleAddStep = useCallback(async () => {
    const content = newStepContent.trim();
    if (!canEdit || !content) {
      return;
    }

    try {
      const response = await fetch(`/api/templates/${template.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemType: ItemType.TASK,
          content: content,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.item) {
          recentlyAddedStepsRef.current.add(data.item.id);
          setTimeout(() => {
            recentlyAddedStepsRef.current.delete(data.item.id);
          }, 5000);
          
          setSteps((prev) => [
            ...prev,
            {
              ...data.item,
              itemType: data.item.itemType as "task" | "reference",
            },
          ]);
          setNewStepContent("");
          announce(`Step "${content}" added`);
        }
      } else {
        announceAssertive("Failed to add step");
      }
    } catch (error) {
      console.error("Failed to add step:", error);
      announceAssertive("Failed to add step");
    }
  }, [canEdit, newStepContent, template.id, announce, announceAssertive]);


  const handleUpdateStep = useCallback(
    async (stepId: string, content: string, itemType?: "task" | "reference", referenceId?: string | null) => {
      if (!canEdit) return;

      try {
        const updateData: Record<string, unknown> = { content };
        
        if (itemType !== undefined) {
          updateData.itemType = itemType;
          updateData.referenceId = itemType === "reference" ? referenceId : null;
        }

        const response = await fetch(`/api/items/${stepId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updateData),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.item) {
            setSteps((prev) =>
              prev.map((step) =>
                step.id === stepId
                  ? {
                      ...data.item,
                      itemType: data.item.itemType as "task" | "reference",
                    }
                  : step
              )
            );
          }
        }
      } catch (error) {
        console.error("Failed to update step:", error);
      }
      setEditingStepId(null);
    },
    [canEdit]
  );

  const handleDeleteStep = useCallback(
    async (stepId: string) => {
      if (!canEdit) return;

      const stepToDelete = steps.find((step) => step.id === stepId);
      
      try {
        const response = await fetch(`/api/items/${stepId}`, {
          method: "DELETE",
        });

        if (response.ok) {
          setSteps((prev) => {
            const idsToRemove = new Set<string>([stepId]);
            const findDescendants = (parentId: string) => {
              prev.forEach((step) => {
                if (step.parentId === parentId) {
                  idsToRemove.add(step.id);
                  findDescendants(step.id);
                }
              });
            };
            findDescendants(stepId);

            return prev.filter((step) => !idsToRemove.has(step.id));
          });
          announce(`Step "${stepToDelete?.content || "step"}" deleted`);
        } else {
          announceAssertive("Failed to delete step");
        }
      } catch (error) {
        console.error("Failed to delete step:", error);
        announceAssertive("Failed to delete step");
      }
    },
    [canEdit, steps, announce, announceAssertive]
  );


  const handleAddSubStep = useCallback(
    async (parentId: string) => {
      if (!canEdit) return;

      const content = "New sub-step";
      try {
        const response = await fetch(`/api/templates/${template.id}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            parentId,
            itemType: ItemType.TASK,
            content,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.item) {
            recentlyAddedStepsRef.current.add(data.item.id);
            setTimeout(() => {
              recentlyAddedStepsRef.current.delete(data.item.id);
            }, 5000);
            
            setSteps((prev) => [
              ...prev,
              {
                ...data.item,
                itemType: data.item.itemType as "task" | "reference",
              },
            ]);
            setEditingStepId(data.item.id);
          }
        }
      } catch (error) {
        console.error("Failed to add sub-step:", error);
      }
    },
    [canEdit, template.id]
  );

  const handleAddStepWithEditor = useCallback(
    async (data: {
      content: string;
      itemType: "task" | "reference";
      referenceId?: string | null;
    }) => {
      if (!canEdit) return;

      try {
        const response = await fetch(`/api/templates/${template.id}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            itemType: data.itemType === "task" ? ItemType.TASK : ItemType.REFERENCE,
            content: data.content,
            referenceId: data.referenceId,
          }),
        });

        if (response.ok) {
          const responseData = await response.json();
          if (responseData.success && responseData.item) {
            recentlyAddedStepsRef.current.add(responseData.item.id);
            setTimeout(() => {
              recentlyAddedStepsRef.current.delete(responseData.item.id);
            }, 5000);
            
            setSteps((prev) => [
              ...prev,
              {
                ...responseData.item,
                itemType: responseData.item.itemType as "task" | "reference",
              },
            ]);
            setShowStepEditor(false);
          }
        }
      } catch (error) {
        console.error("Failed to add step:", error);
      }
    },
    [canEdit, template.id]
  );


  const handleCreateChecklist = useCallback(async (conditionAnswers?: ConditionAnswers) => {
    const nameToUse = pendingChecklistName || checklistName;
    if (!nameToUse.trim()) return;
    
    setIsCreatingChecklist(true);
    try {
      const response = await fetch("/api/checklists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: template.id,
          name: nameToUse.trim(),
          conditionAnswers,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.checklist) {
          setShowChecklistNameDialog(false);
          setShowConditionQuestionnaire(false);
          setChecklistName("");
          setPendingChecklistName("");
          router.push(`/checklists/${data.checklist.id}`);
        }
      } else {
        announceAssertive("Failed to create checklist");
      }
    } catch (error) {
      console.error("Failed to create checklist:", error);
      announceAssertive("Failed to create checklist");
    } finally {
      setIsCreatingChecklist(false);
    }
  }, [template.id, checklistName, pendingChecklistName, router, announceAssertive]);

  const openCreateChecklistDialog = useCallback(() => {
    const today = formatTodayDate();
    setChecklistName(`${title} - ${today}`);
    setShowChecklistNameDialog(true);
  }, [title]);

  const handleChecklistNameSubmit = useCallback(() => {
    if (!checklistName.trim()) return;
    
    // If there are questions, show the questionnaire
    if (questions.length > 0) {
      setPendingChecklistName(checklistName.trim());
      setShowChecklistNameDialog(false);
      setShowConditionQuestionnaire(true);
    } else {
      // No questions, create directly
      handleCreateChecklist();
    }
  }, [checklistName, questions, handleCreateChecklist]);

  const handleQuestionnaireSubmit = useCallback((answers: ConditionAnswers) => {
    handleCreateChecklist(answers);
  }, [handleCreateChecklist]);

  const handleQuestionnaireSkip = useCallback(() => {
    handleCreateChecklist({});
  }, [handleCreateChecklist]);

  const handleQuestionsChange = useCallback(async (newQuestions: TemplateQuestion[]) => {
    setQuestions(newQuestions);
    
    // Save questions to the server
    try {
      const response = await fetch(`/api/templates/${template.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions: newQuestions }),
      });

      if (response.ok) {
        announce("Questions saved");
      } else {
        announceAssertive("Failed to save questions");
      }
    } catch (error) {
      console.error("Failed to save questions:", error);
      announceAssertive("Failed to save questions");
    }
  }, [template.id, announce, announceAssertive]);

  const handleDeleteTemplate = useCallback(async () => {
    if (!canEdit) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/templates/${template.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        announce("Template deleted successfully");
        router.push("/templates");
      } else {
        const data = await response.json();
        announceAssertive(data.error?.message || "Failed to delete template");
        setIsDeleting(false);
        setShowDeleteDialog(false);
      }
    } catch (error) {
      console.error("Failed to delete template:", error);
      announceAssertive("Failed to delete template");
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  }, [canEdit, template.id, router, announce, announceAssertive]);


  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="relative min-h-[calc(100vh-12rem)] pb-32">
      {/* Live region for status announcements - Requirements: 13.4 */}
      <LiveRegion message={statusMessage} politeness={politeness} />
      
      {/* Main Content Canvas */}
      <div className="w-full space-y-8">
        
        {/* Header Section */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3 flex-1 min-w-0">
             {/* Back Button */}
            <Button variant="ghost" size="sm" asChild className="-ml-2 rounded-xl text-muted-foreground hover:text-foreground">
              <Link href="/templates">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Link>
            </Button>

            <div className="flex items-center gap-4">
              {/* Large Icon */}
              <div className="p-3 rounded-[var(--radius)] bg-primary/10 text-primary hidden sm:block">
                <LayoutList className="h-6 w-6" />
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                {/* Title Row */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex-1 min-w-0 relative group">
                    {canEdit ? (
                      <Input
                        id="template-title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Template title"
                        className="!text-3xl !sm:text-4xl font-bold h-auto py-1 px-0 border-0 shadow-none focus-visible:ring-0 bg-transparent placeholder:text-muted-foreground/50 tracking-tight w-full"
                        style={{ fontSize: '2.25rem', lineHeight: '2.5rem' }} 
                        maxLength={200}
                        aria-label="Template title"
                        disabled={!canEdit}
                        autoComplete="off"
                      />
                    ) : (
                      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{title}</h1>
                    )}
                  </div>
                  
                  {/* Action Buttons (Right aligned in title row) */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                     <TooltipProvider>
                      {/* Visibility Badge style button */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => canEdit && setShowVisibilitySettings(true)}
                            className={`h-8 rounded-full border px-3 text-xs font-medium ${
                              currentVisibility === Visibility.PRIVATE 
                                ? "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20" 
                                : currentVisibility === Visibility.PUBLIC
                                ? "bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20"
                                : "bg-blue-500/10 text-blue-600 border-blue-500/20 hover:bg-blue-500/20"
                            }`}
                            disabled={!canEdit}
                          >
                            {currentVisibility === Visibility.PRIVATE && <Lock className="h-3.5 w-3.5 mr-1.5" />}
                            {currentVisibility === Visibility.PUBLIC && <Globe className="h-3.5 w-3.5 mr-1.5" />}
                            {currentVisibility === Visibility.SHARED && <Users className="h-3.5 w-3.5 mr-1.5" />}
                            {currentVisibility === Visibility.PRIVATE ? "Private" : currentVisibility === Visibility.PUBLIC ? "Public" : "Shared"}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Change Visibility</TooltipContent>
                      </Tooltip>

                      {/* Print Button - Pill style */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.print()}
                        className="hidden sm:flex h-8 rounded-full px-3 text-xs"
                      >
                        <Printer className="h-3.5 w-3.5 mr-2" />
                        Print
                      </Button>

                       {/* Start Checklist Button */}
                       <Button 
                        onClick={openCreateChecklistDialog}
                        className="h-8 rounded-full px-3 text-xs shadow-sm"
                        size="sm"
                      >
                        <Play className="h-3.5 w-3.5 mr-1.5" />
                        Start Checklist
                      </Button>
                      
                       {/* Dropdown for other actions */}
                      <DropdownMenu>
                         <DropdownMenuTrigger asChild>
                           <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                             <MoreVertical className="h-4 w-4" />
                           </Button>
                         </DropdownMenuTrigger>
                         <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuItem onClick={() => setShowExportDialog(true)}>
                              <Download className="h-4 w-4 mr-2" />
                              Export Template
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => window.print()} className="sm:hidden">
                              <Printer className="h-4 w-4 mr-2" />
                              Print Template
                            </DropdownMenuItem>
                            {canEdit && (
                              <>
                                <Separator className="my-1" />
                                <DropdownMenuItem onClick={() => setShowImportDialog(true)}>
                                  <Upload className="h-4 w-4 mr-2" />
                                  Import Data
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setShowDeleteDialog(true)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Template
                                </DropdownMenuItem>
                              </>
                            )}
                         </DropdownMenuContent>
                      </DropdownMenu>

                      {canEdit && hasChanges && (
                        <div className="ml-2 animate-in fade-in slide-in-from-right-4 duration-300">
                           <Button
                            onClick={handleSaveTemplate}
                            disabled={isSaving}
                            variant="secondary"
                            size="sm"
                            className="h-8 rounded-full border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 px-3 text-xs"
                          >
                            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                            Save
                          </Button>
                        </div>
                      )}
                    </TooltipProvider>
                  </div>
                </div>

                {/* Description and Metadata */}
                 <div className="space-y-2">
                    {/* Description */}
                    <div className="relative group max-w-3xl">
                      {canEdit ? (
                        <textarea
                          id="template-description"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Add a description..."
                          className="w-full min-h-[24px] text-sm text-muted-foreground bg-transparent border-0 resize-none focus:outline-none focus:ring-0 placeholder:text-muted-foreground/50 p-0"
                          rows={1}
                          style={{ height: 'auto', minHeight: '1.5rem' }}
                          onInput={(e) => {
                            const target = e.target as HTMLTextAreaElement;
                            target.style.height = 'auto';
                            target.style.height = target.scrollHeight + 'px';
                          }}
                          aria-label="Template description"
                          autoComplete="off"
                        />
                      ) : description && (
                        <p className="text-sm text-muted-foreground">{description}</p>
                      )}
                    </div>

                    {/* Metadata Line */}
                    <div className="flex items-center gap-3 text-xs font-medium text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>{steps.length} Step{steps.length !== 1 ? "s" : ""}</span>
                        </div>
                        <span>•</span>
                        <span>Updated {formatTodayDate()}</span>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </div>


        {/* Full Width Steps Editor */}
        <div className="w-full space-y-6">
          <Card className="rounded-[var(--radius)] border bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden">
            <CardHeader className="border-b bg-muted/20 py-4 px-6">
               <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    <LayoutList className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold">Steps</CardTitle>
                    <CardDescription className="sr-only">Manage template steps</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Configuration Button */}
                  {canEdit && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowConfigDialog(true)}
                            className="rounded-lg h-8 px-3 text-xs"
                          >
                            <Settings className="h-3.5 w-3.5 mr-1.5" />
                            Configure
                            {questions.length > 0 && (
                              <Badge variant="secondary" className="ml-1.5 text-[10px] h-4 px-1">
                                {questions.length}
                              </Badge>
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Conditional Logic & Preview</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
                
                {/* Add Step Input */}
                {canEdit && !showStepEditor && (
                   <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50 group-focus-within:text-primary transition-colors">
                      <Plus className="h-5 w-5" />
                    </div>
                    <Input
                      id="new-task-content"
                      value={newStepContent}
                      onChange={(e) => setNewStepContent(e.target.value)}
                      placeholder="Add a new step..."
                      className="pl-12 py-6 text-base bg-secondary/30 border-transparent hover:bg-secondary/50 focus:bg-background focus:border-primary/20 rounded-xl transition-all shadow-sm focus:shadow-md"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newStepContent.trim()) {
                           handleAddStep();
                        }
                      }}
                      autoComplete="off"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                      <TooltipProvider>
                        <Tooltip>
                           <TooltipTrigger asChild>
                              <Button
                                onClick={() => setShowStepEditor(true)}
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg"
                              >
                                <LinkIcon className="h-4 w-4" />
                              </Button>
                           </TooltipTrigger>
                           <TooltipContent>Add Reference</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                           <TooltipTrigger asChild>
                              <Button
                                onClick={handleAddStep}
                                disabled={!newStepContent.trim()}
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-primary hover:bg-primary/10 rounded-lg"
                              >
                                <Plus className="h-5 w-5" />
                              </Button>
                           </TooltipTrigger>
                           <TooltipContent>Add Step</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                   </div>
                )}

                {/* Advanced Step Editor */}
                {canEdit && showStepEditor && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-4 border rounded-xl bg-accent/20"
                  >
                    <StepEditor
                      currentTemplateId={template.id}
                      onSave={handleAddStepWithEditor}
                      onCancel={() => setShowStepEditor(false)}
                      isNew={true}
                    />
                  </motion.div>
                )}

                {/* Steps List */}
                {flattenedSteps.length > 0 ? (
                  <div className="min-h-[100px]">
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={flattenedSteps.map((step) => step.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div 
                          className="space-y-2" 
                          role="list"
                          aria-label={`Template steps, ${steps.length} total`}
                        >
                          {flattenedSteps.map((step) => (
                            <SortableStep
                              key={step.id}
                              step={step}
                              depth={step.depth}
                              canEdit={canEdit}
                              isEditing={editingStepId === step.id}
                              currentTemplateId={template.id}
                              questions={questions}
                              onStartEdit={() => setEditingStepId(step.id)}
                              onCancelEdit={() => setEditingStepId(null)}
                              onSaveEdit={(content, itemType, referenceId) => handleUpdateStep(step.id, content, itemType, referenceId)}
                              onDelete={() => handleDeleteStep(step.id)}
                              onAddSubStep={() => handleAddSubStep(step.id)}
                              onUpdateConditions={async (conditions) => {
                                const newMetadata = { ...step.metadata, conditions };
                                try {
                                  await fetch(`/api/items/${step.id}`, {
                                    method: "PUT",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ metadata: newMetadata }),
                                  });
                                  // Refresh locally
                                  setSteps((prev) => prev.map(s => s.id === step.id ? {...s, metadata: newMetadata} : s));
                                  announce("Conditions saved");
                                } catch(e) { console.error(e); }
                              }}
                            />
                          ))}
                        </div>
                      </SortableContext>

                      <DragOverlay>
                        {activeStep ? (
                          <div 
                            className="bg-card border rounded-xl p-3 shadow-xl opacity-90 backdrop-blur-md flex items-center gap-3"
                          >
                            <span className="font-medium">{activeStep.content}</span>
                          </div>
                        ) : null}
                      </DragOverlay>
                    </DndContext>
                  </div>
                ) : (
                  !showStepEditor && (
                    <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-xl bg-secondary/5 border-muted/30">
                      <div className="p-4 rounded-full bg-secondary/10 mb-4 text-muted-foreground">
                        <LayoutList className="h-6 w-6" />
                      </div>
                      <h3 className="text-base font-medium">No steps yet</h3>
                      <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-4">
                        Get started by adding your first task or reference above.
                      </p>
                    </div>
                  )
                )}
              </CardContent>
            </Card>
          </div>
        </div>

      {/* Configuration Dialog */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Settings className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>Configuration</DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  Conditional logic and template preview
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <ScrollArea className="max-h-[65vh]">
            <div className="p-6 space-y-6">
              {/* Conditional Questions */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  Conditional Logic
                  <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal">
                    {questions.length}
                  </Badge>
                </h4>
                <QuestionManager
                  questions={questions}
                  onChange={handleQuestionsChange}
                  canEdit={canEdit}
                />
              </div>

              {/* Preview Section */}
              {questions.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <h4 className="text-sm font-medium text-primary">Preview</h4>
                    </div>
                    <TemplatePreview
                      questions={questions}
                      items={steps.map(s => ({
                        id: s.id,
                        content: s.content,
                        parentId: s.parentId,
                        metadata: s.metadata,
                      }))}
                    />
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Dialogs */}
      <VisibilitySettingsPanel
        templateId={template.id}
        currentVisibility={currentVisibility}
        isOwner={canEdit}
        isOpen={showVisibilitySettings}
        onOpenChange={setShowVisibilitySettings}
        onVisibilityChange={(newVisibility) => setCurrentVisibility(newVisibility)}
      />

      <ExportDialog
        templateId={template.id}
        templateTitle={title}
        isOpen={showExportDialog}
        onOpenChange={setShowExportDialog}
      />

      <ImportDialog
        workspaceId={template.workspaceId}
        isOpen={showImportDialog}
        onOpenChange={setShowImportDialog}
      />

      <Dialog open={showChecklistNameDialog} onOpenChange={setShowChecklistNameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Checklist</DialogTitle>
            <DialogDescription>
              Start a new checklist instance from this template.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="checklist-name">Checklist Name</Label>
              <Input
                id="checklist-name"
                value={checklistName}
                onChange={(e) => setChecklistName(e.target.value)}
                placeholder={`e.g. ${title} - ${formatTodayDate()}`}
                disabled={isCreatingChecklist}
                autoComplete="off"
              />
            </div>
            {questions.length > 0 && (
              <div className="bg-muted/50 p-3 rounded-md text-sm text-muted-foreground flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <span>You'll be asked {questions.length} customization questions next.</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowChecklistNameDialog(false)}
              disabled={isCreatingChecklist}
            >
              Cancel
            </Button>
            <Button
              onClick={handleChecklistNameSubmit}
              disabled={!checklistName.trim() || isCreatingChecklist}
            >
              {isCreatingChecklist && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {questions.length > 0 ? "Continue" : "Create Checklist"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Condition Questionnaire Dialog */}
      <ConditionQuestionnaire
        isOpen={showConditionQuestionnaire}
        onOpenChange={setShowConditionQuestionnaire}
        questions={questions}
        templateTitle={title}
        onSubmit={handleQuestionnaireSubmit}
        onSkip={handleQuestionnaireSkip}
        isSubmitting={isCreatingChecklist}
      />

      {/* Delete Confirmation Dialog */}
       <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              template <span className="font-semibold text-foreground">"{title}"</span> and all its associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteTemplate();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Template
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
