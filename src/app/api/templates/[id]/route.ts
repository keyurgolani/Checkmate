/**
 * Template by ID API Routes
 *
 * GET /api/templates/[id] - Get a specific template
 * PUT /api/templates/[id] - Update a template
 * DELETE /api/templates/[id] - Delete a template
 *
 * Requirements: 3.1, 4.1, 4.2, 7.6
 */

import { NextResponse } from 'next/server';
import { TemplateService, TemplateErrorCodes } from '@/lib/services/template';
import { CollaborationService } from '@/lib/services/collaboration';
import { Visibility, PermissionLevel } from '@/lib/pocketbase-types';
import type { ResourceLink } from '@/lib/pocketbase-types';
import { apiError, withAuth, withPublicAccess } from '@/lib/api/route-helpers';

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
export const GET = withPublicAccess<{ id: string }, TemplateResponse>(
  { tag: 'Get template', unknownCode: TemplateErrorCodes.UNKNOWN_ERROR },
  async ({ params, isAuthenticated, user, pb }) => {
    const { id } = params;

    const templateService = new TemplateService(pb);
    const collaborationService = new CollaborationService(pb);

    const result = await templateService.getById(id);
    if (!result.success || !result.template) {
      return apiError(TemplateErrorCodes.NOT_FOUND, 'Template not found', 404);
    }

    const template = result.template;

    if (template.visibility === Visibility.PUBLIC) {
      return NextResponse.json<TemplateResponse>({
        success: true,
        template: formatTemplate(template as any),
      });
    }

    // Private/shared templates require authentication
    if (!isAuthenticated || !user) {
      return apiError(TemplateErrorCodes.NOT_FOUND, 'Template not found', 404);
    }

    if (template.owner === user.id) {
      return NextResponse.json<TemplateResponse>({
        success: true,
        template: formatTemplate(template as any),
      });
    }

    if (template.visibility === Visibility.SHARED) {
      const hasAccess = await collaborationService.hasPermission(
        id,
        user.id,
        PermissionLevel.VIEWER
      );
      if (hasAccess) {
        return NextResponse.json<TemplateResponse>({
          success: true,
          template: formatTemplate(template as any),
        });
      }
    }

    return apiError(TemplateErrorCodes.NOT_FOUND, 'Template not found', 404);
  }
);

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
export const PUT = withAuth<{ id: string }, TemplateResponse>(
  {
    tag: 'Update template',
    unknownCode: TemplateErrorCodes.UNKNOWN_ERROR,
    unauthorizedCode: TemplateErrorCodes.PERMISSION_DENIED,
  },
  async ({ req, params, user, pb }) => {
    const { id } = params;
    const body = (await req.json()) as UpdateTemplateRequestBody;

    const templateService = new TemplateService(pb);
    const collaborationService = new CollaborationService(pb);

    const getResult = await templateService.getById(id);
    if (!getResult.success || !getResult.template) {
      return apiError(TemplateErrorCodes.NOT_FOUND, 'Template not found', 404);
    }

    const template = getResult.template;
    const isOwner = template.owner === user.id;
    const hasEditPermission =
      isOwner ||
      (await collaborationService.hasPermission(id, user.id, PermissionLevel.EDITOR));

    if (!hasEditPermission) {
      return apiError(
        TemplateErrorCodes.PERMISSION_DENIED,
        'You do not have permission to update this template',
        403
      );
    }

    const result = await templateService.update(id, {
      title: body.title,
      description: body.description,
      category: body.category,
      tags: body.tags,
      questions: body.questions,
      resources: body.resources,
    });

    if (!result.success || !result.template) {
      return apiError(
        result.error?.code ?? TemplateErrorCodes.UNKNOWN_ERROR,
        result.error?.message ?? 'Failed to update template',
        getStatusCodeForError(result.error?.code),
        result.error?.details
      );
    }

    return NextResponse.json<TemplateResponse>({
      success: true,
      template: formatTemplate(result.template as any),
    });
  }
);

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
export const DELETE = withAuth<{ id: string }, { success: boolean }>(
  {
    tag: 'Delete template',
    unknownCode: TemplateErrorCodes.UNKNOWN_ERROR,
    unauthorizedCode: TemplateErrorCodes.PERMISSION_DENIED,
  },
  async ({ params, user, pb }) => {
    const { id } = params;

    const templateService = new TemplateService(pb);

    const getResult = await templateService.getById(id);
    if (!getResult.success || !getResult.template) {
      return apiError(TemplateErrorCodes.NOT_FOUND, 'Template not found', 404);
    }

    if (getResult.template.owner !== user.id) {
      return apiError(
        TemplateErrorCodes.PERMISSION_DENIED,
        'Only the owner can delete a template',
        403
      );
    }

    const result = await templateService.delete(id);
    if (!result.success) {
      return apiError(
        result.error?.code ?? TemplateErrorCodes.UNKNOWN_ERROR,
        result.error?.message ?? 'Failed to delete template',
        getStatusCodeForError(result.error?.code)
      );
    }

    return NextResponse.json({ success: true });
  }
);
