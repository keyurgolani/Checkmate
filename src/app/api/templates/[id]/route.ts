/**
 * Template by ID API Routes
 * 
 * GET /api/templates/[id] - Get a specific template
 * PUT /api/templates/[id] - Update a template
 * DELETE /api/templates/[id] - Delete a template
 * 
 * Requirements: 3.1, 4.1, 4.2, 7.6
 */


// Force rebuild - Syntax fix applied
import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/server-auth';
import { TemplateService, TemplateErrorCodes } from '@/lib/services/template';
import { CollaborationService } from '@/lib/services/collaboration';
import { Visibility, PermissionLevel } from '@/lib/pocketbase-types';
import type { ResourceLink } from '@/lib/pocketbase-types';

// ============================================================================
// Types
// ============================================================================

interface UpdateTemplateRequestBody {
  title?: string;
  description?: string;
  category?: string;
  tags?: string[];
  questions?: Array<{
    id: string;
    question: string;
    answerType: 'boolean' | 'enum';
    enumOptions?: string[];
    defaultValue?: boolean | string;
  }>;
  resources?: ResourceLink[];
}

interface TemplateResponse {
  success: boolean;
  template?: {
    id: string;
    workspaceId: string;
    ownerId: string;
    title: string;
    description: string | null;
    resources: ResourceLink[] | null;
    visibility: string;
    category: string | null;
    tags: string[] | null;
    version: number;
    instanceCount: number;
    questions: Array<{
      id: string;
      question: string;
      answerType: 'boolean' | 'enum';
      enumOptions?: string[];
      defaultValue?: boolean | string;
    }> | null;
    createdAt: string;
    updatedAt: string;
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
    case TemplateErrorCodes.TITLE_REQUIRED:
    case TemplateErrorCodes.TITLE_TOO_LONG:
    case TemplateErrorCodes.INVALID_VISIBILITY:
    case TemplateErrorCodes.VALIDATION_ERROR:
    case TemplateErrorCodes.SHARED_REQUIRES_COLLABORATORS:
      return 400;
    case TemplateErrorCodes.PERMISSION_DENIED:
      return 403;
    case TemplateErrorCodes.NOT_FOUND:
    case TemplateErrorCodes.WORKSPACE_NOT_FOUND:
      return 404;
    default:
      return 500;
  }
}

function formatTemplate(template: {
  id: string;
  workspace: string;
  owner: string;
  title: string;
  description: string | null;
  resources: ResourceLink[] | null;
  visibility: string;
  category: string | null;
  tags: string[] | null;
  version: number;
  instanceCount: number;
  questions?: Array<{
    id: string;
    question: string;
    answerType: 'boolean' | 'enum';
    enumOptions?: string[];
    defaultValue?: boolean | string;
  }> | null;
  created: string;
  updated: string;
}) {
  return {
    id: template.id,
    workspaceId: template.workspace,
    ownerId: template.owner,
    title: template.title,
    description: template.description,
    resources: template.resources,
    visibility: template.visibility,
    category: template.category,
    tags: template.tags,
    version: template.version,
    instanceCount: template.instanceCount,
    questions: template.questions ?? null,
    createdAt: template.created,
    updatedAt: template.updated,
  };
}

// ============================================================================
// GET /api/templates/[id]
// ============================================================================

/**
 * Get a specific template by ID
 * 
 * Access rules (Requirements: 4.1, 4.2):
 * - Public templates: accessible to everyone
 * - Private templates: only accessible to owner
 * - Shared templates: accessible to owner and collaborators
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse<TemplateResponse>> {
  try {
    const { id } = await context.params;

    // Get auth context
    const { isAuthenticated, user, pb } = await getServerAuth();

    // Create services with authenticated PocketBase client
    const templateService = new TemplateService(pb);
    const collaborationService = new CollaborationService(pb);

    // Get the template
    const result = await templateService.getById(id);

    if (!result.success || !result.template) {
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

    const template = result.template;

    // Check access based on visibility
    if (template.visibility === Visibility.PUBLIC) {
      // Public templates are accessible to everyone
      return NextResponse.json({
        success: true,
        template: formatTemplate(template as any),
      });
    }

    // For private and shared templates, require authentication
    if (!isAuthenticated || !user) {
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

    // Check if user is the owner
    if (template.owner === user.id) {
      return NextResponse.json({
        success: true,
        template: formatTemplate(template as any),
      });
    }

    // For shared templates, check if user is a collaborator
    if (template.visibility === Visibility.SHARED) {
      const hasAccess = await collaborationService.hasPermission(
        id,
        user.id,
        PermissionLevel.VIEWER
      );

      if (hasAccess) {
        return NextResponse.json({
          success: true,
          template: formatTemplate(template as any),
        });
      }
    }

    // User doesn't have access - return 404 to not reveal existence
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
  } catch (error) {
    console.error('Get template error:', error);
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

// ============================================================================
// PUT /api/templates/[id]
// ============================================================================

/**
 * Update a template
 * 
 * Access rules:
 * - Owner: can update all fields
 * - Editor collaborator: can update title, description, category, tags
 * - Viewer collaborator: cannot update
 */
export async function PUT(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse<TemplateResponse>> {
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
            message: 'Authentication required',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json() as UpdateTemplateRequestBody;

    // Create services
    const templateService = new TemplateService(pb);
    const collaborationService = new CollaborationService(pb);

    // Get the template to check ownership/permissions
    const getResult = await templateService.getById(id);

    if (!getResult.success || !getResult.template) {
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

    const template = getResult.template;

    // Check if user has edit permission
    const isOwner = template.owner === user.id;
    const hasEditPermission = isOwner || await collaborationService.hasPermission(
      id,
      user.id,
      PermissionLevel.EDITOR
    );

    if (!hasEditPermission) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: TemplateErrorCodes.PERMISSION_DENIED,
            message: 'You do not have permission to update this template',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 403 }
      );
    }

    // Update the template
    const result = await templateService.update(id, {
      title: body.title,
      description: body.description,
      category: body.category,
      tags: body.tags,
      questions: body.questions,
      resources: body.resources,
    });

    if (!result.success || !result.template) {
      const statusCode = getStatusCodeForError(result.error?.code);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: result.error?.code ?? TemplateErrorCodes.UNKNOWN_ERROR,
            message: result.error?.message ?? 'Failed to update template',
            details: result.error?.details,
            timestamp: new Date().toISOString(),
          },
        },
        { status: statusCode }
      );
    }

    return NextResponse.json({
      success: true,
      template: formatTemplate(result.template as any),
    });
  } catch (error) {
    console.error('Update template error:', error);
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

// ============================================================================
// DELETE /api/templates/[id]
// ============================================================================

/**
 * Delete a template
 * 
 * Requirements: 7.6 - Converts references to copies when template is deleted
 * 
 * Access rules:
 * - Only the owner can delete a template
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
            code: TemplateErrorCodes.PERMISSION_DENIED,
            message: 'Authentication required',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 401 }
      );
    }

    // Create service
    const templateService = new TemplateService(pb);

    // Get the template to check ownership
    const getResult = await templateService.getById(id);

    if (!getResult.success || !getResult.template) {
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

    // Only owner can delete
    if (getResult.template.owner !== user.id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: TemplateErrorCodes.PERMISSION_DENIED,
            message: 'Only the owner can delete a template',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 403 }
      );
    }

    // Delete the template (this handles reference conversion per Requirements 7.6)
    const result = await templateService.delete(id);

    if (!result.success) {
      const statusCode = getStatusCodeForError(result.error?.code);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: result.error?.code ?? TemplateErrorCodes.UNKNOWN_ERROR,
            message: result.error?.message ?? 'Failed to delete template',
            timestamp: new Date().toISOString(),
          },
        },
        { status: statusCode }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete template error:', error);
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
