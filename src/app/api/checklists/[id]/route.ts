/**
 * Checklist by ID API Routes
 *
 * GET /api/checklists/[id] - Get a specific checklist
 * PUT /api/checklists/[id] - Update a checklist
 * DELETE /api/checklists/[id] - Delete a checklist
 *
 * Requirements: 5.1, 5.3, 5.6
 */

import { NextResponse } from 'next/server';
import { ChecklistService, ChecklistErrorCodes } from '@/lib/services/checklist';
import type { ResourceLink } from '@/lib/pocketbase-types';
import { apiError, withAuth } from '@/lib/api/route-helpers';

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
export const GET = withAuth<{ id: string }, ChecklistResponse>(
  {
    tag: 'Get checklist',
    unknownCode: ChecklistErrorCodes.UNKNOWN_ERROR,
    unauthorizedCode: ChecklistErrorCodes.PERMISSION_DENIED,
  },
  async ({ req, params, user, pb }) => {
    const { id } = params;
    const { searchParams } = new URL(req.url);
    const expand = searchParams.get('expand');
    const includeItems = searchParams.get('includeItems') === 'true';

    const checklistService = new ChecklistService(pb);

    const result = await checklistService.getById(id, expand ?? undefined);

    if (!result.success || !result.data.checklist) {
      return apiError(ChecklistErrorCodes.NOT_FOUND, 'Checklist not found', 404);
    }

    const checklist = result.data.checklist;

    // Owner check - return 404 to not reveal existence
    if (checklist.user !== user.id) {
      return apiError(ChecklistErrorCodes.NOT_FOUND, 'Checklist not found', 404);
    }

    let checklistTasks;
    if (includeItems) {
      const tasks = await checklistService.getTasks(id, { sort: 'path,position' });
      checklistTasks = tasks.map((task) => formatChecklistItem(task as any));
    }

    return NextResponse.json<ChecklistResponse>({
      success: true,
      checklist: formatChecklist(checklist as any),
      ...(checklistTasks && { checklistItems: checklistTasks }),
    });
  }
);

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
export const PUT = withAuth<{ id: string }, ChecklistResponse>(
  {
    tag: 'Update checklist',
    unknownCode: ChecklistErrorCodes.UNKNOWN_ERROR,
    unauthorizedCode: ChecklistErrorCodes.PERMISSION_DENIED,
  },
  async ({ req, params, user, pb }) => {
    const { id } = params;
    const body = (await req.json()) as UpdateChecklistRequestBody;

    const checklistService = new ChecklistService(pb);

    const getResult = await checklistService.getById(id);
    if (!getResult.success || !getResult.data.checklist) {
      return apiError(ChecklistErrorCodes.NOT_FOUND, 'Checklist not found', 404);
    }

    if (getResult.data.checklist.user !== user.id) {
      return apiError(
        ChecklistErrorCodes.PERMISSION_DENIED,
        'You do not have permission to update this checklist',
        403
      );
    }

    if (body.name !== undefined && body.name.trim().length === 0) {
      return apiError(
        ChecklistErrorCodes.NAME_REQUIRED,
        'Checklist name cannot be empty',
        400
      );
    }

    const result = await checklistService.update(id, {
      name: body.name?.trim(),
      description: body.description,
      resources: body.resources,
    });

    if (!result.success || !result.data.checklist) {
      return apiError(
        result.error?.code ?? ChecklistErrorCodes.UNKNOWN_ERROR,
        result.error?.message ?? 'Failed to update checklist',
        getStatusCodeForError(result.error?.code),
        result.error?.details
      );
    }

    return NextResponse.json<ChecklistResponse>({
      success: true,
      checklist: formatChecklist(result.data.checklist as any),
    });
  }
);

// ============================================================================
// DELETE /api/checklists/[id]
// ============================================================================

/**
 * Delete a checklist
 *
 * Access rules:
 * - Only the checklist owner can delete their checklists
 */
export const DELETE = withAuth<{ id: string }, { success: boolean }>(
  {
    tag: 'Delete checklist',
    unknownCode: ChecklistErrorCodes.UNKNOWN_ERROR,
    unauthorizedCode: ChecklistErrorCodes.PERMISSION_DENIED,
  },
  async ({ params, user, pb }) => {
    const { id } = params;

    const checklistService = new ChecklistService(pb);

    const getResult = await checklistService.getById(id);
    if (!getResult.success || !getResult.data.checklist) {
      return apiError(ChecklistErrorCodes.NOT_FOUND, 'Checklist not found', 404);
    }

    if (getResult.data.checklist.user !== user.id) {
      return apiError(
        ChecklistErrorCodes.PERMISSION_DENIED,
        'You do not have permission to delete this checklist',
        403
      );
    }

    const result = await checklistService.delete(id);
    if (!result.success) {
      return apiError(
        result.error?.code ?? ChecklistErrorCodes.UNKNOWN_ERROR,
        result.error?.message ?? 'Failed to delete checklist',
        getStatusCodeForError(result.error?.code)
      );
    }

    return NextResponse.json({ success: true });
  }
);
