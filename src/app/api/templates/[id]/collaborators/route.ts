/**
 * Template Collaborators API Routes
 * 
 * GET /api/templates/[id]/collaborators - List collaborators for a template
 * POST /api/templates/[id]/collaborators - Invite a collaborator to a template
 * 
 * Requirements: 4.4, 4.5, 4.6
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/server-auth';
import { TemplateService, TemplateErrorCodes } from '@/lib/services/template';
import { CollaborationService, CollaborationErrorCodes } from '@/lib/services/collaboration';
import { PermissionLevel, Visibility } from '@/lib/pocketbase-types';

// ============================================================================
// Types
// ============================================================================

interface InviteCollaboratorRequestBody {
  email: string;
  permissionLevel: PermissionLevel;
}

interface CollaboratorResponse {
  id: string;
  templateId: string;
  userId: string;
  permissionLevel: string;
  invitedAt: string;
  acceptedAt: string | null;
  user?: {
    id: string;
    email: string;
    displayName: string | null;
  };
}

interface CollaboratorsListResponse {
  success: boolean;
  collaborators?: CollaboratorResponse[];
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    timestamp: string;
  };
}

interface InviteCollaboratorResponse {
  success: boolean;
  collaborator?: CollaboratorResponse;
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
    case CollaborationErrorCodes.INVALID_PERMISSION:
    case CollaborationErrorCodes.ALREADY_COLLABORATOR:
    case CollaborationErrorCodes.CANNOT_INVITE_OWNER:
      return 400;
    case CollaborationErrorCodes.NOT_AUTHENTICATED:
      return 401;
    case CollaborationErrorCodes.PERMISSION_DENIED:
      return 403;
    case CollaborationErrorCodes.NOT_FOUND:
    case CollaborationErrorCodes.BLUEPRINT_NOT_FOUND:
    case CollaborationErrorCodes.USER_NOT_FOUND:
      return 404;
    default:
      return 500;
  }
}

// ============================================================================
// GET /api/templates/[id]/collaborators
// ============================================================================

export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse<CollaboratorsListResponse>> {
  try {
    const { id: templateId } = await context.params;
    const { isAuthenticated, user, pb } = await getServerAuth();

    if (!isAuthenticated || !user) {
      return NextResponse.json(
        { success: false, error: { code: CollaborationErrorCodes.NOT_AUTHENTICATED, message: 'Authentication required', timestamp: new Date().toISOString() } },
        { status: 401 }
      );
    }

    const templateService = new TemplateService(pb);
    const collaborationService = new CollaborationService(pb);

    const templateResult = await templateService.getById(templateId);
    if (!templateResult.success || !templateResult.template) {
      return NextResponse.json(
        { success: false, error: { code: CollaborationErrorCodes.BLUEPRINT_NOT_FOUND, message: 'Template not found', timestamp: new Date().toISOString() } },
        { status: 404 }
      );
    }

    const template = templateResult.template;
    const isOwner = template.owner === user.id;
    const hasAccess = isOwner || await collaborationService.hasPermission(templateId, user.id, PermissionLevel.VIEWER);

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: { code: CollaborationErrorCodes.PERMISSION_DENIED, message: 'You do not have permission to view collaborators', timestamp: new Date().toISOString() } },
        { status: 403 }
      );
    }

    const result = await collaborationService.getCollaborators(templateId, { includeUser: true });
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: { code: result.error?.code ?? CollaborationErrorCodes.UNKNOWN_ERROR, message: result.error?.message ?? 'Failed to get collaborators', timestamp: new Date().toISOString() } },
        { status: 500 }
      );
    }

    const collaborators: CollaboratorResponse[] = result.collaborators.map((collab) => ({
      id: collab.id,
      templateId: collab.blueprint,
      userId: collab.user,
      permissionLevel: collab.permissionLevel,
      invitedAt: collab.invitedAt,
      acceptedAt: collab.acceptedAt,
      user: collab.expand?.user ? { id: collab.expand.user.id, email: collab.expand.user.email, displayName: collab.expand.user.displayName } : undefined,
    }));

    return NextResponse.json({ success: true, collaborators });
  } catch (error) {
    console.error('Get collaborators error:', error);
    return NextResponse.json(
      { success: false, error: { code: CollaborationErrorCodes.UNKNOWN_ERROR, message: 'An unexpected error occurred', timestamp: new Date().toISOString() } },
      { status: 500 }
    );
  }
}


// ============================================================================
// POST /api/templates/[id]/collaborators
// ============================================================================

export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse<InviteCollaboratorResponse>> {
  try {
    const { id: templateId } = await context.params;
    const { isAuthenticated, user, pb } = await getServerAuth();

    if (!isAuthenticated || !user) {
      return NextResponse.json(
        { success: false, error: { code: CollaborationErrorCodes.NOT_AUTHENTICATED, message: 'Authentication required', timestamp: new Date().toISOString() } },
        { status: 401 }
      );
    }

    const body = await request.json() as InviteCollaboratorRequestBody;

    if (!body.email) {
      return NextResponse.json(
        { success: false, error: { code: CollaborationErrorCodes.INVALID_PERMISSION, message: 'Email is required', timestamp: new Date().toISOString() } },
        { status: 400 }
      );
    }

    if (!body.permissionLevel) {
      return NextResponse.json(
        { success: false, error: { code: CollaborationErrorCodes.INVALID_PERMISSION, message: 'Permission level is required', timestamp: new Date().toISOString() } },
        { status: 400 }
      );
    }

    const templateService = new TemplateService(pb);
    const collaborationService = new CollaborationService(pb);

    const templateResult = await templateService.getById(templateId);
    if (!templateResult.success || !templateResult.template) {
      return NextResponse.json(
        { success: false, error: { code: CollaborationErrorCodes.BLUEPRINT_NOT_FOUND, message: 'Template not found', timestamp: new Date().toISOString() } },
        { status: 404 }
      );
    }

    const template = templateResult.template;

    if (template.visibility === Visibility.PUBLIC) {
      return NextResponse.json(
        { success: false, error: { code: CollaborationErrorCodes.PERMISSION_DENIED, message: 'Cannot add collaborators to public templates', timestamp: new Date().toISOString() } },
        { status: 400 }
      );
    }

    const { createAdminClient } = await import('@/lib/pocketbase');
    const adminPb = await createAdminClient();

    if (!adminPb.authStore.isValid) {
      return NextResponse.json(
        { success: false, error: { code: CollaborationErrorCodes.UNKNOWN_ERROR, message: 'Server configuration error: Admin authentication failed', timestamp: new Date().toISOString() } },
        { status: 500 }
      );
    }

    const result = await collaborationService.invite({
      blueprintId: templateId,
      email: body.email,
      permissionLevel: body.permissionLevel,
    }, { userLookupDb: adminPb });

    if (!result.success || !result.collaborator) {
      const statusCode = getStatusCodeForError(result.error?.code);
      return NextResponse.json(
        { success: false, error: { code: result.error?.code ?? CollaborationErrorCodes.UNKNOWN_ERROR, message: result.error?.message ?? 'Failed to invite collaborator', details: result.error?.details, timestamp: new Date().toISOString() } },
        { status: statusCode }
      );
    }

    const collaborator: CollaboratorResponse = {
      id: result.collaborator.id,
      templateId: result.collaborator.blueprint,
      userId: result.collaborator.user,
      permissionLevel: result.collaborator.permissionLevel,
      invitedAt: result.collaborator.invitedAt,
      acceptedAt: result.collaborator.acceptedAt,
    };

    return NextResponse.json({ success: true, collaborator }, { status: 201 });
  } catch (error) {
    console.error('Invite collaborator error:', error);
    return NextResponse.json(
      { success: false, error: { code: CollaborationErrorCodes.UNKNOWN_ERROR, message: 'An unexpected error occurred', timestamp: new Date().toISOString() } },
      { status: 500 }
    );
  }
}
