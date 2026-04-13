/**
 * Template Items Reorder API Route
 * 
 * PUT /api/templates/[id]/items/reorder - Reorder items within a template
 * 
 * Requirements: 3.5
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/server-auth';
import { ItemService, ItemErrorCodes, type ReorderInput, type MoveItemInput } from '@/lib/services/item';
import { TemplateService, TemplateErrorCodes } from '@/lib/services/template';
import { CollaborationService } from '@/lib/services/collaboration';
import { PermissionLevel } from '@/lib/pocketbase-types';
import type { Item, ItemMetadata } from '@/lib/pocketbase-types';

interface ReorderRequestBody {
  items?: ReorderInput[];
  move?: MoveItemInput;
}

interface FormattedItem {
  id: string;
  templateId: string;
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

interface ReorderResponse {
  success: boolean;
  items?: FormattedItem[];
  error?: { code: string; message: string; details?: Record<string, unknown>; timestamp: string };
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

function getStatusCodeForError(errorCode: string | undefined): number {
  switch (errorCode) {
    case ItemErrorCodes.VALIDATION_ERROR:
    case ItemErrorCodes.MAX_DEPTH_EXCEEDED:
    case ItemErrorCodes.CIRCULAR_REFERENCE: return 400;
    case ItemErrorCodes.PERMISSION_DENIED: return 403;
    case ItemErrorCodes.NOT_FOUND:
    case ItemErrorCodes.TEMPLATE_NOT_FOUND:
    case ItemErrorCodes.PARENT_NOT_FOUND: return 404;
    default: return 500;
  }
}

function formatItem(item: Item): FormattedItem {
  return { id: item.id, templateId: item.blueprint, parentId: item.parent, path: item.path, itemType: item.itemType, content: item.content, referenceId: item.reference, position: item.position, metadata: item.metadata, createdAt: item.created, updatedAt: item.updated };
}


export async function PUT(request: NextRequest, context: RouteContext): Promise<NextResponse<ReorderResponse>> {
  try {
    const { id: templateId } = await context.params;
    const { isAuthenticated, user, pb } = await getServerAuth();

    if (!isAuthenticated || !user) {
      return NextResponse.json({ success: false, error: { code: ItemErrorCodes.PERMISSION_DENIED, message: 'Authentication required', timestamp: new Date().toISOString() } }, { status: 401 });
    }

    const body = await request.json() as ReorderRequestBody;

    if (!body.items && !body.move) {
      return NextResponse.json({ success: false, error: { code: ItemErrorCodes.VALIDATION_ERROR, message: 'Either "items" array or "move" object is required', timestamp: new Date().toISOString() } }, { status: 400 });
    }

    const templateService = new TemplateService(pb);
    const collaborationService = new CollaborationService(pb);
    const itemService = new ItemService(pb);

    const templateResult = await templateService.getById(templateId);
    if (!templateResult.success || !templateResult.data) {
      return NextResponse.json({ success: false, error: { code: TemplateErrorCodes.NOT_FOUND, message: 'Template not found', timestamp: new Date().toISOString() } }, { status: 404 });
    }

    const template = templateResult.data;
    const isOwner = template.owner === user.id;
    const hasEditPermission = isOwner || await collaborationService.hasPermission(templateId, user.id, PermissionLevel.EDITOR);

    if (!hasEditPermission) {
      return NextResponse.json({ success: false, error: { code: ItemErrorCodes.PERMISSION_DENIED, message: 'You do not have permission to reorder items in this template', timestamp: new Date().toISOString() } }, { status: 403 });
    }

    if (body.move) {
      const result = await itemService.moveItem(templateId, body.move);
      if (!result.success) {
        const firstError = result.errors[0];
        const statusCode = getStatusCodeForError(firstError?.code);
        return NextResponse.json({ success: false, error: { code: firstError?.code ?? ItemErrorCodes.UNKNOWN_ERROR, message: firstError?.message ?? 'Failed to move item', details: firstError?.details, timestamp: new Date().toISOString() } }, { status: statusCode });
      }
      return NextResponse.json({ success: true, items: result.items.map(formatItem) });
    } else if (body.items) {
      const result = await itemService.reorder(templateId, body.items);
      if (!result.success) {
        const firstError = result.errors[0];
        const statusCode = getStatusCodeForError(firstError?.code);
        return NextResponse.json({ success: false, error: { code: firstError?.code ?? ItemErrorCodes.UNKNOWN_ERROR, message: firstError?.message ?? 'Failed to reorder items', details: firstError?.details, timestamp: new Date().toISOString() } }, { status: statusCode });
      }
      return NextResponse.json({ success: true, items: result.items.map(formatItem) });
    }

    return NextResponse.json({ success: false, error: { code: ItemErrorCodes.VALIDATION_ERROR, message: 'Invalid request', timestamp: new Date().toISOString() } }, { status: 400 });
  } catch (error) {
    console.error('Reorder items error:', error);
    return NextResponse.json({ success: false, error: { code: ItemErrorCodes.UNKNOWN_ERROR, message: 'An unexpected error occurred', timestamp: new Date().toISOString() } }, { status: 500 });
  }
}
