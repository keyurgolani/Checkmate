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
  ResourceLink,
  TemplateQuestion,
  User,
} from '../pocketbase-types';
import { Collections, ItemType, Visibility } from '../pocketbase-types';

// ============================================================================
// Types
// ============================================================================

/**
 * Supported export formats
 */
export type ExportFormat = 'json' | 'csv' | 'markdown';

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
 * Exported item structure (for JSON export)
 */
export interface ExportedItem {
  id: string;
  path: string;
  itemType: string;
  content: string;
  description: string | null;
  resources: ResourceLink[] | null;
  position: number;
  parentId: string | null;
  referenceId: string | null;
  referencedBlueprintTitle?: string;
  metadata: Record<string, unknown> | null;
  children?: ExportedItem[];
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

/**
 * Import result
 */
export interface ImportResult {
  success: boolean;
  templateId: string | null;
  itemCount: number;
  error: ImportError | null;
  warnings: string[];
}

/**
 * Import error
 */
export interface ImportError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
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

// ============================================================================
// Error Codes
// ============================================================================

export const ExportErrorCodes = {
  BLUEPRINT_NOT_FOUND: 'EXPORT_001',
  PERMISSION_DENIED: 'EXPORT_002',
  INVALID_FORMAT: 'EXPORT_003',
  EXPORT_FAILED: 'EXPORT_004',
  UNKNOWN_ERROR: 'EXPORT_999',
} as const;

/**
 * Import error codes
 */
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
// Constants
// ============================================================================

/** Current export format version */
export const EXPORT_VERSION = '1.0.0';

/** MIME types for export formats */
export const MIME_TYPES: Record<ExportFormat, string> = {
  json: 'application/json',
  csv: 'text/csv',
  markdown: 'text/markdown',
};

/** File extensions for export formats */
export const FILE_EXTENSIONS: Record<ExportFormat, string> = {
  json: 'json',
  csv: 'csv',
  markdown: 'md',
};

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

/**
 * Sanitizes a string for use in filenames
 */
function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

/**
 * Escapes a value for CSV format
 */
function escapeCSV(value: string | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  // If the value contains comma, newline, or quote, wrap in quotes and escape quotes
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Calculates the depth of a path
 */
function getPathDepth(path: string): number {
  return path.split('.').length;
}

/**
 * Builds a hierarchical tree from flat items
 */
function buildItemTree(items: Item[]): ExportedItem[] {
  const itemMap = new Map<string, ExportedItem>();
  const rootItems: ExportedItem[] = [];

  // First pass: create all exported items
  for (const item of items) {
    const exportedItem: ExportedItem = {
      id: item.id,
      path: item.path,
      itemType: item.itemType,
      content: item.content,
      description: item.description,
      resources: item.resources,
      position: item.position,
      parentId: item.parent,
      referenceId: item.reference,
      metadata: item.metadata,
      children: [],
    };
    itemMap.set(item.id, exportedItem);
  }

  // Second pass: build tree structure
  for (const item of items) {
    const exportedItem = itemMap.get(item.id);
    if (!exportedItem) continue;

    if (item.parent) {
      const parent = itemMap.get(item.parent);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(exportedItem);
      }
    } else {
      rootItems.push(exportedItem);
    }
  }

  // Sort children by position
  const sortChildren = (items: ExportedItem[]) => {
    items.sort((a, b) => a.position - b.position);
    for (const item of items) {
      if (item.children && item.children.length > 0) {
        sortChildren(item.children);
      }
    }
  };

  sortChildren(rootItems);

  return rootItems;
}

/**
 * Flattens hierarchical items to a flat list
 */
function flattenItems(items: ExportedItem[]): ExportedItem[] {
  const result: ExportedItem[] = [];

  const flatten = (itemList: ExportedItem[]) => {
    for (const item of itemList) {
      // Create a copy without children for the flat list
      const { children, ...itemWithoutChildren } = item;
      result.push(itemWithoutChildren as ExportedItem);
      if (children && children.length > 0) {
        flatten(children);
      }
    }
  };

  flatten(items);
  return result;
}

// ============================================================================
// Import Helper Functions
// ============================================================================

/**
 * Creates a successful ImportResult
 */
function createImportSuccessResult(
  templateId: string,
  itemCount: number,
  warnings: string[] = []
): ImportResult {
  return {
    success: true,
    templateId,
    itemCount,
    error: null,
    warnings,
  };
}

/**
 * Creates an error ImportResult
 */
function createImportErrorResult(error: ImportError): ImportResult {
  return {
    success: false,
    templateId: null,
    itemCount: 0,
    error,
    warnings: [],
  };
}

/**
 * Detects the format of import data
 */
function detectImportFormat(data: string): ExportFormat | null {
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
function parseJSONImport(data: string): ImportValidationResult {
  const errors: ImportError[] = [];
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
function parseCSVImport(data: string): ImportValidationResult {
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
  const pathIndex = headers.findIndex(h => h === 'path');
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
function parseMarkdownImport(data: string): ImportValidationResult {
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
