/**
 * Collaborator by ID API Routes
 * 
 * PUT /api/collaborators/[id] - Update a collaborator's permission level
 * DELETE /api/collaborators/[id] - Revoke a collaborator's access
 * 
 * Requirements: 4.5, 4.6
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/server-auth';
import { CollaborationService, CollaborationErrorCodes } from '@/lib/services/collaboration';
import { PermissionLevel } from '@/lib/pocketbase-types';

// ============================================================================
// Types
// ============================================================================

interface UpdateCollaboratorRequestBody {
  permissionLevel: PermissionLevel;
}

interface CollaboratorResponse {
  id: string;
  blueprintId: string;
  userId: string;
  permissionLevel: string;
  invitedAt: string;
  acceptedAt: string | null;
}

interface UpdateCollaboratorResponse {
  success: boolean;
  collaborator?: CollaboratorResponse;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    timestamp: string;
  };
}

interface DeleteCollaboratorResponse {
  success: boolean;
  error?: {
    code: string;
    message: string;
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
      return 400;
    case CollaborationErrorCodes.NOT_AUTHENTICATED:
      return 401;
    case CollaborationErrorCodes.PERMISSION_DENIED:
      return 403;
    case CollaborationErrorCodes.NOT_FOUND:
      return 404;
    default:
      return 500;
  }
}

// ============================================================================
// PUT /api/collaborators/[id]
// ============================================================================

/**
 * Update a collaborator's permission level
 * 
 * Requirements: 4.5
 * 
 * Access rules:
 * - Owner: can update any collaborator's permission
 * - Admin collaborator: can update other collaborators' permissions
 */
export async function PUT(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse<UpdateCollaboratorResponse>> {
  try {
    const { id: collaboratorId } = await context.params;

    // Require authentication
    const { isAuthenticated, user, pb } = await getServerAuth();

    if (!isAuthenticated || !user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: CollaborationErrorCodes.NOT_AUTHENTICATED,
            message: 'Authentication required',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json() as UpdateCollaboratorRequestBody;

    // Validate required fields
    if (!body.permissionLevel) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: CollaborationErrorCodes.INVALID_PERMISSION,
            message: 'Permission level is required',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 }
      );
    }

    // Create service
    const collaborationService = new CollaborationService(pb);

    // Update the collaborator's permission
    const result = await collaborationService.updatePermission(
      collaboratorId,
      body.permissionLevel
    );

    if (!result.success || !result.collaborator) {
      const statusCode = getStatusCodeForError(result.error?.code);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: result.error?.code ?? CollaborationErrorCodes.UNKNOWN_ERROR,
            message: result.error?.message ?? 'Failed to update collaborator',
            details: result.error?.details,
            timestamp: new Date().toISOString(),
          },
        },
        { status: statusCode }
      );
    }

    // Format response
    const collaborator: CollaboratorResponse = {
      id: result.collaborator.id,
      blueprintId: result.collaborator.blueprint,
      userId: result.collaborator.user,
      permissionLevel: result.collaborator.permissionLevel,
      invitedAt: result.collaborator.invitedAt,
      acceptedAt: result.collaborator.acceptedAt,
    };

    return NextResponse.json({
      success: true,
      collaborator,
    });
  } catch (error) {
    console.error('Update collaborator error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: CollaborationErrorCodes.UNKNOWN_ERROR,
          message: 'An unexpected error occurred',
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE /api/collaborators/[id]
// ============================================================================

/**
 * Revoke a collaborator's access
 * 
 * Requirements: 4.6
 * 
 * Access rules:
 * - Owner: can revoke any collaborator's access
 * - Admin collaborator: can revoke other collaborators' access
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse<DeleteCollaboratorResponse>> {
  try {
    const { id: collaboratorId } = await context.params;

    // Require authentication
    const { isAuthenticated, user, pb } = await getServerAuth();

    if (!isAuthenticated || !user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: CollaborationErrorCodes.NOT_AUTHENTICATED,
            message: 'Authentication required',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 401 }
      );
    }

    // Create service
    const collaborationService = new CollaborationService(pb);

    // Revoke the collaborator's access
    const result = await collaborationService.revoke(collaboratorId);

    if (!result.success) {
      const statusCode = getStatusCodeForError(result.error?.code);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: result.error?.code ?? CollaborationErrorCodes.UNKNOWN_ERROR,
            message: result.error?.message ?? 'Failed to revoke collaborator access',
            timestamp: new Date().toISOString(),
          },
        },
        { status: statusCode }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete collaborator error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: CollaborationErrorCodes.UNKNOWN_ERROR,
          message: 'An unexpected error occurred',
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}
