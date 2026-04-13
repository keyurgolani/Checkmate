/**
 * Search API Routes
 * 
 * GET /api/search - Search public blueprints
 * 
 * Requirements: 8.1, 8.2, 8.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { SearchService, SearchErrorCodes } from '@/lib/services/search';
import { ItemService } from '@/lib/services/item';
import { createAdminClient } from '@/lib/pocketbase';
import type { SearchFilters } from '@/lib/services/search';

// ============================================================================
// Types
// ============================================================================

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
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    timestamp: string;
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function getStatusCodeForError(errorCode: string | undefined): number {
  switch (errorCode) {
    case SearchErrorCodes.INVALID_QUERY:
    case SearchErrorCodes.INVALID_FILTER:
      return 400;
    case SearchErrorCodes.SEARCH_FAILED:
      return 500;
    default:
      return 500;
  }
}

/**
 * Calculates rating from ratingSum and ratingCount
 * Returns null if no ratings exist
 */
function calculateRating(ratingSum: number, ratingCount: number): number | null {
  if (ratingCount === 0) return null;
  return Math.round((ratingSum / ratingCount) * 10) / 10; // Round to 1 decimal
}

function formatBlueprint(
  blueprint: {
    id: string;
    workspace: string;
    owner: string;
    title: string;
    description: string | null;
    visibility: string;
    category: string | null;
    tags: string[] | null;
    version: number;
    instanceCount: number;
    ratingSum: number;
    ratingCount: number;
    created: string;
    updated: string;
    expand?: {
      owner?: {
        displayName: string | null;
        email: string;
      };
    };
  },
  stepCount: number
) {
  // Get owner name from expanded relation, fallback to email prefix
  const ownerData = blueprint.expand?.owner;
  const ownerName = ownerData?.displayName || ownerData?.email?.split('@')[0] || null;

  return {
    id: blueprint.id,
    workspaceId: blueprint.workspace,
    ownerId: blueprint.owner,
    ownerName,
    title: blueprint.title,
    description: blueprint.description,
    visibility: blueprint.visibility,
    category: blueprint.category,
    tags: blueprint.tags,
    version: blueprint.version,
    instanceCount: blueprint.instanceCount,
    stepCount,
    rating: calculateRating(blueprint.ratingSum, blueprint.ratingCount),
    createdAt: blueprint.created,
    updatedAt: blueprint.updated,
  };
}

// ============================================================================
// GET /api/search
// ============================================================================

/**
 * Search public blueprints
 * 
 * Query parameters:
 * - q: Search query (searches title, description, tags)
 * - category: Filter by category
 * - tags: Filter by tags (comma-separated)
 * - creatorId: Filter by creator
 * - sortBy: Sort order ('relevance', 'popularity', 'rating', 'date')
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * 
 * Requirements: 8.1, 8.2, 8.3
 */
export async function GET(request: NextRequest): Promise<NextResponse<SearchResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const query = searchParams.get('q') ?? undefined;
    const category = searchParams.get('category') ?? undefined;
    const tagsParam = searchParams.get('tags');
    const creatorId = searchParams.get('creatorId') ?? undefined;
    const sortBy = searchParams.get('sortBy') as SearchFilters['sortBy'] | null;
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');

    // Parse tags
    const tags = tagsParam ? tagsParam.split(',').map(t => t.trim()).filter(Boolean) : undefined;

    // Parse pagination
    const page = pageParam ? parseInt(pageParam, 10) : undefined;
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;

    // Validate pagination params
    if (pageParam && (isNaN(page!) || page! < 1)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: SearchErrorCodes.INVALID_FILTER,
            message: 'Invalid page parameter. Must be a positive integer.',
            details: { field: 'page', value: pageParam },
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 }
      );
    }

    if (limitParam && (isNaN(limit!) || limit! < 1)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: SearchErrorCodes.INVALID_FILTER,
            message: 'Invalid limit parameter. Must be a positive integer.',
            details: { field: 'limit', value: limitParam },
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 }
      );
    }

    // Build search filters
    const filters: SearchFilters = {
      query,
      category,
      tags,
      creatorId,
      sortBy: sortBy ?? undefined,
      page,
      limit,
    };

    // Create search service and execute search
    const searchService = new SearchService();
    const result = await searchService.searchBlueprints(filters);

    if (!result.success) {
      const statusCode = getStatusCodeForError(result.error.code);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: result.error.code,
            message: result.error.message,
            details: result.error.details,
            timestamp: new Date().toISOString(),
          },
        },
        { status: statusCode }
      );
    }

    // Fetch step counts for all templates in parallel
    // Requirements: 8.3 - Show step count in search results
    // Use admin client because items collection RLS requires authentication,
    // but this is a public search endpoint accessible to anonymous users.
    const adminPb = await createAdminClient();
    const itemService = new ItemService(adminPb);
    const stepCounts = await Promise.all(
      result.data.items.map(async (blueprint) => {
        try {
          return await itemService.getItemCount(blueprint.id);
        } catch {
          return 0;
        }
      })
    );

    // Format templates with step counts
    const formattedTemplates = result.data.items.map((blueprint, index) =>
      formatBlueprint(blueprint as any, stepCounts[index] ?? 0)
    );

    return NextResponse.json({
      success: true,
      templates: formattedTemplates,
      pagination: {
        page: result.data.page,
        perPage: result.data.perPage,
        totalItems: result.data.totalItems,
        totalPages: result.data.totalPages,
      },
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: SearchErrorCodes.UNKNOWN_ERROR,
          message: 'An unexpected error occurred',
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}
