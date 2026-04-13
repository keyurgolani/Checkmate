/**
 * Categories API Routes
 * 
 * GET /api/categories - Get all categories with template counts
 * 
 * Requirements: 8.4
 */

import { NextResponse } from 'next/server';
import { SearchService, SearchErrorCodes } from '@/lib/services/search';

// ============================================================================
// Types
// ============================================================================

interface CategoriesResponse {
  success: boolean;
  categories?: Array<{
    name: string;
    templateCount: number;
  }>;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    timestamp: string;
  };
}

// ============================================================================
// GET /api/categories
// ============================================================================

/**
 * Get all categories with template counts
 * 
 * Returns categories sorted by template count (most popular first).
 * Only includes categories from public templates.
 * 
 * Requirements: 8.4
 */
export async function GET(): Promise<NextResponse<CategoriesResponse>> {
  try {
    // Create search service and get categories
    const searchService = new SearchService();
    const result = await searchService.getCategories();

    if (!result.success) {
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
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      categories: result.data,
    });
  } catch (error) {
    console.error('Get categories error:', error);
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
