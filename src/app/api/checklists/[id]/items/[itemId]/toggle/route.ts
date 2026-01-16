/**
 * Task Toggle API Route
 * 
 * PUT /api/checklists/[id]/items/[itemId]/toggle - Toggle task completion status
 * 
 * Requirements: 6.1
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/server-auth';
import { ChecklistService, ChecklistErrorCodes } from '@/lib/services/checklist';

// ============================================================================
// Types
// ============================================================================

interface ToggleResponse {
  success: boolean;
  task?: {
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
  };
  progress?: {
    totalItems: number;
    completedItems: number;
    percentage: number;
  };
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    timestamp: string;
  };
}

interface RouteContext {
  params: Promise<{ id: string; itemId: string }>;
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
// PUT /api/checklists/[id]/items/[itemId]/toggle
// ============================================================================

/**
 * Toggle the completion status of a task
 * 
 * Requirements: 6.1
 * - Updates completion status immediately
 * - Recalculates and returns progress
 * - Handles checklist completion detection (6.5)
 * 
 * Access rules:
 * - Only the checklist owner can toggle tasks
 */
export async function PUT(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse<ToggleResponse>> {
  try {
    const { id, itemId } = await context.params;

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
            message: 'You do not have permission to modify this checklist',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 403 }
      );
    }

    // Toggle the task completion
    const result = await checklistService.toggleTaskCompletion(id, itemId);

    if (!result.success || !result.task) {
      const statusCode = getStatusCodeForError(result.error?.code);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: result.error?.code ?? ChecklistErrorCodes.UNKNOWN_ERROR,
            message: result.error?.message ?? 'Failed to toggle task completion',
            details: result.error?.details,
            timestamp: new Date().toISOString(),
          },
        },
        { status: statusCode }
      );
    }

    return NextResponse.json({
      success: true,
      task: formatChecklistItem(result.task as any),
      progress: result.progress ?? undefined,
    });
  } catch (error) {
    console.error('Toggle item completion error:', error);
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
