/**
 * Templates API Routes
 * 
 * GET /api/templates - List templates (user's own or public)
 * POST /api/templates - Create a new template
 * 
 * Requirements: 3.1, 4.1, 4.2
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/server-auth';
import { TemplateService, TemplateErrorCodes } from '@/lib/services/template';
import type { Visibility } from '@/lib/pocketbase-types';

// ============================================================================
// Types
// ============================================================================

interface CreateTemplateRequestBody {
  workspaceId: string;
  title: string;
  description?: string;
  category?: string;
  tags?: string[];
  visibility?: Visibility;
  questions?: Array<{
    id: string;
    question: string;
    answerType: 'boolean' | 'enum';
    enumOptions?: string[];
    defaultValue?: boolean | string;
  }>;
  resources?: Array<{
    title: string;
    url: string;
    description?: string;
  }>;
}

interface TemplateResponse {
  success: boolean;
  template?: {
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
    createdAt: string;
    updatedAt: string;
  };
  templates?: Array<{
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
    case TemplateErrorCodes.TITLE_REQUIRED:
    case TemplateErrorCodes.TITLE_TOO_LONG:
    case TemplateErrorCodes.INVALID_VISIBILITY:
    case TemplateErrorCodes.VALIDATION_ERROR:
    case TemplateErrorCodes.SHARED_REQUIRES_COLLABORATORS:
      return 400;
    case TemplateErrorCodes.PERMISSION_DENIED:
      return 403;
    case TemplateErrorCodes.NOT_FOUND:
    case TemplateErrorCodes.WORKSPACE_NOT_FOUND:
      return 404;
    default:
      return 500;
  }
}

function formatTemplate(template: {
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
  created: string;
  updated: string;
}) {
  return {
    id: template.id,
    workspaceId: template.workspace,
    ownerId: template.owner,
    title: template.title,
    description: template.description,
    visibility: template.visibility,
    category: template.category,
    tags: template.tags,
    version: template.version,
    instanceCount: template.instanceCount,
    createdAt: template.created,
    updatedAt: template.updated,
  };
}

// ============================================================================
// GET /api/templates
// ============================================================================

/**
 * List templates
 * 
 * Query parameters:
 * - workspaceId: Filter by workspace (requires auth)
 * - visibility: Filter by visibility ('public' for public templates)
 * - category: Filter by category
 * - tags: Filter by tags (comma-separated)
 * - sortBy: Sort order ('date', 'popularity', 'rating')
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 30)
 */
export async function GET(request: NextRequest): Promise<NextResponse<TemplateResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');
    const visibility = searchParams.get('visibility');
    const category = searchParams.get('category');
    const tagsParam = searchParams.get('tags');
    const sortBy = searchParams.get('sortBy') as 'date' | 'popularity' | 'rating' | null;
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const limit = parseInt(searchParams.get('limit') ?? '30', 10);

    const tags = tagsParam ? tagsParam.split(',').map(t => t.trim()) : undefined;

    // Get auth context
    const { isAuthenticated, pb } = await getServerAuth();

    // Create service with authenticated PocketBase client
    const templateService = new TemplateService(pb);

    // If requesting public templates, no auth required
    if (visibility === 'public') {
      const result = await templateService.getPublic({
        category: category ?? undefined,
        tags,
        sortBy: sortBy ?? undefined,
        page,
        limit,
      });

      return NextResponse.json({
        success: true,
        templates: result.items.map((item) => formatTemplate(item as any)),
        pagination: {
          page: result.page,
          perPage: result.perPage,
          totalItems: result.totalItems,
          totalPages: result.totalPages,
        },
      });
    }

    // For workspace-specific or user's templates, require auth
    if (!isAuthenticated) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: TemplateErrorCodes.PERMISSION_DENIED,
            message: 'Authentication required to list templates',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 401 }
      );
    }

    // If workspaceId provided, get templates for that workspace
    if (workspaceId) {
      const result = await templateService.getByWorkspace(workspaceId, {
        page,
        limit,
        sortBy: sortBy ?? undefined,
      });

      return NextResponse.json({
        success: true,
        templates: result.items.map((item) => formatTemplate(item as any)),
        pagination: {
          page: result.page,
          perPage: result.perPage,
          totalItems: result.totalItems,
          totalPages: result.totalPages,
        },
      });
    }

    // Otherwise, get user's own templates
    const result = await templateService.getByOwner({
      page,
      limit,
      sortBy: sortBy ?? undefined,
    });

    return NextResponse.json({
      success: true,
      templates: result.items.map((item) => formatTemplate(item as any)),
      pagination: {
        page: result.page,
        perPage: result.perPage,
        totalItems: result.totalItems,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    console.error('List templates error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: TemplateErrorCodes.UNKNOWN_ERROR,
          message: 'An unexpected error occurred',
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /api/templates
// ============================================================================

/**
 * Create a new template
 * 
 * Requirements: 3.1 - Sets current user as owner, defaults visibility to private
 */
export async function POST(request: NextRequest): Promise<NextResponse<TemplateResponse>> {
  try {
    // Require authentication
    const { isAuthenticated, pb } = await getServerAuth();

    if (!isAuthenticated) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: TemplateErrorCodes.PERMISSION_DENIED,
            message: 'Authentication required to create templates',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json() as CreateTemplateRequestBody;

    // Validate required fields
    if (!body.workspaceId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: TemplateErrorCodes.VALIDATION_ERROR,
            message: 'workspaceId is required',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 }
      );
    }

    if (!body.title) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: TemplateErrorCodes.TITLE_REQUIRED,
            message: 'title is required',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 }
      );
    }

    // Create template service with authenticated client
    const templateService = new TemplateService(pb);

    const result = await templateService.create({
      workspaceId: body.workspaceId,
      title: body.title,
      description: body.description,
      category: body.category,
      tags: body.tags,
      visibility: body.visibility,
      questions: body.questions,
      resources: body.resources,
    });

    if (!result.success || !result.data) {
      const statusCode = getStatusCodeForError(result.error?.code);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: result.error?.code ?? TemplateErrorCodes.UNKNOWN_ERROR,
            message: result.error?.message ?? 'Failed to create template',
            details: result.error?.details,
            timestamp: new Date().toISOString(),
          },
        },
        { status: statusCode }
      );
    }

    return NextResponse.json(
      {
        success: true,
        template: formatTemplate(result.data as any),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create template error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: TemplateErrorCodes.UNKNOWN_ERROR,
          message: 'An unexpected error occurred',
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}
