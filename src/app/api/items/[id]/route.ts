/**
 * Item by ID API Routes
 * 
 * GET /api/items/[id] - Get a specific item
 * PUT /api/items/[id] - Update an item
 * DELETE /api/items/[id] - Delete an item
 * 
 * Requirements: 3.2, 3.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/server-auth';
import { ItemService, ItemErrorCodes } from '@/lib/services/item';
import { TemplateService, TemplateErrorCodes } from '@/lib/services/template';
import { CollaborationService } from '@/lib/services/collaboration';
import { Visibility, PermissionLevel, ItemType } from '@/lib/pocketbase-types';
import type { Item, ItemMetadata } from '@/lib/pocketbase-types';

// ============================================================================
// Types
// ============================================================================

interface UpdateItemRequestBody {
  parentId?: string | null;
  content?: string;
  itemType?: ItemType;
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

interface RouteContext {
  params: Promise<{ id: string }>;
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
export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse<ItemResponse>> {
  try {
    const { id } = await context.params;

    // Get auth context
    const { isAuthenticated, user, pb } = await getServerAuth();

    // Create services
    const itemService = new ItemService(pb);
    const templateService = new TemplateService(pb);
    const collaborationService = new CollaborationService(pb);

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const expand = searchParams.get('expand') ?? undefined;

    // Get the item
    const itemResult = await itemService.getById(id, expand);

    if (!itemResult.success || !itemResult.item) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ItemErrorCodes.NOT_FOUND,
            message: 'Item not found',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 404 }
      );
    }

    const item = itemResult.item;

    // Get the template to check access
    const templateResult = await templateService.getById(item.blueprint);

    if (!templateResult.success || !templateResult.template) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ItemErrorCodes.NOT_FOUND,
            message: 'Item not found',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 404 }
      );
    }

    const template = templateResult.template;

    // Check access based on visibility
    if (template.visibility === Visibility.PUBLIC) {
      // Public templates - items accessible to everyone
      return NextResponse.json({
        success: true,
        item: formatItem(item),
      });
    }

    // For private and shared templates, require authentication
    if (!isAuthenticated || !user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ItemErrorCodes.NOT_FOUND,
            message: 'Item not found',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 404 }
      );
    }

    // Check if user is the owner
    if (template.owner === user.id) {
      return NextResponse.json({
        success: true,
        item: formatItem(item),
      });
    }

    // For shared templates, check if user is a collaborator
    if (template.visibility === Visibility.SHARED) {
      const hasAccess = await collaborationService.hasPermission(
        template.id,
        user.id,
        PermissionLevel.VIEWER
      );

      if (hasAccess) {
        return NextResponse.json({
          success: true,
          item: formatItem(item),
        });
      }
    }

    // User doesn't have access - return 404 to not reveal existence
    return NextResponse.json(
      {
        success: false,
        error: {
          code: ItemErrorCodes.NOT_FOUND,
          message: 'Item not found',
          timestamp: new Date().toISOString(),
        },
      },
      { status: 404 }
    );
  } catch (error) {
    console.error('Get item error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: ItemErrorCodes.UNKNOWN_ERROR,
          message: 'An unexpected error occurred',
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}

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
export async function PUT(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse<ItemResponse>> {
  try {
    const { id } = await context.params;

    // Require authentication
    const { isAuthenticated, user, pb } = await getServerAuth();

    if (!isAuthenticated || !user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ItemErrorCodes.PERMISSION_DENIED,
            message: 'Authentication required',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json() as UpdateItemRequestBody;

    // Create services
    const itemService = new ItemService(pb);
    const templateService = new TemplateService(pb);
    const collaborationService = new CollaborationService(pb);

    // Get the item to check its template
    const itemResult = await itemService.getById(id);

    if (!itemResult.success || !itemResult.item) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ItemErrorCodes.NOT_FOUND,
            message: 'Item not found',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 404 }
      );
    }

    const item = itemResult.item;

    // Get the template to check ownership/permissions
    const templateResult = await templateService.getById(item.blueprint);

    if (!templateResult.success || !templateResult.template) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ItemErrorCodes.NOT_FOUND,
            message: 'Item not found',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 404 }
      );
    }

    const template = templateResult.template;

    // Check if user has edit permission
    const isOwner = template.owner === user.id;
    const hasEditPermission = isOwner || await collaborationService.hasPermission(
      template.id,
      user.id,
      PermissionLevel.EDITOR
    );

    if (!hasEditPermission) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ItemErrorCodes.PERMISSION_DENIED,
            message: 'You do not have permission to update this item',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 403 }
      );
    }

    // Update the item
    const result = await itemService.update(id, {
      parentId: body.parentId,
      content: body.content,
      itemType: body.itemType,
      referenceId: body.referenceId,
      position: body.position,
      metadata: body.metadata,
    });

    if (!result.success || !result.item) {
      const statusCode = getStatusCodeForError(result.error?.code);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: result.error?.code ?? ItemErrorCodes.UNKNOWN_ERROR,
            message: result.error?.message ?? 'Failed to update item',
            details: result.error?.details,
            timestamp: new Date().toISOString(),
          },
        },
        { status: statusCode }
      );
    }

    return NextResponse.json({
      success: true,
      item: formatItem(result.item),
    });
  } catch (error) {
    console.error('Update item error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: ItemErrorCodes.UNKNOWN_ERROR,
          message: 'An unexpected error occurred',
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}

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
            code: ItemErrorCodes.PERMISSION_DENIED,
            message: 'Authentication required',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 401 }
      );
    }

    // Create services
    const itemService = new ItemService(pb);
    const templateService = new TemplateService(pb);
    const collaborationService = new CollaborationService(pb);

    // Get the item to check its template
    const itemResult = await itemService.getById(id);

    if (!itemResult.success || !itemResult.item) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ItemErrorCodes.NOT_FOUND,
            message: 'Item not found',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 404 }
      );
    }

    const item = itemResult.item;

    // Get the template to check ownership/permissions
    const templateResult = await templateService.getById(item.blueprint);

    if (!templateResult.success || !templateResult.template) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ItemErrorCodes.NOT_FOUND,
            message: 'Item not found',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 404 }
      );
    }

    const template = templateResult.template;

    // Check if user has edit permission
    const isOwner = template.owner === user.id;
    const hasEditPermission = isOwner || await collaborationService.hasPermission(
      template.id,
      user.id,
      PermissionLevel.EDITOR
    );

    if (!hasEditPermission) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ItemErrorCodes.PERMISSION_DENIED,
            message: 'You do not have permission to delete this item',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 403 }
      );
    }

    // Delete the item
    const result = await itemService.delete(id);

    if (!result.success) {
      const statusCode = getStatusCodeForError(result.error?.code);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: result.error?.code ?? ItemErrorCodes.UNKNOWN_ERROR,
            message: result.error?.message ?? 'Failed to delete item',
            timestamp: new Date().toISOString(),
          },
        },
        { status: statusCode }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete item error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: ItemErrorCodes.UNKNOWN_ERROR,
          message: 'An unexpected error occurred',
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}
