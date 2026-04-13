/**
 * Template Items API Routes
 * 
 * GET /api/templates/[id]/items - Get all items for a template
 * POST /api/templates/[id]/items - Create a new item in a template
 * 
 * Requirements: 3.2, 3.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/server-auth';
import { ItemService, ItemErrorCodes } from '@/lib/services/item';
import { TemplateService, TemplateErrorCodes } from '@/lib/services/template';
import { CollaborationService } from '@/lib/services/collaboration';
import { createAdminClient } from '@/lib/pocketbase';
import { Visibility, PermissionLevel, ItemType } from '@/lib/pocketbase-types';
import type { Item, ItemMetadata, ResourceLink } from '@/lib/pocketbase-types';

interface CreateItemRequestBody {
  parentId?: string;
  itemType: ItemType;
  content: string;
  description?: string;
  resources?: ResourceLink[];
  referenceId?: string;
  position?: number;
  metadata?: ItemMetadata;
}

interface FormattedItem {
  id: string;
  templateId: string;
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
  items?: FormattedItem[];
  error?: { code: string; message: string; details?: Record<string, unknown>; timestamp: string };
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

function getStatusCodeForError(errorCode: string | undefined): number {
  switch (errorCode) {
    case ItemErrorCodes.CONTENT_REQUIRED:
    case ItemErrorCodes.INVALID_ITEM_TYPE:
    case ItemErrorCodes.REFERENCE_REQUIRED:
    case ItemErrorCodes.VALIDATION_ERROR:
    case ItemErrorCodes.MAX_DEPTH_EXCEEDED:
    case ItemErrorCodes.CIRCULAR_REFERENCE: return 400;
    case ItemErrorCodes.PERMISSION_DENIED: return 403;
    case ItemErrorCodes.NOT_FOUND:
    case ItemErrorCodes.TEMPLATE_NOT_FOUND:
    case ItemErrorCodes.PARENT_NOT_FOUND:
    case ItemErrorCodes.REFERENCE_NOT_FOUND: return 404;
    default: return 500;
  }
}

function formatItem(item: Item): FormattedItem {
  return { id: item.id, templateId: item.blueprint, parentId: item.parent, path: item.path, itemType: item.itemType, content: item.content, description: item.description, resources: item.resources, referenceId: item.reference, position: item.position, metadata: item.metadata, createdAt: item.created, updatedAt: item.updated };
}


export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse<ItemResponse>> {
  try {
    const { id: templateId } = await context.params;
    const { isAuthenticated, user, pb } = await getServerAuth();

    const templateService = new TemplateService(pb);
    const collaborationService = new CollaborationService(pb);

    // First try with user's pb client (respects RLS — works for authenticated users
    // and for public templates since blueprints viewRule allows public access).
    let templateResult = await templateService.getById(templateId);

    // If unauthenticated and template not found via RLS, try admin client
    // to check if it's a public template (PocketBase may not resolve the
    // viewRule for completely unauthenticated requests in all configurations).
    if (!isAuthenticated && (!templateResult.success || !templateResult.data)) {
      const adminPb = await createAdminClient();
      const adminTemplateService = new TemplateService(adminPb);
      templateResult = await adminTemplateService.getById(templateId);

      // Only allow public templates for unauthenticated users
      if (templateResult.success && templateResult.data && templateResult.data.visibility !== Visibility.PUBLIC) {
        return NextResponse.json({ success: false, error: { code: TemplateErrorCodes.NOT_FOUND, message: 'Template not found', timestamp: new Date().toISOString() } }, { status: 404 });
      }
    }

    if (!templateResult.success || !templateResult.data) {
      return NextResponse.json({ success: false, error: { code: TemplateErrorCodes.NOT_FOUND, message: 'Template not found', timestamp: new Date().toISOString() } }, { status: 404 });
    }

    const template = templateResult.data;

    if (template.visibility === Visibility.PRIVATE) {
      if (!isAuthenticated || !user || template.owner !== user.id) {
        return NextResponse.json({ success: false, error: { code: TemplateErrorCodes.NOT_FOUND, message: 'Template not found', timestamp: new Date().toISOString() } }, { status: 404 });
      }
    } else if (template.visibility === Visibility.SHARED) {
      if (!isAuthenticated || !user) {
        return NextResponse.json({ success: false, error: { code: TemplateErrorCodes.NOT_FOUND, message: 'Template not found', timestamp: new Date().toISOString() } }, { status: 404 });
      }
      const isOwner = template.owner === user.id;
      const hasAccess = isOwner || await collaborationService.hasPermission(templateId, user.id, PermissionLevel.VIEWER);
      if (!hasAccess) {
        return NextResponse.json({ success: false, error: { code: TemplateErrorCodes.NOT_FOUND, message: 'Template not found', timestamp: new Date().toISOString() } }, { status: 404 });
      }
    }

    // For public templates viewed by anonymous users, use admin client to
    // bypass items RLS (which requires authentication). This is safe because:
    // 1. We only reach here for verified-public templates
    // 2. The admin client is only used for a scoped read-only query
    // 3. It is never exposed to the caller
    let itemService: ItemService;
    if (template.visibility === Visibility.PUBLIC && !isAuthenticated) {
      const adminPb = await createAdminClient();
      itemService = new ItemService(adminPb);
    } else {
      itemService = new ItemService(pb);
    }

    const { searchParams } = new URL(request.url);
    const expand = searchParams.get('expand') ?? undefined;
    const items = await itemService.getByBlueprint(templateId, { expand });

    return NextResponse.json({ success: true, items: items.map(formatItem) });
  } catch (error) {
    console.error('Get template items error:', error);
    return NextResponse.json({ success: false, error: { code: ItemErrorCodes.UNKNOWN_ERROR, message: 'An unexpected error occurred', timestamp: new Date().toISOString() } }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext): Promise<NextResponse<ItemResponse>> {
  try {
    const { id: templateId } = await context.params;
    const { isAuthenticated, user, pb } = await getServerAuth();

    if (!isAuthenticated || !user) {
      return NextResponse.json({ success: false, error: { code: ItemErrorCodes.PERMISSION_DENIED, message: 'Authentication required', timestamp: new Date().toISOString() } }, { status: 401 });
    }

    const body = await request.json() as CreateItemRequestBody;
    console.log('[POST /api/templates/[id]/items] Request body:', JSON.stringify(body));

    if (!body.content) {
      return NextResponse.json({ success: false, error: { code: ItemErrorCodes.CONTENT_REQUIRED, message: 'content is required', timestamp: new Date().toISOString() } }, { status: 400 });
    }
    if (!body.itemType) {
      return NextResponse.json({ success: false, error: { code: ItemErrorCodes.INVALID_ITEM_TYPE, message: 'itemType is required', timestamp: new Date().toISOString() } }, { status: 400 });
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
      return NextResponse.json({ success: false, error: { code: ItemErrorCodes.PERMISSION_DENIED, message: 'You do not have permission to add items to this template', timestamp: new Date().toISOString() } }, { status: 403 });
    }

    console.log('[POST /api/templates/[id]/items] Calling itemService.create with:', {
      templateId,
      parentId: body.parentId,
      itemType: body.itemType,
      content: body.content,
      description: body.description,
      position: body.position,
    });

    const result = await itemService.create({ templateId: templateId, parentId: body.parentId, itemType: body.itemType, content: body.content, description: body.description, resources: body.resources, referenceId: body.referenceId, position: body.position, metadata: body.metadata });

    console.log('[POST /api/templates/[id]/items] itemService.create result:', JSON.stringify(result));

    if (!result.success) {
      const statusCode = getStatusCodeForError(result.error.code);
      return NextResponse.json({ success: false, error: { code: result.error.code, message: result.error.message, details: result.error.details, timestamp: new Date().toISOString() } }, { status: statusCode });
    }

    return NextResponse.json({ success: true, item: formatItem(result.data) }, { status: 201 });
  } catch (error) {
    console.error('Create item error:', error);
    return NextResponse.json({ success: false, error: { code: ItemErrorCodes.UNKNOWN_ERROR, message: 'An unexpected error occurred', timestamp: new Date().toISOString() } }, { status: 500 });
  }
}
