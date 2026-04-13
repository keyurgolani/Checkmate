/**
 * Template Import API Route
 *
 * POST /api/templates/import - Import a template from JSON format
 *
 * Requirements: 11.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/server-auth';
import { ExportService, ImportErrorCodes } from '@/lib/services/export';
import type { ExportFormat } from '@/lib/services/export';

// ============================================================================
// Types
// ============================================================================

interface ImportRequestBody {
  /** The import data (JSON string) */
  data: string;
  /** Workspace ID to import into */
  workspaceId: string;
  /** Import format (auto-detected if not specified) */
  format?: ExportFormat;
  /** Override title (optional) */
  title?: string;
  /** Override description (optional) */
  description?: string;
}

interface ImportResponse {
  success: boolean;
  templateId?: string;
  itemCount?: number;
  warnings?: string[];
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
    case ImportErrorCodes.INVALID_FORMAT:
    case ImportErrorCodes.PARSE_ERROR:
    case ImportErrorCodes.VALIDATION_ERROR:
    case ImportErrorCodes.MISSING_REQUIRED_FIELD:
    case ImportErrorCodes.INVALID_ITEM_STRUCTURE:
    case ImportErrorCodes.UNSUPPORTED_VERSION:
      return 400;
    case ImportErrorCodes.PERMISSION_DENIED:
      return 403;
    case ImportErrorCodes.WORKSPACE_NOT_FOUND:
      return 404;
    default:
      return 500;
  }
}

// ============================================================================
// POST /api/templates/import
// ============================================================================

/**
 * Import a template from JSON format
 *
 * Request body:
 * - data: The import data (JSON string)
 * - workspaceId: Workspace ID to import into
 * - format: Must be 'json' if specified (only JSON import is supported)
 * - title: Override title (optional)
 * - description: Override description (optional)
 *
 * Requirements: 11.3
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ImportResponse>> {
  try {
    // Require authentication
    const { isAuthenticated, pb } = await getServerAuth();

    if (!isAuthenticated) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ImportErrorCodes.PERMISSION_DENIED,
            message: 'Authentication required to import templates',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 401 }
      );
    }

    // Parse request body
    let body: ImportRequestBody;
    try {
      body = await request.json() as ImportRequestBody;
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ImportErrorCodes.PARSE_ERROR,
            message: 'Invalid JSON in request body',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!body.data) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ImportErrorCodes.MISSING_REQUIRED_FIELD,
            message: 'data is required',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 }
      );
    }

    if (!body.workspaceId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ImportErrorCodes.MISSING_REQUIRED_FIELD,
            message: 'workspaceId is required',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 }
      );
    }

    // Only JSON import is supported
    if (body.format && body.format !== 'json') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ImportErrorCodes.INVALID_FORMAT,
            message: `Only JSON import is supported. CSV and Markdown exports are for personal use only.`,
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 }
      );
    }

    // Force JSON format
    body.format = 'json';

    // Create export service with authenticated client
    const exportService = new ExportService(pb);

    // Import the template
    const result = await exportService.importBlueprint(body.data, {
      workspaceId: body.workspaceId,
      format: body.format,
      title: body.title,
      description: body.description,
    });

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

    return NextResponse.json(
      {
        success: true,
        templateId: result.data.templateId,
        itemCount: result.data.itemCount,
        warnings: result.data.warnings.length > 0 ? result.data.warnings : undefined,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Import template error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: ImportErrorCodes.UNKNOWN_ERROR,
          message: 'An unexpected error occurred',
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}
