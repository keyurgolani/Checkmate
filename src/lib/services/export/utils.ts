/**
 * Foundational export types, constants, and pure helpers.
 *
 * Kept separate from the ExportService class and the import parsers so
 * both sides can share `ExportFormat`, `ExportedItem`, and the simple
 * utility functions without pulling in each other's code.
 */

import type { Item, ResourceLink } from '../../pocketbase-types';

export type ExportFormat = 'json' | 'csv' | 'markdown';

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
 * Sanitizes a string for use in filenames
 */
export function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

/**
 * Escapes a value for CSV format
 */
export function escapeCSV(value: string | null | undefined): string {
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
export function getPathDepth(path: string): number {
  return path.split('.').length;
}

/**
 * Builds a hierarchical tree from flat items
 */
export function buildItemTree(items: Item[]): ExportedItem[] {
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
export function flattenItems(items: ExportedItem[]): ExportedItem[] {
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
