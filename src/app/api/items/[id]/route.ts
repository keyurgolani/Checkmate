/**
 * Item by ID API Routes
 *
 * GET /api/items/[id] - Get a specific item
 * PUT /api/items/[id] - Update an item
 * DELETE /api/items/[id] - Delete an item
 *
 * Requirements: 3.2, 3.3
 */

import { NextResponse } from 'next/server';
import { ItemService, ItemErrorCodes } from '@/lib/services/item';
import { TemplateService } from '@/lib/services/template';
import { CollaborationService } from '@/lib/services/collaboration';
import { Visibility, PermissionLevel, ItemType } from '@/lib/pocketbase-types';
import type { Item, ItemMetadata, ResourceLink } from '@/lib/pocketbase-types';
import { apiError, withAuth, withPublicAccess } from '@/lib/api/route-helpers';

// ============================================================================
// Types
// ============================================================================

interface UpdateItemRequestBody {
  parentId?: string | null;
  content?: string;
  description?: string;
  itemType?: ItemType;
  resources?: ResourceLink[];
  referenceId?: string | null;
  position?: number;
  metadata?: ItemMetadata;
}

interface FormattedItem {
  id: string;
  templateId: string; // Renamed from blueprintId to match public terminology
  parentId: string | null;
  path: string;
  itemType: string;
  content: string;
  description: string | null;
  resources: ResourceLink[] | null;
  referenceId: string | null;
  position: number;
  metadata: ItemMetadata | null;
  createdAt: string;
  updatedAt: string;
}

interface ItemResponse {
  success: boolean;
  item?: FormattedItem;
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
    case ItemErrorCodes.CONTENT_REQUIRED:
    case ItemErrorCodes.INVALID_ITEM_TYPE:
    case ItemErrorCodes.REFERENCE_REQUIRED:
    case ItemErrorCodes.VALIDATION_ERROR:
    case ItemErrorCodes.MAX_DEPTH_EXCEEDED:
    case ItemErrorCodes.CIRCULAR_REFERENCE:
      return 400;
    case ItemErrorCodes.PERMISSION_DENIED:
      return 403;
    case ItemErrorCodes.NOT_FOUND:
    case ItemErrorCodes.TEMPLATE_NOT_FOUND:
    case ItemErrorCodes.PARENT_NOT_FOUND:
    case ItemErrorCodes.REFERENCE_NOT_FOUND:
      return 404;
    default:
      return 500;
  }
}

function formatItem(item: Item): FormattedItem {
  return {
    id: item.id,
    templateId: item.blueprint, // Map DB field 'blueprint' to 'templateId'
    parentId: item.parent,
    path: item.path,
    itemType: item.itemType,
    content: item.content,
    description: item.description,
    resources: item.resources,
    referenceId: item.reference,
    position: item.position,
    metadata: item.metadata,
    createdAt: item.created,
    updatedAt: item.updated,
  };
}

// ============================================================================
// GET /api/items/[id]
// ============================================================================

/**
 * Get a specific item by ID
 *
 * Access rules:
 * - Public templates: items accessible to everyone
 * - Private templates: items only accessible to owner
 * - Shared templates: items accessible to owner and collaborators
 */
export const GET = withPublicAccess<{ id: string }, ItemResponse>(
  { tag: 'Get item', unknownCode: ItemErrorCodes.UNKNOWN_ERROR },
  async ({ req, params, isAuthenticated, user, pb }) => {
    const { id } = params;
    const { searchParams } = new URL(req.url);
    const expand = searchParams.get('expand') ?? undefined;

    const itemService = new ItemService(pb);
    const templateService = new TemplateService(pb);
    const collaborationService = new CollaborationService(pb);

    const itemResult = await itemService.getById(id, expand);
    if (!itemResult.success) {
      return apiError(ItemErrorCodes.NOT_FOUND, 'Item not found', 404);
    }

    const item = itemResult.data;

    const templateResult = await templateService.getById(item.blueprint);
    if (!templateResult.success || !templateResult.template) {
      return apiError(ItemErrorCodes.NOT_FOUND, 'Item not found', 404);
    }

    const template = templateResult.template;

    if (template.visibility === Visibility.PUBLIC) {
      return NextResponse.json<ItemResponse>({
        success: true,
        item: formatItem(item),
      });
    }

    // Private/shared templates require authentication
    if (!isAuthenticated || !user) {
      return apiError(ItemErrorCodes.NOT_FOUND, 'Item not found', 404);
    }

    if (template.owner === user.id) {
      return NextResponse.json<ItemResponse>({
        success: true,
        item: formatItem(item),
      });
    }

    if (template.visibility === Visibility.SHARED) {
      const hasAccess = await collaborationService.hasPermission(
        template.id,
        user.id,
        PermissionLevel.VIEWER
      );
      if (hasAccess) {
        return NextResponse.json<ItemResponse>({
          success: true,
          item: formatItem(item),
        });
      }
    }

    // User doesn't have access - return 404 to not reveal existence
    return apiError(ItemErrorCodes.NOT_FOUND, 'Item not found', 404);
  }
);

// ============================================================================
// PUT /api/items/[id]
// ============================================================================

/**
 * Update an item
 *
 * Requirements: 3.2, 3.3
 *
 * Access rules:
 * - Owner: can update items
 * - Editor collaborator: can update items
 * - Viewer collaborator: cannot update items
 */
export const PUT = withAuth<{ id: string }, ItemResponse>(
  {
    tag: 'Update item',
    unknownCode: ItemErrorCodes.UNKNOWN_ERROR,
    unauthorizedCode: ItemErrorCodes.PERMISSION_DENIED,
  },
  async ({ req, params, user, pb }) => {
    const { id } = params;
    const body = (await req.json()) as UpdateItemRequestBody;

    const itemService = new ItemService(pb);
    const templateService = new TemplateService(pb);
    const collaborationService = new CollaborationService(pb);

    const itemResult = await itemService.getById(id);
    if (!itemResult.success) {
      return apiError(ItemErrorCodes.NOT_FOUND, 'Item not found', 404);
    }

    const item = itemResult.data;

    const templateResult = await templateService.getById(item.blueprint);
    if (!templateResult.success || !templateResult.template) {
      return apiError(ItemErrorCodes.NOT_FOUND, 'Item not found', 404);
    }

    const template = templateResult.template;
    const isOwner = template.owner === user.id;
    const hasEditPermission =
      isOwner ||
      (await collaborationService.hasPermission(template.id, user.id, PermissionLevel.EDITOR));

    if (!hasEditPermission) {
      return apiError(
        ItemErrorCodes.PERMISSION_DENIED,
        'You do not have permission to update this item',
        403
      );
    }

    const result = await itemService.update(id, {
      parentId: body.parentId,
      content: body.content,
      description: body.description,
      itemType: body.itemType,
      resources: body.resources,
      referenceId: body.referenceId,
      position: body.position,
      metadata: body.metadata,
    });

    if (!result.success) {
      return apiError(
        result.error.code,
        result.error.message,
        getStatusCodeForError(result.error.code),
        result.error.details
      );
    }

    return NextResponse.json<ItemResponse>({
      success: true,
      item: formatItem(result.data),
    });
  }
);

// ============================================================================
// DELETE /api/items/[id]
// ============================================================================

/**
 * Delete an item
 *
 * Also deletes all child items due to cascade delete.
 *
 * Access rules:
 * - Owner: can delete items
 * - Editor collaborator: can delete items
 * - Viewer collaborator: cannot delete items
 */
export const DELETE = withAuth<{ id: string }, { success: boolean }>(
  {
    tag: 'Delete item',
    unknownCode: ItemErrorCodes.UNKNOWN_ERROR,
    unauthorizedCode: ItemErrorCodes.PERMISSION_DENIED,
  },
  async ({ params, user, pb }) => {
    const { id } = params;

    const itemService = new ItemService(pb);
    const templateService = new TemplateService(pb);
    const collaborationService = new CollaborationService(pb);

    const itemResult = await itemService.getById(id);
    if (!itemResult.success) {
      return apiError(ItemErrorCodes.NOT_FOUND, 'Item not found', 404);
    }

    const item = itemResult.data;

    const templateResult = await templateService.getById(item.blueprint);
    if (!templateResult.success || !templateResult.template) {
      return apiError(ItemErrorCodes.NOT_FOUND, 'Item not found', 404);
    }

    const template = templateResult.template;
    const isOwner = template.owner === user.id;
    const hasEditPermission =
      isOwner ||
      (await collaborationService.hasPermission(template.id, user.id, PermissionLevel.EDITOR));

    if (!hasEditPermission) {
      return apiError(
        ItemErrorCodes.PERMISSION_DENIED,
        'You do not have permission to delete this item',
        403
      );
    }

    const result = await itemService.delete(id);
    if (!result.success) {
      return apiError(
        result.error?.code ?? ItemErrorCodes.UNKNOWN_ERROR,
        result.error?.message ?? 'Failed to delete item',
        getStatusCodeForError(result.error?.code)
      );
    }

    return NextResponse.json({ success: true });
  }
);
