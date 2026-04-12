/**
 * Export/Import Service
 * 
 * Provides export functionality for checklist blueprints in multiple formats:
 * - JSON: Full structured data with all metadata
 * - CSV: Flat tabular format for spreadsheet compatibility
 * - Markdown: Human-readable format for documentation
 * 
 * Also provides import functionality to create blueprints from exported data:
 * - JSON: Parse and validate exported JSON format
 * - CSV: Parse tabular data into blueprint structure
 * - Markdown: Parse markdown checklist format
 * 
 * Requirements: 11.1, 11.2, 11.3
 */

import PocketBase from 'pocketbase';
import { getPocketBaseClient } from '../pocketbase';
import { makeServiceAccessor } from './_service-factory';
import type {
  Blueprint,
  Item,
  ItemCreate,
  ItemMetadata,
  TemplateQuestion,
  User,
} from '../pocketbase-types';
import { Collections, ItemType, Visibility } from '../pocketbase-types';
import {
  type ExportFormat,
  type ExportedItem,
  EXPORT_VERSION,
  MIME_TYPES,
  FILE_EXTENSIONS,
  sanitizeFilename,
  escapeCSV,
  getPathDepth,
  buildItemTree,
  flattenItems,
} from './export/utils';
import {
  type ImportError,
  type ImportResult,
  type ImportValidationResult,
  type ParsedImportItem,
  ImportErrorCodes,
  createImportSuccessResult,
  createImportErrorResult,
  detectImportFormat,
  parseJSONImport,
  parseCSVImport,
  parseMarkdownImport,
} from './export/import-parsers';

// Re-export foundational types/constants so external consumers can
// keep importing them from `@/lib/services/export`.
// Note: getPathDepth is intentionally not re-exported here — ItemService
// exports its own getPathDepth and re-exporting would create an
// ambiguous re-export through services/index.ts.
export type { ExportFormat, ExportedItem } from './export/utils';
export {
  EXPORT_VERSION,
  MIME_TYPES,
  FILE_EXTENSIONS,
  sanitizeFilename,
  escapeCSV,
  buildItemTree,
  flattenItems,
} from './export/utils';
export type {
  ImportError,
  ImportResult,
  ImportValidationResult,
  ParsedImportData,
  ParsedImportItem,
} from './export/import-parsers';
export {
  ImportErrorCodes,
  createImportSuccessResult,
  createImportErrorResult,
  detectImportFormat,
  parseJSONImport,
  parseCSVImport,
  parseMarkdownImport,
} from './export/import-parsers';

// ============================================================================
// Types
// ============================================================================

/**
 * Export options
 */
export interface ExportOptions {
  /** Export format */
  format: ExportFormat;
  /** Include metadata (timestamps, IDs, etc.) */
  includeMetadata?: boolean;
  /** Include expanded references (inline referenced blueprint items) */
  expandReferences?: boolean;
}

/**
 * Exported blueprint structure (for JSON export)
 */
export interface ExportedBlueprint {
  /** Export format version for future compatibility */
  exportVersion: string;
  /** Export timestamp */
  exportedAt: string;
  /** Blueprint data */
  template: {
    id: string;
    title: string;
    description: string | null;
    category: string | null;
    tags: string[] | null;
    visibility: string;
    version: number;
    questions: TemplateQuestion[] | null;
    createdAt: string;
    updatedAt: string;
    owner?: {
      id: string;
      displayName: string | null;
      email?: string;
    };
  };
  /** Items in hierarchical structure */
  items: ExportedItem[];
  /** Flat list of all items (for easier processing) */
  itemsFlat: ExportedItem[];
  /** Statistics */
  stats: {
    totalItems: number;
    taskCount: number;
    referenceCount: number;
    phaseCount: number;
    maxDepth: number;
  };
}

/**
 * Export result
 */
export interface ExportResult {
  success: boolean;
  data: string | null;
  filename: string | null;
  mimeType: string | null;
  error: ExportError | null;
}

/**
 * Export error
 */
export interface ExportError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// Import Types
// ============================================================================

/**
 * Import options
 */
export interface ImportOptions {
  /** Import format (auto-detected if not specified) */
  format?: ExportFormat;
  /** Workspace ID to import into */
  workspaceId: string;
  /** Override title (optional) */
  title?: string;
  /** Override description (optional) */
  description?: string;
}

// ============================================================================
// Export Error Codes
// ============================================================================

export const ExportErrorCodes = {
  BLUEPRINT_NOT_FOUND: 'EXPORT_001',
  PERMISSION_DENIED: 'EXPORT_002',
  INVALID_FORMAT: 'EXPORT_003',
  EXPORT_FAILED: 'EXPORT_004',
  UNKNOWN_ERROR: 'EXPORT_999',
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Creates a successful ExportResult
 */
function createSuccessResult(
  data: string,
  filename: string,
  mimeType: string
): ExportResult {
  return {
    success: true,
    data,
    filename,
    mimeType,
    error: null,
  };
}

/**
 * Creates an error ExportResult
 */
function createErrorResult(error: ExportError): ExportResult {
  return {
    success: false,
    data: null,
    filename: null,
    mimeType: null,
    error,
  };
}

// Note: file helpers (sanitizeFilename, escapeCSV, getPathDepth,
// buildItemTree, flattenItems) and all import parsers live in
// ./export/utils and ./export/import-parsers. They are re-exported at
// the top of this file for backward compatibility.


// ============================================================================
// Export Service Class
// ============================================================================

/**
 * Export Service
 * 
 * Provides methods for exporting checklist blueprints in various formats.
 */
export class ExportService {
  private pb: PocketBase;

  constructor(pb?: PocketBase) {
    this.pb = pb ?? getPocketBaseClient();
  }

  /**
   * Exports a blueprint in the specified format.
   * 
   * Requirements: 11.1, 11.2
   * 
   * @param blueprintId - Blueprint ID to export
   * @param options - Export options (format, includeMetadata, expandReferences)
   * @returns ExportResult with exported data
   */
  async exportBlueprint(
    blueprintId: string,
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      // Validate format
      if (!['json', 'csv', 'markdown'].includes(options.format)) {
        return createErrorResult({
          code: ExportErrorCodes.INVALID_FORMAT,
          message: `Invalid export format: ${options.format}. Must be one of: json, csv, markdown`,
        });
      }

      // Fetch blueprint with owner expansion
      let template: Blueprint;
      try {
        template = await this.pb
          .collection(Collections.TEMPLATES)
          .getOne<Blueprint>(blueprintId, {
            expand: 'owner',
          });
      } catch {
        return createErrorResult({
          code: ExportErrorCodes.BLUEPRINT_NOT_FOUND,
          message: 'Blueprint not found or you do not have access',
        });
      }

      // Fetch all items for the blueprint
      const items = await this.pb
        .collection(Collections.ITEMS)
        .getFullList<Item>({
          filter: `blueprint = "${blueprintId}"`,
          sort: 'path,position',
          expand: 'reference',
        });

      // Build hierarchical structure
      const itemTree = buildItemTree(items);
      const itemsFlat = flattenItems(itemTree);

      // Add referenced blueprint titles if available
      for (const item of itemsFlat) {
        if (item.referenceId) {
          const originalItem = items.find(i => i.id === item.id);
          if (originalItem?.expand?.reference) {
            item.referencedBlueprintTitle = originalItem.expand.reference.title;
          }
        }
      }

      // Also update tree items with reference titles
      const updateTreeReferences = (treeItems: ExportedItem[]) => {
        for (const item of treeItems) {
          if (item.referenceId) {
            const originalItem = items.find(i => i.id === item.id);
            if (originalItem?.expand?.reference) {
              item.referencedBlueprintTitle = originalItem.expand.reference.title;
            }
          }
          if (item.children && item.children.length > 0) {
            updateTreeReferences(item.children);
          }
        }
      };
      updateTreeReferences(itemTree);

      // Calculate statistics
      const stats = {
        totalItems: items.length,
        taskCount: items.filter(i => i.itemType === ItemType.TASK).length,
        referenceCount: items.filter(i => i.itemType === ItemType.REFERENCE).length,
        phaseCount: items.filter(i => i.itemType === ItemType.PHASE).length,
        maxDepth: items.reduce((max, item) => Math.max(max, getPathDepth(item.path)), 0),
      };

      // Get owner info
      // Get owner info
      const owner = template.expand?.owner as User | undefined;

      // Create exported blueprint structure
      const exportedBlueprint: ExportedBlueprint = {
        exportVersion: EXPORT_VERSION,
        exportedAt: new Date().toISOString(),
        template: {
          id: template.id,
          title: template.title,
          description: template.description,
          category: template.category,
          tags: template.tags,
          visibility: template.visibility,
          version: template.version,
          questions: template.questions || null,
          createdAt: template.created,
          updatedAt: template.updated,
          owner: owner ? {
            id: owner.id,
            displayName: owner.displayName,
          } : undefined,
        },
        items: itemTree,
        itemsFlat,
        stats,
      };

      // Generate filename
      const sanitizedTitle = sanitizeFilename(template.title);
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `${sanitizedTitle}-${timestamp}.${FILE_EXTENSIONS[options.format]}`;

      // Export in the requested format
      switch (options.format) {
        case 'json':
          return this.exportAsJSON(exportedBlueprint, filename);
        case 'csv':
          return this.exportAsCSV(exportedBlueprint, filename, options);
        case 'markdown':
          return this.exportAsMarkdown(exportedBlueprint, filename, options);
        default:
          return createErrorResult({
            code: ExportErrorCodes.INVALID_FORMAT,
            message: `Unsupported format: ${options.format}`,
          });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Export failed';
      return createErrorResult({
        code: ExportErrorCodes.EXPORT_FAILED,
        message,
        details: { error: String(err) },
      });
    }
  }

  /**
   * Exports blueprint as JSON
   */
  private exportAsJSON(
    data: ExportedBlueprint,
    filename: string
  ): ExportResult {
    const jsonString = JSON.stringify(data, null, 2);
    return createSuccessResult(jsonString, filename, MIME_TYPES.json);
  }

  /**
   * Exports blueprint as CSV
   */
  private exportAsCSV(
    data: ExportedBlueprint,
    filename: string,
    options: ExportOptions
  ): ExportResult {
    const rows: string[] = [];

    // Header row
    const headers = [
      'Path',
      'Type',
      'Content',
      'Description',
      'Resources',
      'Position',
      'Parent ID',
      'Reference ID',
      'Referenced Blueprint',
    ];

    if (options.includeMetadata) {
      headers.push('ID', 'Metadata');
    }

    rows.push(headers.map(escapeCSV).join(','));

    // Data rows
    for (const item of data.itemsFlat) {
      const row = [
        item.path,
        item.itemType,
        item.content,
        item.description || '',
        item.resources ? JSON.stringify(item.resources) : '',
        String(item.position),
        item.parentId || '',
        item.referenceId || '',
        item.referencedBlueprintTitle || '',
      ];

      if (options.includeMetadata) {
        row.push(item.id);
        row.push(item.metadata ? JSON.stringify(item.metadata) : '');
      }

      rows.push(row.map(escapeCSV).join(','));
    }

    // Add blueprint metadata as comments at the end
    rows.push('');
    rows.push(`# Blueprint: ${escapeCSV(data.template.title)}`);
    rows.push(`# Description: ${escapeCSV(data.template.description || '')}`);
    rows.push(`# Category: ${escapeCSV(data.template.category || '')}`);
    rows.push(`# Tags: ${escapeCSV(data.template.tags?.join(', ') || '')}`);
    rows.push(`# Total Items: ${data.stats.totalItems}`);
    rows.push(`# Exported: ${data.exportedAt}`);

    const csvString = rows.join('\n');
    return createSuccessResult(csvString, filename, MIME_TYPES.csv);
  }

  /**
   * Exports blueprint as Markdown
   */
  private exportAsMarkdown(
    data: ExportedBlueprint,
    filename: string,
    options: ExportOptions
  ): ExportResult {
    const lines: string[] = [];

    // Title
    lines.push(`# ${data.template.title}`);
    lines.push('');

    // Description
    if (data.template.description) {
      lines.push(data.template.description);
      lines.push('');
    }

    // Metadata section
    if (options.includeMetadata) {
      lines.push('## Metadata');
      lines.push('');
      lines.push(`- **Category:** ${data.template.category || 'None'}`);
      lines.push(`- **Tags:** ${data.template.tags?.join(', ') || 'None'}`);
      lines.push(`- **Version:** ${data.template.version}`);
      lines.push(`- **Created:** ${data.template.createdAt}`);
      lines.push(`- **Updated:** ${data.template.updatedAt}`);
      if (data.template.owner) {
        lines.push(`- **Owner:** ${data.template.owner.displayName || 'Unknown'}`);
      }
      lines.push('');
    }

    // Statistics
    lines.push('## Statistics');
    lines.push('');
    lines.push(`- **Total Items:** ${data.stats.totalItems}`);
    lines.push(`- **Tasks:** ${data.stats.taskCount}`);
    lines.push(`- **References:** ${data.stats.referenceCount}`);
    lines.push(`- **Phases:** ${data.stats.phaseCount}`);
    lines.push(`- **Max Depth:** ${data.stats.maxDepth}`);
    lines.push('');

    // Checklist items
    lines.push('## Checklist Items');
    lines.push('');

    // Render items recursively
    const renderItems = (items: ExportedItem[], depth: number = 0, inPhase: boolean = false) => {
      for (const item of items) {
        if (item.itemType === ItemType.PHASE) {
          // Render phase as a section header
          lines.push('');
          lines.push(`## ${item.content}`);
          lines.push('');
          
          // Include phase description if present
          if (item.description) {
            lines.push(item.description);
            lines.push('');
          }

          // Render phase children as regular items
          if (item.children && item.children.length > 0) {
            renderItems(item.children, 0, true);
          }
        } else {
          const indent = '  '.repeat(depth);
          const checkbox = '- [ ]';
          
          if (item.itemType === ItemType.REFERENCE) {
            // Reference item - show with link indicator
            const refTitle = item.referencedBlueprintTitle 
              ? ` → *${item.referencedBlueprintTitle}*`
              : ' → *(referenced blueprint)*';
            lines.push(`${indent}${checkbox} ${item.content}${refTitle}`);
          } else {
            // Task item
            lines.push(`${indent}${checkbox} ${item.content}`);
          }

          // Include description if present (as blockquote)
          if (item.description) {
            lines.push(`${indent}  > ${item.description}`);
          }

          // Include resources if present (as links)
          if (item.resources && item.resources.length > 0) {
            for (const resource of item.resources) {
              const resourceDesc = resource.description ? ` - ${resource.description}` : '';
              lines.push(`${indent}  - 📎 [${resource.title}](${resource.url})${resourceDesc}`);
            }
          }

          // Render children
          if (item.children && item.children.length > 0) {
            renderItems(item.children, depth + 1, inPhase);
          }
        }
      }
    };

    renderItems(data.items);
    lines.push('');

    // Footer
    lines.push('---');
    lines.push('');
    lines.push(`*Exported from CheckMate on ${new Date(data.exportedAt).toLocaleDateString()}*`);

    const markdownString = lines.join('\n');
    return createSuccessResult(markdownString, filename, MIME_TYPES.markdown);
  }

  /**
   * Gets the underlying PocketBase client.
   */
  getPocketBase(): PocketBase {
    return this.pb;
  }

  // ==========================================================================
  // Import Methods
  // ==========================================================================

  /**
   * Imports a blueprint from data in various formats.
   * 
   * Requirements: 11.3
   * 
   * @param data - The import data (JSON, CSV, or Markdown string)
   * @param options - Import options (workspaceId, optional format override, title, description)
   * @returns ImportResult with created blueprint ID on success
   */
  async importBlueprint(
    data: string,
    options: ImportOptions
  ): Promise<ImportResult> {
    try {
      // Get current user ID
      const userId = this.pb.authStore.record?.id;
      if (!userId) {
        return createImportErrorResult({
          code: ImportErrorCodes.PERMISSION_DENIED,
          message: 'You must be authenticated to import a blueprint',
        });
      }

      // Verify workspace exists and user has access
      try {
        await this.pb.collection(Collections.WORKSPACES).getOne(options.workspaceId);
      } catch {
        return createImportErrorResult({
          code: ImportErrorCodes.WORKSPACE_NOT_FOUND,
          message: 'Workspace not found or you do not have access',
        });
      }

      // Detect or validate format
      const format = options.format || detectImportFormat(data);
      if (!format) {
        return createImportErrorResult({
          code: ImportErrorCodes.INVALID_FORMAT,
          message: 'Could not detect import format. Please specify the format explicitly.',
        });
      }

      // Parse and validate the import data
      const validationResult = this.validateImportData(data, format);
      if (!validationResult.isValid || !validationResult.parsedData) {
        return createImportErrorResult(
          validationResult.errors[0] || {
            code: ImportErrorCodes.VALIDATION_ERROR,
            message: 'Import validation failed',
          }
        );
      }

      const parsedData = validationResult.parsedData;
      const warnings = validationResult.warnings;

      // Apply overrides from options
      const title = options.title || parsedData.title;
      const description = options.description !== undefined 
        ? options.description 
        : parsedData.description;

      // Create the blueprint
      const blueprintData = {
        workspace: options.workspaceId,
        owner: userId,
        title: title.substring(0, 200), // Enforce max length
        description: description || undefined,
        visibility: Visibility.PRIVATE,
        category: parsedData.category || undefined,
        tags: parsedData.tags,
        questions: parsedData.questions || undefined,
        version: 1,
        instanceCount: 0,
        ratingSum: 0,
        ratingCount: 0,
      };

      const blueprint = await this.pb
        .collection(Collections.TEMPLATES)
        .create<Blueprint>(blueprintData);

      // Create items recursively
      let itemCount = 0;
      try {
        itemCount = await this.createImportedItems(
          blueprint.id,
          parsedData.items,
          null, // No parent for root items
          null  // No parent path for root items
        );
      } catch (err) {
        // If item creation fails, delete the blueprint and return error
        try {
          await this.pb.collection(Collections.TEMPLATES).delete(blueprint.id);
        } catch {
          // Ignore cleanup errors
        }
        
        const message = err instanceof Error ? err.message : 'Failed to create items';
        return createImportErrorResult({
          code: ImportErrorCodes.IMPORT_FAILED,
          message,
          details: { error: String(err) },
        });
      }

      return createImportSuccessResult(blueprint.id, itemCount, warnings);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Import failed';
      return createImportErrorResult({
        code: ImportErrorCodes.IMPORT_FAILED,
        message,
        details: { error: String(err) },
      });
    }
  }

  /**
   * Validates import data without creating anything.
   * Useful for previewing imports or checking validity.
   * 
   * Requirements: 11.3
   * 
   * @param data - The import data string
   * @param format - The format of the data (or auto-detect if not specified)
   * @returns ImportValidationResult with parsed data if valid
   */
  validateImportData(
    data: string,
    format?: ExportFormat
  ): ImportValidationResult {
    // Detect format if not specified
    const detectedFormat = format || detectImportFormat(data);
    if (!detectedFormat) {
      return {
        isValid: false,
        errors: [{
          code: ImportErrorCodes.INVALID_FORMAT,
          message: 'Could not detect import format',
        }],
        warnings: [],
        parsedData: null,
      };
    }

    // Parse based on format
    switch (detectedFormat) {
      case 'json':
        return parseJSONImport(data);
      case 'csv':
        return parseCSVImport(data);
      case 'markdown':
        return parseMarkdownImport(data);
      default:
        return {
          isValid: false,
          errors: [{
            code: ImportErrorCodes.INVALID_FORMAT,
            message: `Unsupported import format: ${detectedFormat}`,
          }],
          warnings: [],
          parsedData: null,
        };
    }
  }

  /**
   * Creates items from parsed import data recursively.
   * 
   * @param blueprintId - The blueprint to add items to
   * @param items - The parsed items to create
   * @param parentId - Parent item ID (null for root items)
   * @param parentPath - Parent item path (null for root items)
   * @returns Total number of items created
   */
  private async createImportedItems(
    blueprintId: string,
    items: ParsedImportItem[],
    parentId: string | null,
    parentPath: string | null
  ): Promise<number> {
    let totalCreated = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item) continue;

      // Generate path
      const path = parentPath 
        ? `${parentPath}.${i + 1}` 
        : String(i + 1);

      // Determine the item type for the database
      let dbItemType: ItemType;
      if (item.itemType === 'phase') {
        dbItemType = ItemType.PHASE;
      } else if (item.itemType === 'reference') {
        dbItemType = ItemType.REFERENCE;
      } else {
        dbItemType = ItemType.TASK;
      }

      // Create the item
      const itemData: ItemCreate = {
        blueprint: blueprintId,
        parent: parentId || undefined,
        path,
        itemType: dbItemType,
        content: item.content,
        description: item.description || undefined,
        // Phases don't have resources
        resources: item.itemType === 'phase' ? undefined : (item.resources || undefined),
        position: i + 1,
        metadata: item.metadata as ItemMetadata | undefined,
      };

      const createdItem = await this.pb
        .collection(Collections.ITEMS)
        .create<Item>(itemData);

      totalCreated++;

      // Recursively create children
      if (item.children && item.children.length > 0) {
        const childCount = await this.createImportedItems(
          blueprintId,
          item.children,
          createdItem.id,
          path
        );
        totalCreated += childCount;
      }
    }

    return totalCreated;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

const _export = makeServiceAccessor(ExportService);
export const createExportService = _export.create;
export const getExportService = _export.get;
