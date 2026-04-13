/**
 * Accept Collaboration Invitation API Route
 * 
 * POST /api/collaborators/[id]/accept - Accept a collaboration invitation
 * 
 * Requirements: 4.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/server-auth';
import { CollaborationService, CollaborationErrorCodes } from '@/lib/services/collaboration';

// ============================================================================
// Types
// ============================================================================

interface CollaboratorResponse {
  id: string;
  blueprintId: string;
  userId: string;
  permissionLevel: string;
  invitedAt: string;
  acceptedAt: string | null;
}

interface AcceptInvitationResponse {
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
    case CollaborationErrorCodes.ALREADY_ACCEPTED:
      return 400;
    case CollaborationErrorCodes.NOT_AUTHENTICATED:
      return 401;
    case CollaborationErrorCodes.PERMISSION_DENIED:
      return 403;
    case CollaborationErrorCodes.INVITATION_NOT_FOUND:
      return 404;
    default:
      return 500;
  }
}

// ============================================================================
// POST /api/collaborators/[id]/accept
// ============================================================================

/**
 * Accept a collaboration invitation
 * 
 * Requirements: 4.4
 * 
 * Access rules:
 * - Only the invited user can accept their own invitation
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse<AcceptInvitationResponse>> {
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

    // Accept the invitation
    const result = await collaborationService.acceptInvitation(collaboratorId);

    if (!result.success) {
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

    // Format response
    const collaborator: CollaboratorResponse = {
      id: result.data.id,
      blueprintId: result.data.blueprint,
      userId: result.data.user,
      permissionLevel: result.data.permissionLevel,
      invitedAt: result.data.invitedAt,
      acceptedAt: result.data.acceptedAt,
    };

    return NextResponse.json({
      success: true,
      collaborator,
    });
  } catch (error) {
    console.error('Accept invitation error:', error);
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
