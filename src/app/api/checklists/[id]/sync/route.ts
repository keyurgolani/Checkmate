/**
 * Checklist Sync API Route
 * 
 * POST /api/checklists/[id]/sync - Sync checklist with its source template
 * 
 * Requirements: 5.5
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/server-auth';
import { ChecklistService, ChecklistErrorCodes } from '@/lib/services/checklist';

// ============================================================================
// Types
// ============================================================================

interface SyncResponse {
  success: boolean;
  syncResult?: {
    added: number;
    updated: number;
    removed: number;
    conflicts: Array<{
      checklistItemId: string;
      templateItemId: string;
      type: string;
      message: string;
    }>;
  };
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

// ============================================================================
// POST /api/checklists/[id]/sync
// ============================================================================

/**
 * Sync a checklist with its source template
 * 
 * Requirements: 5.5
 * - Merges template changes while preserving custom items
 * - Returns counts of added, updated, removed items
 * - Reports any conflicts that occurred
 * 
 * Access rules:
 * - Only the checklist owner can sync their checklists
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse<SyncResponse>> {
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

    // Create service with authenticated PocketBase client
    const checklistService = new ChecklistService(pb);

    // Get the checklist to check ownership
    const getResult = await checklistService.getById(id);

    if (!getResult.success || !getResult.data.checklist) {
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
    if (getResult.data.checklist.user !== user.id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ChecklistErrorCodes.PERMISSION_DENIED,
            message: 'You do not have permission to sync this checklist',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 403 }
      );
    }

    // Perform the sync
    const result = await checklistService.syncWithTemplate(id);

    if (!result.success && result.error) {
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

    return NextResponse.json({
      success: result.success,
      syncResult: {
        added: result.added,
        updated: result.updated,
        removed: result.removed,
        conflicts: result.conflicts.map(c => ({
          checklistItemId: c.instanceItemId,
          templateItemId: c.templateItemId,
          type: c.type,
          message: c.message,
        })),
      },
    });
  } catch (error) {
    console.error('Sync checklist error:', error);
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
