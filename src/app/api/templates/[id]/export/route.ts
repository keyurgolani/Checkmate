/**
 * Template Export API Route
 * 
 * GET /api/templates/[id]/export - Export a template in various formats
 * 
 * Requirements: 11.1, 11.2
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/server-auth';
import { TemplateService, TemplateErrorCodes } from '@/lib/services/template';
import { CollaborationService } from '@/lib/services/collaboration';
import { ExportService, ExportErrorCodes, MIME_TYPES } from '@/lib/services/export';
import type { ExportFormat } from '@/lib/services/export';
import { Visibility, PermissionLevel } from '@/lib/pocketbase-types';

interface ExportResponse {
  success: boolean;
  error?: { code: string; message: string; details?: Record<string, unknown>; timestamp: string };
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

function getStatusCodeForError(errorCode: string | undefined): number {
  switch (errorCode) {
    case ExportErrorCodes.INVALID_FORMAT: return 400;
    case ExportErrorCodes.PERMISSION_DENIED: return 403;
    case ExportErrorCodes.BLUEPRINT_NOT_FOUND: return 404;
    default: return 500;
  }
}

export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse<ExportResponse | Blob>> {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const format = (searchParams.get('format') || 'json') as ExportFormat;
    const includeMetadata = searchParams.get('includeMetadata') !== 'false';
    const expandReferences = searchParams.get('expandReferences') === 'true';

    if (!['json', 'csv', 'markdown'].includes(format)) {
      return NextResponse.json({ success: false, error: { code: ExportErrorCodes.INVALID_FORMAT, message: `Invalid export format: ${format}`, timestamp: new Date().toISOString() } }, { status: 400 });
    }

    const { isAuthenticated, user, pb } = await getServerAuth();
    const templateService = new TemplateService(pb);
    const collaborationService = new CollaborationService(pb);
    const exportService = new ExportService(pb);

    const templateResult = await templateService.getById(id);
    if (!templateResult.success || !templateResult.template) {
      return NextResponse.json({ success: false, error: { code: ExportErrorCodes.BLUEPRINT_NOT_FOUND, message: 'Template not found', timestamp: new Date().toISOString() } }, { status: 404 });
    }

    const template = templateResult.template;
    let hasAccess = false;

    if (template.visibility === Visibility.PUBLIC) {
      hasAccess = true;
    } else if (isAuthenticated && user) {
      if (template.owner === user.id) {
        hasAccess = true;
      } else if (template.visibility === Visibility.SHARED) {
        hasAccess = await collaborationService.hasPermission(id, user.id, PermissionLevel.VIEWER);
      }
    }

    if (!hasAccess) {
      return NextResponse.json({ success: false, error: { code: ExportErrorCodes.BLUEPRINT_NOT_FOUND, message: 'Template not found', timestamp: new Date().toISOString() } }, { status: 404 });
    }

    const exportResult = await exportService.exportBlueprint(id, { format, includeMetadata, expandReferences });
    if (!exportResult.success || !exportResult.data) {
      const statusCode = getStatusCodeForError(exportResult.error?.code);
      return NextResponse.json({ success: false, error: { code: exportResult.error?.code ?? ExportErrorCodes.EXPORT_FAILED, message: exportResult.error?.message ?? 'Failed to export template', details: exportResult.error?.details, timestamp: new Date().toISOString() } }, { status: statusCode });
    }

    const mimeType = exportResult.mimeType ?? MIME_TYPES[format];
    const filename = exportResult.filename ?? `template-${id}.${format}`;

    return new NextResponse(exportResult.data, { status: 200, headers: { 'Content-Type': mimeType, 'Content-Disposition': `attachment; filename="${filename}"` } });
  } catch (error) {
    console.error('Export template error:', error);
    return NextResponse.json({ success: false, error: { code: ExportErrorCodes.UNKNOWN_ERROR, message: 'An unexpected error occurred', timestamp: new Date().toISOString() } }, { status: 500 });
  }
}
