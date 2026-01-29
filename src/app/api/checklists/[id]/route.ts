/**
 * Checklist by ID API Routes
 * 
 * GET /api/checklists/[id] - Get a specific checklist
 * PUT /api/checklists/[id] - Update a checklist
 * DELETE /api/checklists/[id] - Delete a checklist
 * 
 * Requirements: 5.1, 5.3, 5.6
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/server-auth';
import { ChecklistService, ChecklistErrorCodes } from '@/lib/services/checklist';
import type { ResourceLink } from '@/lib/pocketbase-types';

// ============================================================================
// Types
// ============================================================================

interface UpdateChecklistRequestBody {
  name?: string;
  description?: string;
  resources?: ResourceLink[];
}

interface ChecklistResponse {
  success: boolean;
  checklist?: {
    id: string;
    blueprintId: string;
    userId: string;
    name: string;
    isSynced: boolean;
    progress: number;
    completedAt: string | null;
    description: string | null;
    resources: ResourceLink[] | null;
    createdAt: string;
    updatedAt: string;
  };
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

interface RouteContext {
  params: Promise<{ id: string }>;
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
  description: string | null;
  resources: ResourceLink[] | null;
  created: string;
  updated: string;
}) {
  return {
    id: checklist.id,
    blueprintId: checklist.blueprint,
    userId: checklist.user,
    name: checklist.name,
    isSynced: checklist.isSynced,
    progress: checklist.progress,
    completedAt: checklist.completedAt,
    description: checklist.description,
    resources: checklist.resources,
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
// GET /api/checklists/[id]
// ============================================================================

/**
 * Get a specific checklist by ID
 * 
 * Query parameters:
 * - expand: Relations to expand (e.g., 'blueprint')
 * - includeItems: Include checklist items (default: false)
 * 
 * Access rules:
 * - Only the checklist owner can access their checklists
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse<ChecklistResponse>> {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const expand = searchParams.get('expand');
    const includeItems = searchParams.get('includeItems') === 'true';

    // Require authentication
    const { isAuthenticated, user, pb } = await getServerAuth();

    if (!isAuthenticated || !user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ChecklistErrorCodes.PERMISSION_DENIED,
            message: 'Authentication required',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 401 }
      );
    }

    // Create service with authenticated PocketBase client
    const checklistService = new ChecklistService(pb);

    // Get the checklist
    const result = await checklistService.getById(id, expand ?? undefined);

    if (!result.success || !result.checklist) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ChecklistErrorCodes.NOT_FOUND,
            message: 'Checklist not found',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 404 }
      );
    }

    const checklist = result.checklist;

    // Check if user owns this checklist
    if (checklist.user !== user.id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ChecklistErrorCodes.NOT_FOUND,
            message: 'Checklist not found',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 404 }
      );
    }

    // Optionally include tasks
    let checklistTasks;
    if (includeItems) {
      const tasks = await checklistService.getTasks(id, {
        sort: 'path,position',
      });
      checklistTasks = tasks.map((task) => formatChecklistItem(task as any));
    }

    return NextResponse.json({
      success: true,
      checklist: formatChecklist(checklist as any),
      ...(checklistTasks && { checklistItems: checklistTasks }),
    });
  } catch (error) {
    console.error('Get checklist error:', error);
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
// PUT /api/checklists/[id]
// ============================================================================

/**
 * Update a checklist
 * 
 * Requirements: 5.6 - Track last modified date
 * 
 * Access rules:
 * - Only the checklist owner can update their checklists
 */
export async function PUT(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse<ChecklistResponse>> {
  try {
    const { id } = await context.params;

    // Require authentication
    const { isAuthenticated, user, pb } = await getServerAuth();

    if (!isAuthenticated || !user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ChecklistErrorCodes.PERMISSION_DENIED,
            message: 'Authentication required',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json() as UpdateChecklistRequestBody;

    // Create service
    const checklistService = new ChecklistService(pb);

    // Get the checklist to check ownership
    const getResult = await checklistService.getById(id);

    if (!getResult.success || !getResult.checklist) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ChecklistErrorCodes.NOT_FOUND,
            message: 'Checklist not found',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 404 }
      );
    }

    // Check if user owns this checklist
    if (getResult.checklist.user !== user.id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ChecklistErrorCodes.PERMISSION_DENIED,
            message: 'You do not have permission to update this checklist',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 403 }
      );
    }

    // Validate name if provided
    if (body.name !== undefined && body.name.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ChecklistErrorCodes.NAME_REQUIRED,
            message: 'Checklist name cannot be empty',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 }
      );
    }

    // Update the checklist
    const result = await checklistService.update(id, {
      name: body.name?.trim(),
      description: body.description,
      resources: body.resources,
    });

    if (!result.success || !result.checklist) {
      const statusCode = getStatusCodeForError(result.error?.code);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: result.error?.code ?? ChecklistErrorCodes.UNKNOWN_ERROR,
            message: result.error?.message ?? 'Failed to update checklist',
            details: result.error?.details,
            timestamp: new Date().toISOString(),
          },
        },
        { status: statusCode }
      );
    }

    return NextResponse.json({
      success: true,
      checklist: formatChecklist(result.checklist as any),
    });
  } catch (error) {
    console.error('Update checklist error:', error);
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
// DELETE /api/checklists/[id]
// ============================================================================

/**
 * Delete a checklist
 * 
 * Access rules:
 * - Only the checklist owner can delete their checklists
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse<{ success: boolean; error?: { code: string; message: string; timestamp: string } }>> {
  try {
    const { id } = await context.params;

    // Require authentication
    const { isAuthenticated, user, pb } = await getServerAuth();

    if (!isAuthenticated || !user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ChecklistErrorCodes.PERMISSION_DENIED,
            message: 'Authentication required',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 401 }
      );
    }

    // Create service
    const checklistService = new ChecklistService(pb);

    // Get the checklist to check ownership
    const getResult = await checklistService.getById(id);

    if (!getResult.success || !getResult.checklist) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ChecklistErrorCodes.NOT_FOUND,
            message: 'Checklist not found',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 404 }
      );
    }

    // Check if user owns this checklist
    if (getResult.checklist.user !== user.id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ChecklistErrorCodes.PERMISSION_DENIED,
            message: 'You do not have permission to delete this checklist',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 403 }
      );
    }

    // Delete the checklist
    const result = await checklistService.delete(id);

    if (!result.success) {
      const statusCode = getStatusCodeForError(result.error?.code);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: result.error?.code ?? ChecklistErrorCodes.UNKNOWN_ERROR,
            message: result.error?.message ?? 'Failed to delete checklist',
            timestamp: new Date().toISOString(),
          },
        },
        { status: statusCode }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete checklist error:', error);
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
