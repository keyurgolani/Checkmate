/**
 * Import parsers + their types.
 *
 * The `ExportService` class delegates all format detection and parsing
 * to the functions in this module. Keeping them separate from the class
 * lets tests exercise format detection without spinning up a full
 * PocketBase client, and keeps the class focused on persistence.
 */

import type { ResourceLink, TemplateQuestion } from '../../pocketbase-types';
import { EXPORT_VERSION, type ExportFormat, type ExportedItem } from './utils';
import { type Result, ok, err } from '../../result';

// ============================================================================
// Types
// ============================================================================

/**
 * Import error
 */
export interface ImportError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Import result payload shape — lives inside result.data when successful.
 */
export interface ImportPayload {
  templateId: string;
  itemCount: number;
  warnings: string[];
}

/**
 * Import result
 */
export type ImportResult = Result<ImportPayload, ImportError>;

/**
 * Parsed import item
 */
export interface ParsedImportItem {
  content: string;
  description?: string | null;
  resources?: ResourceLink[] | null;
  itemType: 'task' | 'reference' | 'phase';
  position: number;
  children: ParsedImportItem[];
  metadata?: Record<string, unknown>;
}

/**
 * Parsed import data (normalized from any format)
 */
export interface ParsedImportData {
  title: string;
  description: string | null;
  category: string | null;
  tags: string[];
  questions: TemplateQuestion[] | null;
  items: ParsedImportItem[];
}

/**
 * Validation result for import data
 */
export interface ImportValidationResult {
  isValid: boolean;
  errors: ImportError[];
  warnings: string[];
  parsedData: ParsedImportData | null;
}

// ============================================================================
// Error Codes
// ============================================================================

export const ImportErrorCodes = {
  INVALID_FORMAT: 'IMPORT_001',
  PARSE_ERROR: 'IMPORT_002',
  VALIDATION_ERROR: 'IMPORT_003',
  MISSING_REQUIRED_FIELD: 'IMPORT_004',
  INVALID_ITEM_STRUCTURE: 'IMPORT_005',
  WORKSPACE_NOT_FOUND: 'IMPORT_006',
  PERMISSION_DENIED: 'IMPORT_007',
  IMPORT_FAILED: 'IMPORT_008',
  UNSUPPORTED_VERSION: 'IMPORT_009',
  UNKNOWN_ERROR: 'IMPORT_999',
} as const;

// ============================================================================
// Result Helpers
// ============================================================================

/**
 * Creates a successful ImportResult. Kept as a 3-arg helper for ergonomics
 * at call sites that build the payload from pieces.
 */
export function createImportSuccessResult(
  templateId: string,
  itemCount: number,
  warnings: string[] = []
): ImportResult {
  return ok({ templateId, itemCount, warnings });
}

/**
 * Creates an error ImportResult. Thin wrapper around err() to match the
 * success helper's call-site ergonomics.
 */
export function createImportErrorResult(error: ImportError): ImportResult {
  return err(error);
}

// ============================================================================
// Format Detection & Parsers
// ============================================================================

/**
 * Detects the format of import data
 */
export function detectImportFormat(data: string): ExportFormat | null {
  const trimmed = data.trim();

  // Check for JSON
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      JSON.parse(trimmed);
      return 'json';
    } catch {
      // Not valid JSON
    }
  }

  // Check for Markdown (starts with # or has checkbox patterns)
  if (trimmed.startsWith('#') || /^[-*]\s*\[[ x]\]/m.test(trimmed)) {
    return 'markdown';
  }

  // Check for CSV (has comma-separated values with header)
  const lines = trimmed.split('\n');
  if (lines.length > 1) {
    const firstLine = lines[0]?.toLowerCase() || '';
    if (firstLine.includes('path') || firstLine.includes('content') || firstLine.includes('type')) {
      return 'csv';
    }
  }

  return null;
}

/**
 * Parses JSON import data
 */
export function parseJSONImport(data: string): ImportValidationResult {
  const warnings: string[] = [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(data);
  } catch (e) {
    return {
      isValid: false,
      errors: [{
        code: ImportErrorCodes.PARSE_ERROR,
        message: 'Invalid JSON format',
        details: { error: e instanceof Error ? e.message : String(e) },
      }],
      warnings: [],
      parsedData: null,
    };
  }

  // Validate structure
  if (typeof parsed !== 'object' || parsed === null) {
    return {
      isValid: false,
      errors: [{
        code: ImportErrorCodes.INVALID_FORMAT,
        message: 'Import data must be an object',
      }],
      warnings: [],
      parsedData: null,
    };
  }

  const obj = parsed as Record<string, unknown>;

  // Check for exported blueprint format
  if (obj.exportVersion && (obj.template || obj.blueprint) && obj.items) {
    return parseExportedBlueprintFormat(obj, warnings);
  }

  // Check for simple format (just title and items)
  if (obj.title || obj.items) {
    return parseSimpleJSONFormat(obj, warnings);
  }

  return {
    isValid: false,
    errors: [{
      code: ImportErrorCodes.INVALID_FORMAT,
      message: 'Unrecognized JSON format. Expected exported blueprint or simple format with title and items.',
    }],
    warnings: [],
    parsedData: null,
  };
}

/**
 * Parses the full exported blueprint format
 */
function parseExportedBlueprintFormat(
  obj: Record<string, unknown>,
  warnings: string[]
): ImportValidationResult {
  const errors: ImportError[] = [];

  // Check version compatibility
  const version = obj.exportVersion as string;
  if (version && !version.startsWith('1.')) {
    warnings.push(`Import version ${version} may not be fully compatible with current version ${EXPORT_VERSION}`);
  }

  const templateData = (obj.template || obj.blueprint) as Record<string, unknown> | undefined;
  if (!templateData) {
    errors.push({
      code: ImportErrorCodes.MISSING_REQUIRED_FIELD,
      message: 'Missing blueprint data',
    });
    return { isValid: false, errors, warnings, parsedData: null };
  }

  const title = templateData.title as string;
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    errors.push({
      code: ImportErrorCodes.MISSING_REQUIRED_FIELD,
      message: 'Blueprint title is required',
    });
    return { isValid: false, errors, warnings, parsedData: null };
  }

  // Parse items from hierarchical structure
  const items = obj.items as ExportedItem[] | undefined;
  const parsedItems = items ? parseExportedItems(items, errors) : [];

  if (errors.length > 0) {
    return { isValid: false, errors, warnings, parsedData: null };
  }

  // Parse questions
  const questions = Array.isArray(templateData.questions)
    ? (templateData.questions as TemplateQuestion[]).filter(
        (q) => q && typeof q.id === 'string' && typeof q.question === 'string'
      )
    : null;

  return {
    isValid: true,
    errors: [],
    warnings,
    parsedData: {
      title: title.trim(),
      description: (templateData.description as string | null) || null,
      category: (templateData.category as string | null) || null,
      tags: Array.isArray(templateData.tags) ? templateData.tags.filter((t): t is string => typeof t === 'string') : [],
      questions: questions && questions.length > 0 ? questions : null,
      items: parsedItems,
    },
  };
}

/**
 * Parses exported items into ParsedImportItem format
 */
function parseExportedItems(items: ExportedItem[], errors: ImportError[]): ParsedImportItem[] {
  const result: ParsedImportItem[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item) continue;

    if (!item.content || typeof item.content !== 'string') {
      errors.push({
        code: ImportErrorCodes.INVALID_ITEM_STRUCTURE,
        message: `Item at position ${i} is missing content`,
      });
      continue;
    }

    // Determine item type: phase, reference, or task (default)
    let itemType: 'task' | 'reference' | 'phase' = 'task';
    if (item.itemType === 'phase') {
      itemType = 'phase';
    } else if (item.itemType === 'reference') {
      itemType = 'reference';
    }

    const parsedItem: ParsedImportItem = {
      content: item.content,
      description: item.description || null,
      resources: item.resources || null,
      itemType,
      position: i,
      children: item.children ? parseExportedItems(item.children, errors) : [],
      metadata: item.metadata as Record<string, unknown> | undefined,
    };

    // References without a valid reference ID become tasks
    if (parsedItem.itemType === 'reference' && !item.referenceId) {
      parsedItem.itemType = 'task';
    }

    result.push(parsedItem);
  }

  return result;
}

/**
 * Parses simple JSON format
 */
function parseSimpleJSONFormat(
  obj: Record<string, unknown>,
  warnings: string[]
): ImportValidationResult {
  const errors: ImportError[] = [];

  const title = obj.title as string;
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    errors.push({
      code: ImportErrorCodes.MISSING_REQUIRED_FIELD,
      message: 'Title is required',
    });
    return { isValid: false, errors, warnings, parsedData: null };
  }

  const items = obj.items as unknown[];
  const parsedItems: ParsedImportItem[] = [];

  if (Array.isArray(items)) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (typeof item === 'string') {
        parsedItems.push({
          content: item,
          itemType: 'task',
          position: i,
          children: [],
        });
      } else if (typeof item === 'object' && item !== null) {
        const itemObj = item as Record<string, unknown>;
        const content = (itemObj.content || itemObj.text || itemObj.title) as string;
        if (content) {
          parsedItems.push({
            content,
            itemType: 'task',
            position: i,
            children: [],
          });
        }
      }
    }
  }

  return {
    isValid: true,
    errors: [],
    warnings,
    parsedData: {
      title: title.trim(),
      description: (obj.description as string | null) || null,
      category: (obj.category as string | null) || null,
      tags: Array.isArray(obj.tags) ? obj.tags.filter((t): t is string => typeof t === 'string') : [],
      questions: null,
      items: parsedItems,
    },
  };
}

/**
 * Parses CSV import data
 */
export function parseCSVImport(data: string): ImportValidationResult {
  const warnings: string[] = [];
  const lines = data.trim().split('\n');

  if (lines.length < 2) {
    return {
      isValid: false,
      errors: [{
        code: ImportErrorCodes.INVALID_FORMAT,
        message: 'CSV must have at least a header row and one data row',
      }],
      warnings: [],
      parsedData: null,
    };
  }

  // Parse header
  const headerLine = lines[0] || '';
  const headers = parseCSVLine(headerLine).map(h => h.toLowerCase().trim());

  // Find column indices
  const contentIndex = headers.findIndex(h => h === 'content' || h === 'text' || h === 'task');
  const typeIndex = headers.findIndex(h => h === 'type' || h === 'itemtype');
  const descriptionIndex = headers.findIndex(h => h === 'description');
  const resourcesIndex = headers.findIndex(h => h === 'resources');

  if (contentIndex === -1) {
    return {
      isValid: false,
      errors: [{
        code: ImportErrorCodes.MISSING_REQUIRED_FIELD,
        message: 'CSV must have a "content" or "text" column',
      }],
      warnings: [],
      parsedData: null,
    };
  }

  // Parse data rows
  const items: ParsedImportItem[] = [];
  let title = 'Imported Checklist';
  let description: string | null = null;
  let category: string | null = null;
  const tags: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // Skip comment lines (metadata)
    if (line.startsWith('#')) {
      const metaMatch = line.match(/^#\s*(\w+):\s*(.*)$/);
      if (metaMatch) {
        const [, key, value] = metaMatch;
        if (key?.toLowerCase() === 'blueprint' || key?.toLowerCase() === 'title') {
          title = value?.trim() || title;
        } else if (key?.toLowerCase() === 'description') {
          description = value?.trim() || null;
        } else if (key?.toLowerCase() === 'category') {
          category = value?.trim() || null;
        } else if (key?.toLowerCase() === 'tags') {
          tags.push(...(value?.split(',').map(t => t.trim()).filter(Boolean) || []));
        }
      }
      continue;
    }

    const values = parseCSVLine(line);
    const content = values[contentIndex]?.trim();

    if (!content) continue;

    const itemType = typeIndex >= 0 && values[typeIndex]?.toLowerCase() === 'reference'
      ? 'reference' as const
      : 'task' as const;

    // Parse description
    let itemDescription: string | null = null;
    if (descriptionIndex >= 0 && values[descriptionIndex]) {
      itemDescription = values[descriptionIndex].trim() || null;
    }

    // Parse resources (JSON-encoded)
    let itemResources: ResourceLink[] | null = null;
    if (resourcesIndex >= 0 && values[resourcesIndex]) {
      try {
        const parsed = JSON.parse(values[resourcesIndex]);
        if (Array.isArray(parsed)) {
          itemResources = parsed as ResourceLink[];
        }
      } catch {
        // Invalid JSON, ignore
      }
    }

    items.push({
      content,
      description: itemDescription,
      resources: itemResources,
      itemType,
      position: items.length,
      children: [],
    });
  }

  if (items.length === 0) {
    return {
      isValid: false,
      errors: [{
        code: ImportErrorCodes.INVALID_FORMAT,
        message: 'No valid items found in CSV',
      }],
      warnings: [],
      parsedData: null,
    };
  }

  return {
    isValid: true,
    errors: [],
    warnings,
    parsedData: {
      title,
      description,
      category,
      tags,
      questions: null,
      items,
    },
  };
}

/**
 * Parses a single CSV line handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

/**
 * Parses Markdown import data
 */
export function parseMarkdownImport(data: string): ImportValidationResult {
  const warnings: string[] = [];
  const lines = data.trim().split('\n');

  let title = 'Imported Checklist';
  let description: string | null = null;
  const items: ParsedImportItem[] = [];
  const itemStack: { item: ParsedImportItem; indent: number }[] = [];

  let inDescription = false;
  const descriptionLines: string[] = [];
  let lastItem: ParsedImportItem | null = null;
  let lastItemIndent = 0;
  let titleFound = false;
  let currentPhase: ParsedImportItem | null = null;

  // Reserved section headers that should not be treated as phases
  const reservedHeaders = ['metadata', 'statistics', 'checklist items'];

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex] || '';

    // Check for title (# heading)
    const titleMatch = line.match(/^#\s+(.+)$/);
    if (titleMatch) {
      title = titleMatch[1]?.trim() || title;
      titleFound = true;
      inDescription = true;
      lastItem = null;
      currentPhase = null;
      continue;
    }

    // Check for section headers (## heading) - these become phases
    const sectionMatch = line.match(/^##\s+(.+)$/);
    if (sectionMatch && titleFound) {
      const sectionName = sectionMatch[1]?.trim() || '';

      // Skip reserved section headers
      if (reservedHeaders.includes(sectionName.toLowerCase())) {
        inDescription = false;
        lastItem = null;
        currentPhase = null;
        continue;
      }

      // Create a phase item
      const phaseItem: ParsedImportItem = {
        content: sectionName,
        description: null,
        resources: null,
        itemType: 'phase',
        position: items.length,
        children: [],
      };

      items.push(phaseItem);
      currentPhase = phaseItem;
      itemStack.length = 0; // Reset item stack for new phase
      inDescription = false;
      lastItem = phaseItem;
      lastItemIndent = 0;

      // Check if next non-empty line is description (not a list item)
      let nextLineIndex = lineIndex + 1;
      const phaseDescLines: string[] = [];
      while (nextLineIndex < lines.length) {
        const nextLine = lines[nextLineIndex] || '';
        const trimmedNext = nextLine.trim();

        // Stop if we hit another header, list item, or empty line after content
        if (trimmedNext.startsWith('#') || trimmedNext.startsWith('-') || trimmedNext.startsWith('*')) {
          break;
        }

        if (trimmedNext === '' && phaseDescLines.length > 0) {
          break;
        }

        if (trimmedNext !== '') {
          phaseDescLines.push(trimmedNext);
        }

        nextLineIndex++;
      }

      if (phaseDescLines.length > 0) {
        phaseItem.description = phaseDescLines.join(' ');
        // Skip the lines we consumed for description
        lineIndex = nextLineIndex - 1;
      }

      continue;
    }

    // Check for description lines (blockquotes after an item)
    const descriptionMatch = line.match(/^(\s*)>\s*(.+)$/);
    if (descriptionMatch && lastItem) {
      const indent = descriptionMatch[1]?.length || 0;
      const descText = descriptionMatch[2]?.trim() || '';
      // Only add if indent is appropriate for the last item
      if (descText && indent >= lastItemIndent) {
        lastItem.description = lastItem.description
          ? `${lastItem.description} ${descText}`
          : descText;
      }
      continue;
    }

    // Check for resource links (- 📎 [title](url) - description)
    const resourceMatch = line.match(/^(\s*)[-*]\s*📎?\s*\[([^\]]+)\]\(([^)]+)\)(?:\s*[-–]\s*(.+))?$/);
    if (resourceMatch && lastItem && lastItem.itemType !== 'phase') {
      const indent = resourceMatch[1]?.length || 0;
      const resourceTitle = resourceMatch[2]?.trim() || '';
      const url = resourceMatch[3]?.trim() || '';
      const resourceDesc = resourceMatch[4]?.trim();

      if (resourceTitle && url && indent >= lastItemIndent) {
        if (!lastItem.resources) {
          lastItem.resources = [];
        }
        lastItem.resources.push({
          title: resourceTitle,
          url,
          description: resourceDesc,
        });
      }
      continue;
    }

    // Check for checkbox items
    const checkboxMatch = line.match(/^(\s*)[-*]\s*\[[ x]\]\s*(.+)$/i);
    if (checkboxMatch) {
      inDescription = false;
      const indent = checkboxMatch[1]?.length || 0;
      const content = checkboxMatch[2]?.trim() || '';

      if (!content) continue;

      // Remove reference indicators like "→ *Blueprint Name*"
      const cleanContent = content.replace(/\s*→\s*\*[^*]+\*\s*$/, '').trim();

      const newItem: ParsedImportItem = {
        content: cleanContent,
        description: null,
        resources: null,
        itemType: 'task',
        position: 0,
        children: [],
      };

      // Find parent based on indentation
      while (itemStack.length > 0 && (itemStack[itemStack.length - 1]?.indent ?? 0) >= indent) {
        itemStack.pop();
      }

      if (itemStack.length === 0) {
        // Root level item - add to current phase or root items
        if (currentPhase) {
          newItem.position = currentPhase.children.length;
          currentPhase.children.push(newItem);
        } else {
          newItem.position = items.length;
          items.push(newItem);
        }
      } else {
        // Child item
        const parent = itemStack[itemStack.length - 1];
        if (parent) {
          newItem.position = parent.item.children.length;
          parent.item.children.push(newItem);
        }
      }

      itemStack.push({ item: newItem, indent });
      lastItem = newItem;
      lastItemIndent = indent;
      continue;
    }

    // Check for simple list items (- item or * item without checkbox)
    const listMatch = line.match(/^(\s*)[-*]\s+(.+)$/);
    if (listMatch && !line.includes('[')) {
      inDescription = false;
      const indent = listMatch[1]?.length || 0;
      const content = listMatch[2]?.trim() || '';

      if (!content) continue;

      const newItem: ParsedImportItem = {
        content,
        description: null,
        resources: null,
        itemType: 'task',
        position: 0,
        children: [],
      };

      // Find parent based on indentation
      while (itemStack.length > 0 && (itemStack[itemStack.length - 1]?.indent ?? 0) >= indent) {
        itemStack.pop();
      }

      if (itemStack.length === 0) {
        // Root level item - add to current phase or root items
        if (currentPhase) {
          newItem.position = currentPhase.children.length;
          currentPhase.children.push(newItem);
        } else {
          newItem.position = items.length;
          items.push(newItem);
        }
      } else {
        const parent = itemStack[itemStack.length - 1];
        if (parent) {
          newItem.position = parent.item.children.length;
          parent.item.children.push(newItem);
        }
      }

      itemStack.push({ item: newItem, indent });
      lastItem = newItem;
      lastItemIndent = indent;
      continue;
    }

    // Collect description lines
    if (inDescription && line.trim() && !line.startsWith('-') && !line.startsWith('*')) {
      descriptionLines.push(line.trim());
    }
  }

  if (descriptionLines.length > 0) {
    description = descriptionLines.join(' ');
  }

  if (items.length === 0) {
    return {
      isValid: false,
      errors: [{
        code: ImportErrorCodes.INVALID_FORMAT,
        message: 'No checklist items found in Markdown',
      }],
      warnings: [],
      parsedData: null,
    };
  }

  return {
    isValid: true,
    errors: [],
    warnings,
    parsedData: {
      title,
      description,
      category: null,
      tags: [],
      questions: null,
      items,
    },
  };
}
