/**
 * Template Copy API Route
 * 
 * POST /api/templates/[id]/copy - Copy a template to user's workspace
 * 
 * Allows users to copy templates they have access to (public, shared with them)
 * but don't own, creating a new template in their own workspace.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/server-auth';
import { TemplateService, TemplateErrorCodes } from '@/lib/services/template';
import { ItemService } from '@/lib/services/item';
import { CollaborationService } from '@/lib/services/collaboration';
import { Visibility, PermissionLevel, ItemType } from '@/lib/pocketbase-types';

// ============================================================================
// Types
// ============================================================================

interface CopyTemplateRequestBody {
  workspaceId: string;
  title?: string;
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

// ============================================================================
// POST /api/templates/[id]/copy
// ============================================================================

/**
 * Copy a template to user's workspace
 * 
 * Creates a new template with all items copied from the source template.
 * The new template is owned by the current user and set to private visibility.
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { id } = await context.params;

    // Require authentication
    const { isAuthenticated, user, pb } = await getServerAuth();

    if (!isAuthenticated || !user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: TemplateErrorCodes.PERMISSION_DENIED,
            message: 'Authentication required to copy templates',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json() as CopyTemplateRequestBody;

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

    // Create services
    const templateService = new TemplateService(pb);
    const itemService = new ItemService(pb);
    const collaborationService = new CollaborationService(pb);

    // Get the source template
    const sourceResult = await templateService.getById(id);

    if (!sourceResult.success || !sourceResult.data) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: TemplateErrorCodes.NOT_FOUND,
            message: 'Template not found',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 404 }
      );
    }

    const sourceTemplate = sourceResult.data;

    // Check access - user must have at least viewer access
    let hasAccess = false;

    if (sourceTemplate.visibility === Visibility.PUBLIC) {
      hasAccess = true;
    } else if (sourceTemplate.owner === user.id) {
      // Owner can copy their own template (though this is less common use case)
      hasAccess = true;
    } else if (sourceTemplate.visibility === Visibility.SHARED) {
      hasAccess = await collaborationService.hasPermission(
        id,
        user.id,
        PermissionLevel.VIEWER
      );
    }

    if (!hasAccess) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: TemplateErrorCodes.PERMISSION_DENIED,
            message: 'You do not have permission to copy this template',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 403 }
      );
    }

    // Create the new template
    const newTitle = body.title || `${sourceTemplate.title} (Copy)`;
    
    const createResult = await templateService.create({
      workspaceId: body.workspaceId,
      title: newTitle,
      description: sourceTemplate.description ?? undefined,
      category: sourceTemplate.category ?? undefined,
      tags: sourceTemplate.tags ?? undefined,
      visibility: Visibility.PRIVATE, // Always start as private
    });

    if (!createResult.success || !createResult.data) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: createResult.error?.code ?? TemplateErrorCodes.UNKNOWN_ERROR,
            message: createResult.error?.message ?? 'Failed to create template copy',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 500 }
      );
    }

    const newTemplate = createResult.data;

    // Copy all items from source template
    const sourceItems = await itemService.getByTemplate(id);

    if (sourceItems.length > 0) {
      // Create a mapping from old item IDs to new item IDs for parent references
      const idMapping = new Map<string, string>();

      // Sort items by path to ensure parents are created before children
      const sortedItems = [...sourceItems].sort((a, b) => {
        const depthA = a.path.split('.').length;
        const depthB = b.path.split('.').length;
        if (depthA !== depthB) return depthA - depthB;
        return a.position - b.position;
      });

      // Copy each item
      for (const sourceItem of sortedItems) {
        const newParentId = sourceItem.parent 
          ? idMapping.get(sourceItem.parent) ?? null 
          : null;

        const itemResult = await itemService.create({
          templateId: newTemplate.id,
          parentId: newParentId ?? undefined,
          itemType: sourceItem.itemType as ItemType,
          content: sourceItem.content,
          referenceId: sourceItem.reference ?? undefined,
          position: sourceItem.position,
          metadata: sourceItem.metadata ?? undefined,
        });

        if (itemResult.success) {
          idMapping.set(sourceItem.id, itemResult.data.id);
        }
      }
    }

    // Copy questions if present
    if (sourceTemplate.questions && sourceTemplate.questions.length > 0) {
      await templateService.update(newTemplate.id, {
        questions: sourceTemplate.questions,
      });
    }

    return NextResponse.json(
      {
        success: true,
        template: {
          id: newTemplate.id,
          workspaceId: newTemplate.workspace,
          ownerId: newTemplate.owner,
          title: newTemplate.title,
          description: newTemplate.description,
          visibility: newTemplate.visibility,
          category: newTemplate.category,
          tags: newTemplate.tags,
          version: newTemplate.version,
          instanceCount: newTemplate.instanceCount,
          createdAt: newTemplate.created,
          updatedAt: newTemplate.updated,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Copy template error:', error);
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
