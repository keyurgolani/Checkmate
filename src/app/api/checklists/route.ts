/**
 * Checklists API Routes
 * 
 * GET /api/checklists - List user's checklists
 * POST /api/checklists - Create a new checklist from a template
 * 
 * Requirements: 5.1, 5.2
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/server-auth';
import { ChecklistService, ChecklistErrorCodes } from '@/lib/services/checklist';

// ============================================================================
// Types
// ============================================================================

interface CreateChecklistRequestBody {
  templateId: string;
  name: string;
  /** Answers to conditional questions for filtering items */
  conditionAnswers?: Record<string, boolean | string | undefined>;
}

interface ChecklistResponse {
  success: boolean;
  checklist?: {
    id: string;
    templateId: string;
    userId: string;
    name: string;
    isSynced: boolean;
    progress: number;
    completedAt: string | null;
    createdAt: string;
    updatedAt: string;
  };
  checklists?: Array<{
    id: string;
    templateId: string;
    userId: string;
    name: string;
    isSynced: boolean;
    progress: number;
    completedAt: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  checklistItems?: Array<{
    id: string;
    checklistId: string;
    sourceItemId: string | null;
    parentId: string | null;
    path: string;
    content: string;
    isCompleted: boolean;
    completedAt: string | null;
    isCustom: boolean;
    position: number;
    createdAt: string;
    updatedAt: string;
  }>;
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
    case ChecklistErrorCodes.NAME_REQUIRED:
    case ChecklistErrorCodes.VALIDATION_ERROR:
      return 400;
    case ChecklistErrorCodes.PERMISSION_DENIED:
      return 403;
    case ChecklistErrorCodes.NOT_FOUND:
    case ChecklistErrorCodes.TEMPLATE_NOT_FOUND:
    case ChecklistErrorCodes.ITEM_NOT_FOUND:
      return 404;
    default:
      return 500;
  }
}

function formatChecklist(checklist: {
  id: string;
  blueprint: string;
  user: string;
  name: string;
  isSynced: boolean;
  progress: number;
  completedAt: string | null;
  created: string;
  updated: string;
}) {
  return {
    id: checklist.id,
    templateId: checklist.blueprint,
    userId: checklist.user,
    name: checklist.name,
    isSynced: checklist.isSynced,
    progress: checklist.progress,
    completedAt: checklist.completedAt,
    createdAt: checklist.created,
    updatedAt: checklist.updated,
  };
}

function formatChecklistItem(item: {
  id: string;
  instance: string;
  sourceItem: string | null;
  parent: string | null;
  path: string;
  content: string;
  isCompleted: boolean;
  completedAt: string | null;
  isCustom: boolean;
  position: number;
  created: string;
  updated: string;
}) {
  return {
    id: item.id,
    checklistId: item.instance,
    sourceItemId: item.sourceItem,
    parentId: item.parent,
    path: item.path,
    content: item.content,
    isCompleted: item.isCompleted,
    completedAt: item.completedAt,
    isCustom: item.isCustom,
    position: item.position,
    createdAt: item.created,
    updatedAt: item.updated,
  };
}

// ============================================================================
// GET /api/checklists
// ============================================================================

/**
 * List user's checklists
 * 
 * Query parameters:
 * - templateId: Filter by template (optional)
 * - expand: Relations to expand (e.g., 'blueprint')
 * - sort: Sort order (default: '-created')
 */
export async function GET(request: NextRequest): Promise<NextResponse<ChecklistResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('templateId');
    const expand = searchParams.get('expand');
    const sort = searchParams.get('sort') ?? '-created';

    // Require authentication
    const { isAuthenticated, pb } = await getServerAuth();

    if (!isAuthenticated) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ChecklistErrorCodes.PERMISSION_DENIED,
            message: 'Authentication required to list checklists',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 401 }
      );
    }

    // Create service with authenticated PocketBase client
    const checklistService = new ChecklistService(pb);

    // Get user's checklists
    const checklists = await checklistService.getByUser({
      expand: expand ?? undefined,
      sort,
    });

    // Filter by templateId if provided
    const filteredChecklists = templateId
      ? checklists.filter(c => c.blueprint === templateId)
      : checklists;

    return NextResponse.json({
      success: true,
      checklists: filteredChecklists.map((item) => formatChecklist(item as any)),
    });
  } catch (error) {
    console.error('List checklists error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: ChecklistErrorCodes.UNKNOWN_ERROR,
          message: 'An unexpected error occurred',
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /api/checklists
// ============================================================================

/**
 * Create a new checklist from a template
 * 
 * Requirements: 5.1, 5.2
 * - Copies all items from template including nested references
 * - Maintains reference to source template
 * - Allows naming with custom context
 */
export async function POST(request: NextRequest): Promise<NextResponse<ChecklistResponse>> {
  try {
    // Require authentication
    const { isAuthenticated, pb } = await getServerAuth();

    if (!isAuthenticated) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ChecklistErrorCodes.PERMISSION_DENIED,
            message: 'Authentication required to create checklists',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json() as CreateChecklistRequestBody;

    // Validate required fields
    if (!body.templateId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ChecklistErrorCodes.VALIDATION_ERROR,
            message: 'templateId is required',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 }
      );
    }

    if (!body.name) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ChecklistErrorCodes.NAME_REQUIRED,
            message: 'name is required',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 }
      );
    }

    // Create checklist service with authenticated client
    const checklistService = new ChecklistService(pb);

    const result = await checklistService.create({
      templateId: body.templateId,
      name: body.name,
      conditionAnswers: body.conditionAnswers,
    });

    if (!result.success || !result.checklist) {
      const statusCode = getStatusCodeForError(result.error?.code);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: result.error?.code ?? ChecklistErrorCodes.UNKNOWN_ERROR,
            message: result.error?.message ?? 'Failed to create checklist',
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
        checklist: formatChecklist(result.checklist as any),
        tasks: result.tasks.map((item) => formatChecklistItem(item as any)),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create checklist error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: ChecklistErrorCodes.UNKNOWN_ERROR,
          message: 'An unexpected error occurred',
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}
