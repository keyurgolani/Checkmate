"use client";

/**
 * Template Detail Client Component
 *
 * Client-side component for displaying template details and creating checklists.
 * Handles the "Create Checklist" flow with authentication check.
 *
 * Requirements: 2.1, 2.3, 8.5
 */

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Calendar,
  Copy,
  Globe,
  ListChecks,
  Loader2,
  Plus,
  Star,
  Tag,
  User,
  CheckCircle2,
  Circle,
  ChevronRight,
  Compass,
  FileText,
  ExternalLink,
  Printer,
  Lock,
} from "lucide-react";
import { formatDate, formatTodayDate, cn } from "@/lib/utils";
import type { ItemMetadata } from "@/lib/pocketbase-types";

// ============================================================================
// Types
// ============================================================================

interface TemplateData {
  id: string;
  title: string;
  description: string | null;
  visibility: string;
  category: string | null;
  tags: string[] | null;
  version: number;
  instanceCount: number;
  ratingSum: number;
  ratingCount: number;
  createdAt: string;
  updatedAt: string;
  owner: {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
  } | null;
}

interface ItemData {
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

interface TemplateDetailClientProps {
  template: TemplateData | null;
  items: ItemData[];
  isAuthenticated: boolean;
  accessLevel?: 'full' | 'limited';
}

// ============================================================================
// Helper Components
// ============================================================================

function StatBadge({
  icon: Icon,
  value,
  label,
  color = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: string | number;
  label: string;
  color?: "default" | "primary" | "amber";
}) {
  const colorClasses = {
    default: "bg-muted/50 text-muted-foreground",
    primary: "bg-primary/10 text-primary",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium",
        colorClasses[color]
      )}
      title={label}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      <span>{value}</span>
    </div>
  );
}

function RatingDisplay({
  ratingSum,
  ratingCount,
}: {
  ratingSum: number;
  ratingCount: number;
}) {
  if (ratingCount === 0) {
    return (
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-muted/50 text-muted-foreground"
        title="No ratings yet"
      >
        <Star className="h-4 w-4" aria-hidden="true" />
        <span>No ratings</span>
      </div>
    );
  }

  const rating = ratingSum / ratingCount;
  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400"
      title={`Rating: ${rating.toFixed(1)} out of 5 (${ratingCount} ratings)`}
    >
      <Star className="h-4 w-4 fill-current" aria-hidden="true" />
      <span>{rating.toFixed(1)}</span>
      <span className="text-muted-foreground">({ratingCount})</span>
    </div>
  );
}

function ItemDisplay({
  item,
  items,
  depth = 0,
}: {
  item: ItemData;
  items: ItemData[];
  depth?: number;
}) {
  const children = items.filter((i) => i.parentId === item.id);
  children.sort((a, b) => a.position - b.position);

  const isReference = item.itemType === "reference";

  return (
    <div className="space-y-0.5">
      {isReference ? (
        <ReferenceItemDisplay item={item} depth={depth} />
      ) : (
        /* Regular task item */
        <div
          className={cn(
            "group flex items-start gap-3 py-2.5 px-3 rounded-xl transition-all duration-200",
            "hover:bg-muted/40 border border-transparent hover:border-border/40",
            depth > 0 && "ml-6"
          )}
        >
          <Circle
            className="h-4 w-4 mt-0.5 text-muted-foreground/50 flex-shrink-0 group-hover:text-primary/60 transition-colors"
            aria-hidden="true"
          />
          <span className="flex-1 text-[15px] leading-relaxed text-foreground/90">
            {item.content}
          </span>
        </div>
      )}
      {children.length > 0 && (
        <div className={cn("space-y-0.5", depth === 0 && "relative before:absolute before:left-[1.375rem] before:top-0 before:bottom-2 before:w-px before:bg-border/40")}>
          {children.map((child) => (
            <ItemDisplay
              key={child.id}
              item={child}
              items={items}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ReferenceItemDisplay({
  item,
  depth = 0,
}: {
  item: ItemData;
  depth?: number;
}) {
  const [isExpanded, setIsExpanded] = useState(true); // Default to expanded per requirements
  const [isLoading, setIsLoading] = useState(false);
  const [referenceItems, setReferenceItems] = useState<ItemData[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchReferenceItems = useCallback(async () => {
    if (!item.referenceId || referenceItems !== null) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/templates/${item.referenceId}/items`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.items) {
          setReferenceItems(data.items);
        } else {
          setError("Could not load template items");
        }
      } else {
        setError("Template not accessible");
      }
    } catch (err) {
      console.error("Failed to load template:", err);
      setError("Failed to load template");
    } finally {
      setIsLoading(false);
    }
  }, [item.referenceId, referenceItems]);

  // Fetch items immediately since we defaulted to expanded
  useEffect(() => {
    if (isExpanded && referenceItems === null) {
      fetchReferenceItems();
    }
  }, [isExpanded, referenceItems, fetchReferenceItems]);

  const handleToggleExpand = async () => {
    if (!isExpanded && referenceItems === null) {
      await fetchReferenceItems();
    }
    setIsExpanded(!isExpanded);
  };

  const rootItems = referenceItems?.filter((i) => !i.parentId).sort((a, b) => a.position - b.position) ?? [];

  return (
    <div className={cn("space-y-0", depth > 0 && "ml-6")}>
      {/* Reference card header */}
      <div
        className={cn(
          "group flex items-center gap-3 py-3 px-4 rounded-xl transition-all duration-200 cursor-pointer",
          "bg-gradient-to-r from-blue-50/90 via-blue-50/60 to-transparent dark:from-blue-950/50 dark:via-blue-950/30 dark:to-transparent",
          "border border-blue-200/70 dark:border-blue-800/50",
          "hover:from-blue-100/90 hover:border-blue-300/80 dark:hover:from-blue-950/70 dark:hover:border-blue-700/60",
          "hover:shadow-sm",
          isExpanded && "rounded-b-none border-b-transparent"
        )}
        onClick={handleToggleExpand}
        role="button"
        aria-expanded={isExpanded}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleToggleExpand();
          }
        }}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={cn(
            "p-1 rounded-md transition-all duration-200 text-blue-500 dark:text-blue-400",
            isExpanded && "rotate-90 bg-blue-100 dark:bg-blue-900/50"
          )}>
            <ChevronRight className="h-4 w-4" />
          </div>
          
          <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex-shrink-0 shadow-sm group-hover:shadow transition-shadow">
            <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
          </div>
          
          <div className="flex-1 min-w-0">
            <span className="font-semibold text-blue-800 dark:text-blue-200 block leading-tight truncate">
              {item.content}
            </span>
            <p className="text-xs text-blue-600/70 dark:text-blue-400/60 mt-0.5 flex items-center gap-1.5">
              {isLoading ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-200/60 dark:bg-blue-800/40 uppercase tracking-wide">
                    reference
                  </span>
                  <span className="text-blue-500/60 dark:text-blue-400/50 hidden sm:inline">•</span>
                  <span className="hidden sm:inline">Click to {isExpanded ? 'collapse' : 'expand'}</span>
                </>
              )}
            </p>
          </div>
        </div>

        {item.referenceId && (
          <Button
            variant="ghost"
            size="sm"
            asChild
            className={cn(
              "shrink-0 h-8 px-3 rounded-lg hover:bg-blue-200/60 dark:hover:bg-blue-800/50 text-blue-600 dark:text-blue-300 font-medium",
              "z-10 relative" 
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <Link href={`/discover/${item.referenceId}`}>
              <span>Open</span>
              <ExternalLink className="h-3.5 w-3.5 ml-1.5 opacity-70" />
            </Link>
          </Button>
        )}
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className={cn(
            "border border-t-0 border-blue-200/70 dark:border-blue-800/50 rounded-b-xl",
            "bg-gradient-to-b from-blue-50/50 to-blue-50/20 dark:from-blue-950/30 dark:to-blue-950/10"
          )}
        >
          <div className="p-4 pl-6 space-y-0.5">
            {error ? (
              <p className="text-sm text-muted-foreground py-2 px-3">{error}</p>
            ) : rootItems.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2 px-3">No items in this template</p>
            ) : (
              rootItems.map((refItem) => (
                <ItemDisplay
                  key={refItem.id}
                  item={refItem}
                  items={referenceItems ?? []}
                  depth={0}
                />
              ))
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}

export function TemplateDetailClient({
  template,
  items,
  isAuthenticated,
  accessLevel = 'full',
}: TemplateDetailClientProps) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [checklistName, setChecklistName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [requestStatus, setRequestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleRequestAccess = async () => {
    if (!template) return;

    if (!isAuthenticated) {
      router.push(`/signin?returnTo=/discover/${template.id}`);
      return;
    }

    setRequestStatus('loading');
    setError(null);

    try {
      const response = await fetch('/api/templates/request-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ templateId: template.id }),
      });

      const data = await response.json();

      if (data.success) {
        setRequestStatus('success');
      } else {
        setRequestStatus('error');
        setError(data.error || 'Failed to send request');
      }
    } catch (err) {
      console.error('Error requesting access:', err);
      setRequestStatus('error');
      setError('An error occurred');
    }
  };

  // Animation variants
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  };

  if (!template) {
    return (
      <div className="container py-10 text-center">
        <p className="text-muted-foreground">Template not found</p>
      </div>
    );
  }

  const isLimitedAccess = accessLevel === 'limited';
  const rootItems = items.filter((item) => !item.parentId);
  rootItems.sort((a, b) => a.position - b.position);

  const formattedDate = formatDate(template.createdAt, { format: "long" });

  const handleCreateChecklist = async () => {
    if (!isAuthenticated) {
      router.push(`/signin?returnTo=/discover/${template.id}`);
      return;
    }

    setShowNameDialog(true);
    setChecklistName(`${template.title} - ${formatTodayDate()}`);
  };

  const handleConfirmCreate = async () => {
    if (!checklistName.trim()) {
      setError("Please enter a name for your checklist");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch("/api/checklists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          templateId: template.id,
          name: checklistName.trim(),
        }),
      });

      const data = await response.json();

      if (data.success && data.checklist) {
        router.push(`/checklists/${data.checklist.id}`);
      } else {
        setError(data.error?.message || "Failed to create checklist");
        setIsCreating(false);
      }
    } catch (err) {
      console.error("Error creating checklist:", err);
      setError("An error occurred while creating the checklist");
      setIsCreating(false);
    }
  };

  const handleCancelCreate = () => {
    setShowNameDialog(false);
    setChecklistName("");
    setError(null);
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="w-full space-y-6"
    >
      {/* Back button */}
      <motion.div variants={item}>
        <Button variant="ghost" size="sm" asChild className="rounded-xl -ml-2 no-print">
          <Link href="/discover">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Discover
          </Link>
        </Button>
      </motion.div>

      {/* Template Header */}
      <motion.div variants={item} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              {template.visibility === "public" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
                  <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                  Public
                </span>
              )}
              {template.visibility === "private" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                  Private
                </span>
              )}
              {template.category && (
                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-secondary/50 border border-border">
                  {template.category}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className={cn(
                "p-3 rounded-[var(--radius)]",
                isLimitedAccess 
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" 
                  : "bg-primary/10 text-primary"
              )}>
                {isLimitedAccess ? (
                  <Lock className="h-6 w-6" />
                ) : (
                  <Compass className="h-6 w-6" />
                )}
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                  {template.title}
                </h1>
                {template.description && (
                  <p className="text-muted-foreground mt-1 max-w-2xl">
                    {template.description}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2 items-start">
            <Button
              variant="outline"
              size="lg"
              onClick={() => window.print()}
              className="hidden sm:flex rounded-xl h-11 no-print"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            

            {/* Create Checklist / Request Access Button */}
            {!showNameDialog && (
              isLimitedAccess ? (
                <Button
                  className="flex-shrink-0 rounded-xl h-11"
                  size="lg"
                  onClick={handleRequestAccess}
                  disabled={requestStatus === 'loading' || requestStatus === 'success'}
                  variant={requestStatus === 'success' ? "outline" : "default"}
                >
                  {requestStatus === 'loading' ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : requestStatus === 'success' ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                      Request Sent
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 mr-2" />
                      Request Access
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handleCreateChecklist}
                  disabled={isCreating}
                  className="flex-shrink-0 rounded-xl h-11"
                  size="lg"
                >
                  {isCreating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Create Checklist
                </Button>
              )
            )}
          </div>
        </div>

        {/* Checklist Name Dialog */}
        {showNameDialog && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="max-w-md rounded-[var(--radius)] border bg-card/80 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold">Name Your Checklist</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="checklist-name">Checklist Name</Label>
                  <Input
                    id="checklist-name"
                    value={checklistName}
                    onChange={(e) => setChecklistName(e.target.value)}
                    placeholder="e.g., Baby Checklist - Emma 2024"
                    disabled={isCreating}
                    className="rounded-xl h-11"
                  />
                  <p className="text-xs text-muted-foreground">
                    Give your checklist a name to help you identify it later.
                  </p>
                </div>
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
                <div className="flex gap-2">
                  <Button
                    onClick={handleConfirmCreate}
                    disabled={isCreating}
                    className="rounded-xl"
                  >
                    {isCreating ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                    )}
                    Create
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCancelCreate}
                    disabled={isCreating}
                    className="rounded-xl"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Limited Access Message */}
        {/* Limited Access Message */}
        {isLimitedAccess && (
          <motion.div variants={item} className="rounded-[var(--radius)] border border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20 p-4">
            <div className="flex gap-3 items-start">
              <div className="shrink-0 p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-medium text-amber-900 dark:text-amber-200">Private Template</h3>
                <p className="text-sm text-amber-700/80 dark:text-amber-400/70 mt-1 max-w-2xl">
                  You don&apos;t have full access to view this template&apos;s content. You can request access from the owner to view or use this template.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Stats Row */}
        <div className="flex flex-wrap items-center gap-2 pt-2">
          {!isLimitedAccess && (
            <StatBadge
              icon={ListChecks}
              value={items.length}
              label={`${items.length} items`}
              color="primary"
            />
          )}
          <StatBadge
            icon={Copy}
            value={template.instanceCount}
            label={`${template.instanceCount} checklists created`}
          />
          <RatingDisplay
            ratingSum={template.ratingSum}
            ratingCount={template.ratingCount}
          />
        </div>

        {/* Tags */}
        {template.tags && template.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <Tag className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            {template.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs bg-secondary/50 px-2.5 py-1 rounded-full border border-border"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Creator Info & Date */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          {template.owner && (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" aria-hidden="true" />
              <span>
                Created by{" "}
                <span className="font-medium text-foreground">
                  {template.owner.displayName || "Anonymous"}
                </span>
              </span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" aria-hidden="true" />
            <span>{formattedDate}</span>
          </div>
        </div>
      </motion.div>

      {/* Items List - Hide if Limited Access */}
      {!isLimitedAccess && (
        <motion.div variants={item}>
          <Card className="rounded-[var(--radius)] border bg-card/50 backdrop-blur-sm overflow-hidden">
            <CardHeader className="border-b bg-muted/30">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <ListChecks className="h-5 w-5 text-primary" />
                Checklist Items ({items.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {rootItems.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  This template has no items yet.
                </p>
              ) : (
                <div className="space-y-1">
                  {rootItems.map((item) => (
                    <ItemDisplay key={item.id} item={item} items={items} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Call to Action for Anonymous Users */}
      {!isAuthenticated && !isLimitedAccess && (
        <motion.div variants={item}>
          <Card className="rounded-[var(--radius)] bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="py-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-lg">Want to use this checklist?</h3>
                  <p className="text-sm text-muted-foreground">
                    Sign in or create an account to create your own checklist and
                    track your progress.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" asChild className="rounded-xl">
                    <Link href={`/signin?returnTo=/discover/${template.id}`}>
                      Sign In
                    </Link>
                  </Button>
                  <Button asChild className="rounded-xl">
                    <Link href={`/signup?returnTo=/discover/${template.id}`}>
                      Sign Up
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}
