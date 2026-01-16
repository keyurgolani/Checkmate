"use client";

/**
 * Filter Sidebar Component
 * 
 * Provides filtering options for search results with consistent design.
 * 
 * Requirements: 8.1, 8.2 - Search and filtering
 */

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Check, X, SlidersHorizontal } from "lucide-react";
import { useCallback } from "react";
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

interface FilterSidebarProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  categories: Category[];
  popularTags?: string[];
  isLoading?: boolean;
  className?: string;
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "relevance", label: "Most Relevant" },
  { value: "popularity", label: "Most Popular" },
  { value: "rating", label: "Highest Rated" },
  { value: "date", label: "Most Recent" },
];

export function FilterSidebar({
  filters,
  onFiltersChange,
  categories,
  popularTags = [],
  isLoading = false,
  className = "",
}: FilterSidebarProps) {
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
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "rounded-xl border bg-card/50 backdrop-blur-sm p-5",
        className
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <SlidersHorizontal className="h-4 w-4" />
          </div>
          <h3 className="font-semibold">Filters</h3>
          {activeFilterCount > 0 && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              {activeFilterCount}
            </span>
          )}
        </div>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={handleClearFilters} className="h-7 text-xs rounded-lg">
            Clear all
          </Button>
        )}
      </div>

      {/* Sort Options */}
      <div className="space-y-2 mb-4">
        <label className="text-sm font-medium text-muted-foreground">Sort By</label>
        <div className="space-y-1">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => handleSortChange(option.value)}
              disabled={isLoading}
              className={cn(
                "w-full text-left px-3 py-2 text-sm rounded-xl transition-all flex items-center justify-between",
                filters.sortBy === option.value
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )}
            >
              {option.label}
              {filters.sortBy === option.value && <Check className="h-3 w-3" />}
            </button>
          ))}
        </div>
      </div>

      <Separator className="my-4" />

      {/* Categories */}
      <div className="space-y-2 mb-4">
        <label className="text-sm font-medium text-muted-foreground">Categories</label>
        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground/60 italic">No categories found</p>
        ) : (
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {categories.map((category) => (
              <button
                key={category.name}
                onClick={() => handleCategorySelect(category.name)}
                disabled={isLoading}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm rounded-xl transition-all flex items-center justify-between",
                  filters.category === category.name
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                )}
              >
                <span className="truncate">{category.name}</span>
                <span className={cn(
                  "text-xs",
                  filters.category === category.name ? "text-primary-foreground/70" : "text-muted-foreground"
                )}>
                  {category.templateCount}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Popular Tags */}
      {popularTags.length > 0 && (
        <>
          <Separator className="my-4" />
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Popular Tags</label>
            <div className="flex flex-wrap gap-2">
              {popularTags.map((tag) => {
                const isSelected = filters.tags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => handleTagToggle(tag)}
                    disabled={isLoading}
                    className={cn(
                      "inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-full transition-all",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80"
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
          <Separator className="my-4" />
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Active Filters</label>
            <div className="flex flex-wrap gap-2">
              {filters.category && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full border border-blue-500/20">
                  {filters.category}
                  <button onClick={() => handleCategorySelect(null)} className="hover:text-blue-800 dark:hover:text-blue-200">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {filters.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-green-500/10 text-green-600 dark:text-green-400 rounded-full border border-green-500/20"
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
    </motion.div>
  );
}
