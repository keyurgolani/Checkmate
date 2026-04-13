"use client";

/**
 * Discover Page
 * 
 * Browse and search public checklist templates.
 * Provides search input with suggestions and filter sidebar.
 * 
 * Requirements: 8.1, 8.2
 */

import { useState, useCallback, useEffect, useMemo, useTransition, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { SearchInput } from "@/components/search/search-input";
import { FilterDialog } from "@/components/search/filter-dialog";
import { TemplateCard } from "@/components/templates/template-card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Loader2, Search, Compass, Filter, X, ArrowUpDown, Check, Eye, PlayCircle, Download } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSelection } from "@/lib/hooks/use-selection";
import { BulkActionBar } from "@/components/shared/bulk-action-bar";
import type { ContextMenuItemConfig } from "@/components/shared/entity-context-menu";
import type { BulkAction } from "@/components/shared/bulk-action-bar";
import type { SearchSuggestion } from "@/components/search/search-input";
import type { FilterState, Category, SortOption } from "@/components/search/filter-sidebar";
import type { TemplateCardData } from "@/components/templates/template-card";
import { bulkUseTemplates, bulkExportDiscoverTemplates } from "./actions";

interface SearchResponse {
  success: boolean;
  templates?: Array<{
    id: string;
    workspaceId: string;
    ownerId: string;
    ownerName: string | null;
    title: string;
    description: string | null;
    visibility: string;
    category: string | null;
    tags: string[] | null;
    version: number;
    instanceCount: number;
    stepCount: number;
    rating: number | null;
    createdAt: string;
    updatedAt: string;
  }>;
  pagination?: {
    page: number;
    perPage: number;
    totalItems: number;
    totalPages: number;
  };
  error?: { code: string; message: string };
}

interface CategoriesResponse {
  success: boolean;
  categories?: Category[];
  error?: { code: string; message: string };
}

const POPULAR_TAGS = ["productivity", "travel", "home", "work", "health", "baby", "wedding", "moving"];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "relevance", label: "Most Relevant" },
  { value: "popularity", label: "Most Popular" },
  { value: "rating", label: "Highest Rated" },
  { value: "date", label: "Most Recent" },
];

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

function DiscoverPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [filters, setFilters] = useState<FilterState>(() => ({
    category: searchParams.get("category") || null,
    sortBy: (searchParams.get("sortBy") as SortOption) || "relevance",
    tags: searchParams.get("tags")?.split(",").filter(Boolean) || [],
  }));
  const [categories, setCategories] = useState<Category[]>([]);
  const [templates, setTemplates] = useState<TemplateCardData[]>([]);
  const [pagination, setPagination] = useState({ page: 1, perPage: 20, totalItems: 0, totalPages: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Selection state
  const templateIds = useMemo(() => templates.map((t) => t.id), [templates]);
  const selection = useSelection(templateIds);

  // Context menu items for discover templates
  const contextMenuItems: ContextMenuItemConfig<TemplateCardData>[] = useMemo(() => [
    {
      label: "View Details",
      icon: Eye,
      action: (id) => {
        router.push(`/discover/${id}`);
      },
    },
    {
      label: "Use Template",
      icon: PlayCircle,
      action: (id) => {
        startTransition(async () => {
          const result = await bulkUseTemplates([id]);
          if (result.success) {
            router.push("/checklists");
          }
        });
      },
    },
    {
      label: "Export",
      icon: Download,
      action: (id) => {
        startTransition(async () => {
          const result = await bulkExportDiscoverTemplates([id]);
          if (result.success && result.exports && result.exports.length > 0) {
            const exportData = result.exports[0];
            if (!exportData) return;
            const blob = new Blob(
              [JSON.stringify(exportData.data, null, 2)],
              { type: "application/json" }
            );
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `template-${id}.json`;
            a.click();
            URL.revokeObjectURL(url);
          }
        });
      },
      separator: "after",
    },
  ], [router, startTransition]);

  // Bulk actions factory
  const bulkActionFactory = useCallback((selectedIds: Set<string>): BulkAction[] => {
    const ids = Array.from(selectedIds);
    return [
      {
        label: "Use Templates",
        icon: PlayCircle,
        action: () => {
          startTransition(async () => {
            const result = await bulkUseTemplates(ids);
            if (result.success) {
              router.push("/checklists");
            }
          });
        },
      },
      {
        label: "Export",
        icon: Download,
        action: () => {
          startTransition(async () => {
            const result = await bulkExportDiscoverTemplates(ids);
            if (result.success && result.exports) {
              const blob = new Blob(
                [JSON.stringify(result.exports, null, 2)],
                { type: "application/json" }
              );
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `templates-export.json`;
              a.click();
              URL.revokeObjectURL(url);
            }
          });
        },
      },
    ];
  }, [router, startTransition]);

  const debouncedQuery = useDebounce(searchQuery, 300);

  const suggestions = useMemo<SearchSuggestion[]>(() => {
    if (!debouncedQuery.trim()) return [];
    const query = debouncedQuery.toLowerCase();
    const results: SearchSuggestion[] = [];

    categories.filter((c) => c.name.toLowerCase().includes(query)).slice(0, 3).forEach((c) => {
      results.push({ type: "category", value: c.name, label: c.name });
    });

    POPULAR_TAGS.filter((t) => t.toLowerCase().includes(query)).slice(0, 3).forEach((t) => {
      results.push({ type: "tag", value: t, label: t });
    });

    if (debouncedQuery.trim().length >= 2) {
      results.unshift({ type: "query", value: debouncedQuery, label: `Search for "${debouncedQuery}"` });
    }

    return results.slice(0, 6);
  }, [debouncedQuery, categories]);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const response = await fetch("/api/categories");
        const data: CategoriesResponse = await response.json();
        if (data.success && data.categories) setCategories(data.categories);
      } catch (err) {
        console.error("Failed to fetch categories:", err);
      } finally {
        setIsLoadingCategories(false);
      }
    }
    fetchCategories();
  }, []);

  // Fetch current user ID for ownership display
  useEffect(() => {
    async function fetchCurrentUser() {
      try {
        const response = await fetch("/api/auth/session");
        const data = await response.json();
        if (data.authenticated && data.user?.id) {
          setCurrentUserId(data.user.id);
        }
      } catch (err) {
        console.error("Failed to fetch current user:", err);
      }
    }
    fetchCurrentUser();
  }, []);

  const performSearch = useCallback(async (query: string, currentFilters: FilterState, page: number = 1) => {
    setIsLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (currentFilters.category) params.set("category", currentFilters.category);
      if (currentFilters.sortBy !== "relevance") params.set("sortBy", currentFilters.sortBy);
      if (currentFilters.tags.length > 0) params.set("tags", currentFilters.tags.join(","));
      params.set("page", page.toString());

      const response = await fetch(`/api/search?${params.toString()}`);
      const data: SearchResponse = await response.json();

      if (data.success && data.templates) {
        setTemplates(data.templates.map((b) => ({
          id: b.id,
          title: b.title,
          description: b.description,
          visibility: b.visibility,
          category: b.category,
          tags: b.tags,
          instanceCount: b.instanceCount,
          stepCount: b.stepCount,
          rating: b.rating,
          createdAt: b.createdAt,
          updatedAt: b.updatedAt,
          ownerId: b.ownerId,
          ownerName: b.ownerName,
        })));
        if (data.pagination) setPagination(data.pagination);
      } else {
        setError(data.error?.message || "Search failed");
        setTemplates([]);
      }
    } catch (err) {
      console.error("Search error:", err);
      setError("An error occurred while searching");
      setTemplates([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateUrl = useCallback((query: string, currentFilters: FilterState) => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (currentFilters.category) params.set("category", currentFilters.category);
    if (currentFilters.sortBy !== "relevance") params.set("sortBy", currentFilters.sortBy);
    if (currentFilters.tags.length > 0) params.set("tags", currentFilters.tags.join(","));
    const newUrl = params.toString() ? `?${params.toString()}` : "/discover";
    router.push(newUrl, { scroll: false });
  }, [router]);

  const handleSearch = useCallback((query: string) => {
    updateUrl(query, filters);
    performSearch(query, filters);
  }, [filters, updateUrl, performSearch]);

  const handleSuggestionSelect = useCallback((suggestion: SearchSuggestion) => {
    if (suggestion.type === "category") {
      const newFilters = { ...filters, category: suggestion.value };
      setFilters(newFilters);
      updateUrl(searchQuery, newFilters);
      performSearch(searchQuery, newFilters);
    } else if (suggestion.type === "tag") {
      const newFilters = {
        ...filters,
        tags: filters.tags.includes(suggestion.value) ? filters.tags : [...filters.tags, suggestion.value],
      };
      setFilters(newFilters);
      updateUrl(searchQuery, newFilters);
      performSearch(searchQuery, newFilters);
    } else {
      setSearchQuery(suggestion.value);
      updateUrl(suggestion.value, filters);
      performSearch(suggestion.value, filters);
    }
  }, [filters, searchQuery, updateUrl, performSearch]);

  const handleFiltersChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
    updateUrl(searchQuery, newFilters);
    performSearch(searchQuery, newFilters);
  }, [searchQuery, updateUrl, performSearch]);

  const handlePageChange = useCallback((page: number) => {
    performSearch(searchQuery, filters, page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [searchQuery, filters, performSearch]);

  useEffect(() => {
    performSearch(searchQuery, filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full space-y-8">
      <PageHeader
        title="Discover"
        description="Browse and search public checklist templates."
        icon={<Compass className="h-6 w-6" />}
        gradient
      />

      {/* Search Input with Sort and Filter Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <div className="flex-1">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            onSearch={handleSearch}
            suggestions={suggestions}
            onSuggestionSelect={handleSuggestionSelect}
            isLoading={isLoading}
            placeholder="Search templates by title, description, or tags..."
          />
        </div>
        <div className="flex gap-2">
          {/* Sort Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="sm:w-auto justify-between sm:justify-center gap-2 rounded-xl h-14 px-4 border-2"
              >
                <ArrowUpDown className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {SORT_OPTIONS.find(o => o.value === filters.sortBy)?.label || "Sort"}
                </span>
                <span className="sm:hidden">Sort</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {SORT_OPTIONS.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => {
                    const newFilters = { ...filters, sortBy: option.value };
                    setFilters(newFilters);
                    updateUrl(searchQuery, newFilters);
                    performSearch(searchQuery, newFilters);
                  }}
                  className="flex items-center justify-between"
                >
                  <span>{option.label}</span>
                  {filters.sortBy === option.value && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Filter Button */}
          <Button
            variant="outline"
            onClick={() => setShowMobileFilters(true)}
            className="sm:w-auto justify-between sm:justify-center gap-2 rounded-xl h-14 px-4 border-2"
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
            {(filters.category || filters.tags.length > 0) && (
              <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                {(filters.category ? 1 : 0) + filters.tags.length}
              </span>
            )}
          </Button>
        </div>
      </motion.div>

      {/* Filter Dialog */}
      <FilterDialog
        filters={filters}
        onFiltersChange={handleFiltersChange}
        categories={categories}
        popularTags={POPULAR_TAGS}
        isLoading={isLoading || isLoadingCategories}
        isOpen={showMobileFilters}
        onOpenChange={setShowMobileFilters}
      />

      {/* Results */}
      <div className="w-full">
          {isLoading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {error && !isLoading && (
            <EmptyState
              icon={<X className="h-8 w-8" />}
              title="Search failed"
              description={error}
              action={{ label: "Try Again", href: "#", icon: <Search className="h-4 w-4" /> }}
            />
          )}

          {!isLoading && !error && templates.length === 0 && (
            <EmptyState
              icon={<Search className="h-8 w-8" />}
              title={hasSearched ? "No templates found" : "Search for templates"}
              description={hasSearched 
                ? "Try adjusting your search terms or filters to find what you're looking for."
                : "Enter a search term or browse by category to find useful checklists created by others."}
            />
          )}

          {!isLoading && !error && templates.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-6">
                <p className="text-base font-medium text-muted-foreground">
                  {selection.isSelectionMode
                    ? `${selection.selectedIds.size} of ${templates.length} selected`
                    : `${pagination.totalItems} template${pagination.totalItems !== 1 ? "s" : ""} found`
                  }
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-xs h-8"
                  onClick={() => selection.isSelectionMode ? selection.exitSelectionMode() : selection.enterSelectionMode()}
                  aria-pressed={selection.isSelectionMode}
                >
                  {selection.isSelectionMode ? "Cancel" : "Select"}
                </Button>
              </div>

              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              >
                <AnimatePresence>
                  {templates.map((template, index) => (
                    <motion.div
                      key={template.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <TemplateCard
                        template={template}
                        linkPrefix="/discover"
                        currentUserId={currentUserId}
                        contextMenuItems={contextMenuItems}
                        isSelectionMode={selection.isSelectionMode}
                        isSelected={selection.isSelected(template.id)}
                        onSelectionClick={(id, e) => selection.handleClick(id, e)}
                        onSelect={(id) => selection.toggleItem(id)}
                        onEnterSelectionMode={(id) => selection.enterSelectionMode(id)}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>

              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <Button
                    variant="outline"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="rounded-xl"
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground px-4">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="rounded-xl"
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
      </div>

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selection.selectedIds.size}
        actions={bulkActionFactory(selection.selectedIds)}
        onSelectAll={() => selection.selectAll()}
        onDeselectAll={() => selection.deselectAll()}
        onCancel={() => selection.exitSelectionMode()}
        isAllSelected={selection.selectedIds.size === templates.length && templates.length > 0}
      />
    </div>
  );
}

function DiscoverPageLoading() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Discover"
        description="Browse and search public checklist templates."
        icon={<Compass className="h-6 w-6" />}
        gradient
      />
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    </div>
  );
}

export default function DiscoverPage() {
  return (
    <Suspense fallback={<DiscoverPageLoading />}>
      <DiscoverPageContent />
    </Suspense>
  );
}
