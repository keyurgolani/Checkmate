"use client";

/**
 * Filter Dialog Component
 * 
 * A beautiful modal dialog for filtering search results on mobile.
 * Provides the same filtering options as FilterSidebar but in a modal format.
 * 
 * Requirements: 8.1, 8.2 - Search and filtering
 */

import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Check, X, SlidersHorizontal, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Category {
  name: string;
  templateCount: number;
}

export type SortOption = "relevance" | "popularity" | "rating" | "date";

export interface FilterState {
  category: string | null;
  sortBy: SortOption;
  tags: string[];
}

interface FilterDialogProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  categories: Category[];
  popularTags?: string[];
  isLoading?: boolean;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const SORT_OPTIONS: { value: SortOption; label: string; description: string }[] = [
  { value: "relevance", label: "Most Relevant", description: "Best matches first" },
  { value: "popularity", label: "Most Popular", description: "Most used templates" },
  { value: "rating", label: "Highest Rated", description: "Top rated by users" },
  { value: "date", label: "Most Recent", description: "Newest templates" },
];

export function FilterDialog({
  filters,
  onFiltersChange,
  categories,
  popularTags = [],
  isLoading = false,
  isOpen,
  onOpenChange,
}: FilterDialogProps) {
  const handleCategorySelect = useCallback((categoryName: string | null) => {
    onFiltersChange({
      ...filters,
      category: filters.category === categoryName ? null : categoryName,
    });
  }, [filters, onFiltersChange]);

  const handleSortChange = useCallback((sortBy: SortOption) => {
    onFiltersChange({ ...filters, sortBy });
  }, [filters, onFiltersChange]);

  const handleTagToggle = useCallback((tag: string) => {
    const newTags = filters.tags.includes(tag)
      ? filters.tags.filter((t) => t !== tag)
      : [...filters.tags, tag];
    onFiltersChange({ ...filters, tags: newTags });
  }, [filters, onFiltersChange]);

  const handleClearFilters = useCallback(() => {
    onFiltersChange({ category: null, sortBy: "relevance", tags: [] });
  }, [onFiltersChange]);

  const hasActiveFilters = filters.category !== null || filters.sortBy !== "relevance" || filters.tags.length > 0;
  const activeFilterCount = (filters.category ? 1 : 0) + (filters.sortBy !== "relevance" ? 1 : 0) + filters.tags.length;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <SlidersHorizontal className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>Filters</DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  Refine your search results
                </DialogDescription>
              </div>
            </div>
            {activeFilterCount > 0 && (
              <Badge className="rounded-lg">{activeFilterCount} active</Badge>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="p-6 space-y-6">
            {/* Sort Options */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Sort By</label>
              <div className="grid gap-2">
                {SORT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleSortChange(option.value)}
                    disabled={isLoading}
                    className={cn(
                      "w-full text-left px-4 py-3 rounded-xl transition-all flex items-center justify-between border-2",
                      filters.sortBy === option.value
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "border-transparent hover:bg-muted/50 hover:border-muted"
                    )}
                  >
                    <div>
                      <div className="font-medium text-sm">{option.label}</div>
                      <div className="text-xs text-muted-foreground">{option.description}</div>
                    </div>
                    {filters.sortBy === option.value && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Categories */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Categories</label>
              {categories.length === 0 ? (
                <p className="text-sm text-muted-foreground/60 italic py-4 text-center">No categories found</p>
              ) : (
                <div className="grid gap-2 max-h-48 overflow-y-auto">
                  {categories.map((category) => (
                    <button
                      key={category.name}
                      onClick={() => handleCategorySelect(category.name)}
                      disabled={isLoading}
                      className={cn(
                        "w-full text-left px-4 py-3 rounded-xl transition-all flex items-center justify-between border-2",
                        filters.category === category.name
                          ? "bg-primary/10 border-primary/30 text-primary"
                          : "border-transparent hover:bg-muted/50 hover:border-muted"
                      )}
                    >
                      <span className="truncate font-medium text-sm">{category.name}</span>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-md",
                          filters.category === category.name 
                            ? "bg-primary/20 text-primary" 
                            : "bg-muted text-muted-foreground"
                        )}>
                          {category.templateCount}
                        </span>
                        {filters.category === category.name && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Popular Tags */}
            {popularTags.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <label className="text-sm font-medium">Popular Tags</label>
                  <div className="flex flex-wrap gap-2">
                    {popularTags.map((tag) => {
                      const isSelected = filters.tags.includes(tag);
                      return (
                        <button
                          key={tag}
                          onClick={() => handleTagToggle(tag)}
                          disabled={isLoading}
                          className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl transition-all border-2",
                            isSelected
                              ? "bg-primary/10 border-primary/30 text-primary"
                              : "border-transparent bg-muted/50 hover:bg-muted hover:border-muted"
                          )}
                        >
                          {tag}
                          {isSelected && <X className="h-3 w-3" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* Active Filters Summary */}
            {hasActiveFilters && (
              <>
                <Separator />
                <div className="space-y-3">
                  <label className="text-sm font-medium">Active Filters</label>
                  <div className="flex flex-wrap gap-2">
                    {filters.category && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg border border-blue-500/20 font-medium">
                        {filters.category}
                        <button onClick={() => handleCategorySelect(null)} className="hover:text-blue-800 dark:hover:text-blue-200">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    )}
                    {filters.sortBy !== "relevance" && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-lg border border-purple-500/20 font-medium">
                        {SORT_OPTIONS.find(o => o.value === filters.sortBy)?.label}
                        <button onClick={() => handleSortChange("relevance")} className="hover:text-purple-800 dark:hover:text-purple-200">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    )}
                    {filters.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-green-500/10 text-green-600 dark:text-green-400 rounded-lg border border-green-500/20 font-medium"
                      >
                        {tag}
                        <button onClick={() => handleTagToggle(tag)} className="hover:text-green-800 dark:hover:text-green-200">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t bg-muted/30">
          <div className="flex items-center justify-between w-full gap-3">
            {hasActiveFilters ? (
              <Button variant="ghost" onClick={handleClearFilters} className="rounded-lg">
                Clear all
              </Button>
            ) : (
              <div />
            )}
            <Button onClick={() => onOpenChange(false)} className="rounded-lg">
              Apply Filters
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
