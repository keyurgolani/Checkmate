/**
 * Template Visibility API Route
 * 
 * PUT /api/templates/[id]/visibility - Update template visibility
 * 
 * Requirements: 4.1, 4.2, 4.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/server-auth';
import { TemplateService, TemplateErrorCodes } from '@/lib/services/template';
import { Visibility } from '@/lib/pocketbase-types';

interface UpdateVisibilityRequestBody {
  visibility: Visibility;
}

interface VisibilityResponse {
  success: boolean;
  template?: { id: string; workspaceId: string; ownerId: string; title: string; description: string | null; visibility: string; category: string | null; tags: string[] | null; version: number; instanceCount: number; createdAt: string; updatedAt: string };
  error?: { code: string; message: string; details?: Record<string, unknown>; timestamp: string };
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

function getStatusCodeForError(errorCode: string | undefined): number {
  switch (errorCode) {
    case TemplateErrorCodes.INVALID_VISIBILITY:
    case TemplateErrorCodes.VALIDATION_ERROR:
    case TemplateErrorCodes.SHARED_REQUIRES_COLLABORATORS: return 400;
    case TemplateErrorCodes.PERMISSION_DENIED: return 403;
    case TemplateErrorCodes.NOT_FOUND: return 404;
    default: return 500;
  }
}

function formatTemplate(template: any) {
  return { id: template.id, workspaceId: template.workspace, ownerId: template.owner, title: template.title, description: template.description, visibility: template.visibility, category: template.category, tags: template.tags, version: template.version, instanceCount: template.instanceCount, createdAt: template.created, updatedAt: template.updated };
}

export async function PUT(request: NextRequest, context: RouteContext): Promise<NextResponse<VisibilityResponse>> {
  try {
    const { id } = await context.params;
    const { isAuthenticated, user, pb } = await getServerAuth();

    if (!isAuthenticated || !user) {
      return NextResponse.json({ success: false, error: { code: TemplateErrorCodes.PERMISSION_DENIED, message: 'Authentication required', timestamp: new Date().toISOString() } }, { status: 401 });
    }

    const body = await request.json() as UpdateVisibilityRequestBody;

    if (!body.visibility) {
      return NextResponse.json({ success: false, error: { code: TemplateErrorCodes.VALIDATION_ERROR, message: 'visibility is required', timestamp: new Date().toISOString() } }, { status: 400 });
    }

    const validVisibilities = Object.values(Visibility);
    if (!validVisibilities.includes(body.visibility)) {
      return NextResponse.json({ success: false, error: { code: TemplateErrorCodes.INVALID_VISIBILITY, message: `Invalid visibility value. Must be one of: ${validVisibilities.join(', ')}`, details: { providedValue: body.visibility, allowedValues: validVisibilities }, timestamp: new Date().toISOString() } }, { status: 400 });
    }

    const templateService = new TemplateService(pb);
    const result = await templateService.setVisibility(id, body.visibility);

    if (!result.success || !result.template) {
      const statusCode = getStatusCodeForError(result.error?.code);
      return NextResponse.json({ success: false, error: { code: result.error?.code ?? TemplateErrorCodes.UNKNOWN_ERROR, message: result.error?.message ?? 'Failed to update visibility', details: result.error?.details, timestamp: new Date().toISOString() } }, { status: statusCode });
    }

    return NextResponse.json({ success: true, template: formatTemplate(result.template) });
  } catch (error) {
    console.error('Update visibility error:', error);
    return NextResponse.json({ success: false, error: { code: TemplateErrorCodes.UNKNOWN_ERROR, message: 'An unexpected error occurred', timestamp: new Date().toISOString() } }, { status: 500 });
  }
}
