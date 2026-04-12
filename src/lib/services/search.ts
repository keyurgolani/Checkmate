/**
 * Search Service
 * 
 * Provides search functionality for discovering public blueprints.
 * Uses PocketBase filter syntax for search across titles, descriptions, and tags.
 * Supports filtering by category and sorting by popularity, rating, and date.
 * 
 * Requirements: 8.1, 8.2
 */

import PocketBase, { ClientResponseError } from 'pocketbase';
import { getPocketBaseClient } from '../pocketbase';
import { makeServiceAccessor } from './_service-factory';
import type { Blueprint } from '../pocketbase-types';
import { Collections, Visibility } from '../pocketbase-types';

// ============================================================================
// Types
// ============================================================================

/**
 * Search filters for querying blueprints
 */
export interface SearchFilters {
  query?: string;
  category?: string;
  tags?: string[];
  creatorId?: string;
  sortBy?: 'relevance' | 'popularity' | 'rating' | 'date';
  page?: number;
  limit?: number;
}

/**
 * Category with metadata
 * Requirements: 8.4
 */
export interface Category {
  name: string;
  templateCount: number;
}

/**
 * Result for category operations
 */
export interface CategoryOperationResult {
  success: boolean;
  categories: Category[] | null;
  error: SearchError | null;
}

/**
 * Paginated search result
 */
export interface SearchResult<T> {
  items: T[];
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
}

/**
 * Search error with code and message
 */
export interface SearchError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Search operation result
 */
export interface SearchOperationResult {
  success: boolean;
  result: SearchResult<Blueprint> | null;
  error: SearchError | null;
}

// ============================================================================
// Error Codes
// ============================================================================

export const SearchErrorCodes = {
  INVALID_QUERY: 'SEARCH_001',
  INVALID_FILTER: 'SEARCH_002',
  SEARCH_FAILED: 'SEARCH_003',
  UNKNOWN_ERROR: 'SEARCH_999',
} as const;

// ============================================================================
// Constants
// ============================================================================

/**
 * Default page size for search results
 */
export const DEFAULT_SEARCH_PAGE_SIZE = 20;

/**
 * Maximum page size for search results
 */
export const MAX_SEARCH_PAGE_SIZE = 100;

/**
 * Minimum query length for search
 */
export const MIN_QUERY_LENGTH = 1;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Escapes special characters in search query for PocketBase filter syntax
 */
function escapeSearchQuery(query: string): string {
  // Escape double quotes and backslashes for PocketBase filter syntax
  return query.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Builds sort string for PocketBase queries
 */
function buildSortString(sortBy?: SearchFilters['sortBy']): string {
  switch (sortBy) {
    case 'popularity':
      return '-instanceCount,-created';
    case 'rating':
      return '-ratingSum,-created';
    case 'date':
      return '-created';
    case 'relevance':
    default:
      // For relevance, we sort by instance count as a proxy for relevance
      // since PocketBase doesn't have built-in full-text search ranking
      return '-instanceCount,-created';
  }
}

/**
 * Builds filter string for PocketBase search queries
 * 
 * Requirements: 8.1, 8.2
 */
function buildSearchFilter(filters: SearchFilters): string {
  const conditions: string[] = [];

  // Always filter for public visibility
  conditions.push(`visibility = "${Visibility.PUBLIC}"`);

  // Search query - search across title, description, and tags
  if (filters.query && filters.query.trim().length >= MIN_QUERY_LENGTH) {
    const escapedQuery = escapeSearchQuery(filters.query.trim());
    
    // Search in title, description, and tags
    // Using ~ operator for case-insensitive contains
    const searchConditions = [
      `title ~ "${escapedQuery}"`,
      `description ~ "${escapedQuery}"`,
      `tags ~ "${escapedQuery}"`,
    ];
    
    conditions.push(`(${searchConditions.join(' || ')})`);
  }

  // Category filter
  if (filters.category && filters.category.trim()) {
    const escapedCategory = escapeSearchQuery(filters.category.trim());
    conditions.push(`category = "${escapedCategory}"`);
  }

  // Tags filter - match any of the provided tags
  if (filters.tags && filters.tags.length > 0) {
    const tagConditions = filters.tags
      .filter(tag => tag.trim())
      .map(tag => `tags ~ "${escapeSearchQuery(tag.trim())}"`);
    
    if (tagConditions.length > 0) {
      conditions.push(`(${tagConditions.join(' || ')})`);
    }
  }

  // Creator filter
  if (filters.creatorId && filters.creatorId.trim()) {
    conditions.push(`owner = "${filters.creatorId.trim()}"`);
  }

  return conditions.join(' && ');
}

/**
 * Validates search filters
 */
function validateFilters(filters: SearchFilters): SearchError | null {
  // Validate page size
  if (filters.limit !== undefined) {
    if (filters.limit < 1) {
      return {
        code: SearchErrorCodes.INVALID_FILTER,
        message: 'Page size must be at least 1',
        details: { field: 'limit', value: filters.limit },
      };
    }
    if (filters.limit > MAX_SEARCH_PAGE_SIZE) {
      return {
        code: SearchErrorCodes.INVALID_FILTER,
        message: `Page size cannot exceed ${MAX_SEARCH_PAGE_SIZE}`,
        details: { field: 'limit', value: filters.limit, max: MAX_SEARCH_PAGE_SIZE },
      };
    }
  }

  // Validate page number
  if (filters.page !== undefined && filters.page < 1) {
    return {
      code: SearchErrorCodes.INVALID_FILTER,
      message: 'Page number must be at least 1',
      details: { field: 'page', value: filters.page },
    };
  }

  return null;
}

/**
 * Parses PocketBase errors into SearchError
 */
function parseError(err: unknown): SearchError {
  if (err instanceof ClientResponseError) {
    if (err.status === 400) {
      return {
        code: SearchErrorCodes.INVALID_FILTER,
        message: 'Invalid search filter',
        details: { status: err.status, data: err.data },
      };
    }

    return {
      code: SearchErrorCodes.SEARCH_FAILED,
      message: err.message || 'Search failed',
      details: { status: err.status, data: err.data },
    };
  }

  if (err instanceof Error) {
    return {
      code: SearchErrorCodes.UNKNOWN_ERROR,
      message: err.message,
    };
  }

  return {
    code: SearchErrorCodes.UNKNOWN_ERROR,
    message: 'An unexpected error occurred',
  };
}

/**
 * Creates a successful search result
 */
function createSuccessResult(result: SearchResult<Blueprint>): SearchOperationResult {
  return {
    success: true,
    result,
    error: null,
  };
}

/**
 * Creates an error search result
 */
function createErrorResult(error: SearchError): SearchOperationResult {
  return {
    success: false,
    result: null,
    error,
  };
}

// ============================================================================
// Search Service Class
// ============================================================================

/**
 * Search Service
 * 
 * Provides methods for searching and discovering public blueprints:
 * - Full-text search across titles, descriptions, and tags
 * - Filtering by category, tags, and creator
 * - Sorting by relevance, popularity, rating, and date
 * 
 * Requirements: 8.1, 8.2
 */
export class SearchService {
  private pb: PocketBase;

  constructor(pb?: PocketBase) {
    this.pb = pb ?? getPocketBaseClient();
  }

  /**
   * Searches public blueprints with optional filters.
   * 
   * Requirements: 8.1, 8.2
   * 
   * @param filters - Search filters including query, category, tags, sortBy, pagination
   * @returns SearchOperationResult with paginated blueprints on success
   */
  async searchBlueprints(filters: SearchFilters = {}): Promise<SearchOperationResult> {
    try {
      // Validate filters
      const validationError = validateFilters(filters);
      if (validationError) {
        return createErrorResult(validationError);
      }

      const page = filters.page ?? 1;
      const perPage = Math.min(
        filters.limit ?? DEFAULT_SEARCH_PAGE_SIZE,
        MAX_SEARCH_PAGE_SIZE
      );
      const sort = buildSortString(filters.sortBy);
      const filter = buildSearchFilter(filters);

      const result = await this.pb
        .collection(Collections.TEMPLATES)
        .getList<Blueprint>(page, perPage, {
          filter,
          sort,
          expand: 'owner',
        });

      return createSuccessResult({
        items: result.items,
        page: result.page,
        perPage: result.perPage,
        totalItems: result.totalItems,
        totalPages: result.totalPages,
      });
    } catch (err) {
      return createErrorResult(parseError(err));
    }
  }

  /**
   * Gets popular public blueprints.
   * Sorted by instance count (popularity).
   * 
   * @param limit - Maximum number of results (default: 10)
   * @returns SearchOperationResult with popular blueprints
   */
  async getPopular(limit: number = 10): Promise<SearchOperationResult> {
    return this.searchBlueprints({
      sortBy: 'popularity',
      limit: Math.min(limit, MAX_SEARCH_PAGE_SIZE),
    });
  }

  /**
   * Gets recent public blueprints.
   * Sorted by creation date (newest first).
   * 
   * @param limit - Maximum number of results (default: 10)
   * @returns SearchOperationResult with recent blueprints
   */
  async getRecent(limit: number = 10): Promise<SearchOperationResult> {
    return this.searchBlueprints({
      sortBy: 'date',
      limit: Math.min(limit, MAX_SEARCH_PAGE_SIZE),
    });
  }

  /**
   * Gets top-rated public blueprints.
   * Sorted by rating sum.
   * 
   * @param limit - Maximum number of results (default: 10)
   * @returns SearchOperationResult with top-rated blueprints
   */
  async getTopRated(limit: number = 10): Promise<SearchOperationResult> {
    return this.searchBlueprints({
      sortBy: 'rating',
      limit: Math.min(limit, MAX_SEARCH_PAGE_SIZE),
    });
  }

  /**
   * Searches blueprints by a specific creator.
   * 
   * @param creatorId - User ID of the creator
   * @param filters - Additional search filters
   * @returns SearchOperationResult with creator's public blueprints
   */
  async searchByCreator(
    creatorId: string,
    filters: Omit<SearchFilters, 'creatorId'> = {}
  ): Promise<SearchOperationResult> {
    return this.searchBlueprints({
      ...filters,
      creatorId,
    });
  }

  /**
   * Searches blueprints by category.
   * 
   * Requirements: 8.4
   * 
   * @param category - Category to filter by
   * @param filters - Additional search filters
   * @returns SearchOperationResult with blueprints in the category
   */
  async searchByCategory(
    category: string,
    filters: Omit<SearchFilters, 'category'> = {}
  ): Promise<SearchOperationResult> {
    return this.searchBlueprints({
      ...filters,
      category,
    });
  }

  /**
   * Searches blueprints by tags.
   * Returns blueprints that match any of the provided tags.
   * 
   * @param tags - Tags to filter by
   * @param filters - Additional search filters
   * @returns SearchOperationResult with blueprints matching the tags
   */
  async searchByTags(
    tags: string[],
    filters: Omit<SearchFilters, 'tags'> = {}
  ): Promise<SearchOperationResult> {
    return this.searchBlueprints({
      ...filters,
      tags,
    });
  }

  /**
   * Gets all unique categories from public blueprints.
   * Returns categories sorted by blueprint count (most popular first).
   * 
   * Requirements: 8.4
   * 
   * @returns CategoryOperationResult with list of categories and their counts
   */
  async getCategories(): Promise<CategoryOperationResult> {
    try {
      // Fetch all public blueprints with categories
      // We need to get all records to count categories accurately
      const result = await this.pb
        .collection(Collections.TEMPLATES)
        .getFullList<Blueprint>({
          filter: `visibility = "${Visibility.PUBLIC}" && category != null && category != ""`,
          fields: 'category',
        });

      // Count blueprints per category
      const categoryMap = new Map<string, number>();
      for (const blueprint of result) {
        if (blueprint.category) {
          const count = categoryMap.get(blueprint.category) || 0;
          categoryMap.set(blueprint.category, count + 1);
        }
      }

      // Convert to array and sort by count (descending)
      const categories: Category[] = Array.from(categoryMap.entries())
        .map(([name, templateCount]) => ({ name, templateCount }))
        .sort((a, b) => b.templateCount - a.templateCount);

      return {
        success: true,
        categories,
        error: null,
      };
    } catch (err) {
      return {
        success: false,
        categories: null,
        error: parseError(err),
      };
    }
  }

  /**
   * Browses blueprints by category.
   * Returns all public blueprints in the specified category.
   * 
   * Requirements: 8.4
   * 
   * @param category - Category to browse
   * @param filters - Additional search filters (pagination, sorting)
   * @returns SearchOperationResult with blueprints in the category
   */
  async browseByCategory(
    category: string,
    filters: Omit<SearchFilters, 'category' | 'query'> = {}
  ): Promise<SearchOperationResult> {
    if (!category || !category.trim()) {
      return createErrorResult({
        code: SearchErrorCodes.INVALID_FILTER,
        message: 'Category is required for browsing',
        details: { field: 'category' },
      });
    }

    return this.searchBlueprints({
      ...filters,
      category: category.trim(),
    });
  }

  /**
   * Gets the underlying PocketBase client.
   * Useful for advanced operations.
   */
  getPocketBase(): PocketBase {
    return this.pb;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

const _search = makeServiceAccessor(SearchService);
export const createSearchService = _search.create;
export const getSearchService = _search.get;
