/**
 * Item Service
 * 
 * Provides CRUD operations for checklist items using PocketBase SDK.
 * Supports both task and reference item types with hierarchical path management.
 * 
 * Requirements: 3.2
 */

import PocketBase, { ClientResponseError } from 'pocketbase';
import { createPocketBaseClient, getPocketBaseClient } from '../pocketbase';
import type {
  Item,
  ItemCreate,
  ItemUpdate,
  ItemMetadata,
  ResourceLink,
} from '../pocketbase-types';
import { Collections, ItemType } from '../pocketbase-types';
import {
  CircularDependencyDetector,
  type CircularDependencyResult,
} from './circular-dependency';

// ============================================================================
// Types
// ============================================================================

/**
 * Input for creating a new item
 */
export interface CreateItemInput {
  templateId: string; // Renamed from blueprintId
  parentId?: string;
  itemType: ItemType;
  content: string;
  description?: string;
  resources?: ResourceLink[];
  referenceId?: string;
  position?: number;
  metadata?: ItemMetadata;
}

/**
 * Input for updating an item
 */
export interface UpdateItemInput {
  parentId?: string | null;
  content?: string;
  description?: string | null;
  resources?: ResourceLink[] | null;
  itemType?: ItemType;
  referenceId?: string | null;
  position?: number;
  metadata?: ItemMetadata;
}

/**
 * Input for reordering items
 */
export interface ReorderInput {
  id: string;
  position: number;
  parentId?: string | null;
}

/**
 * Input for moving a single item (drag-and-drop)
 */
export interface MoveItemInput {
  /** The item being moved */
  itemId: string;
  /** New parent ID (null for root level) */
  newParentId?: string | null;
  /** Position to insert at (0-based index among siblings) */
  newPosition: number;
}

/**
 * Item operation result
 */
export interface ItemResult {
  success: boolean;
  item: Item | null;
  error: ItemError | null;
}

/**
 * Item error with code and message
 */
export interface ItemError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Result for batch operations
 */
export interface BatchItemResult {
  success: boolean;
  items: Item[];
  errors: ItemError[];
}

// ============================================================================
// Error Codes
// ============================================================================

export const ItemErrorCodes = {
  NOT_FOUND: 'ITEM_001',
  VALIDATION_ERROR: 'ITEM_002',
  PERMISSION_DENIED: 'ITEM_003',
  TEMPLATE_NOT_FOUND: 'ITEM_004', // Renamed from BLUEPRINT_NOT_FOUND
  CONTENT_REQUIRED: 'ITEM_005',
  INVALID_ITEM_TYPE: 'ITEM_006',
  REFERENCE_REQUIRED: 'ITEM_007',
  REFERENCE_NOT_FOUND: 'ITEM_008',
  PARENT_NOT_FOUND: 'ITEM_009',
  MAX_DEPTH_EXCEEDED: 'ITEM_010',
  CIRCULAR_REFERENCE: 'ITEM_011',
  UNKNOWN_ERROR: 'ITEM_999',
} as const;

// ============================================================================
// Constants
// ============================================================================

/**
 * Maximum nesting depth for items (Requirements: 3.5 - up to 5 levels)
 */
export const MAX_NESTING_DEPTH = 5;

/**
 * Maximum nesting depth for references (Requirements: 7.3 - up to 10 levels)
 */
export const MAX_REFERENCE_DEPTH = 10;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validates item content
 */
export function validateContent(content: string): ItemError | null {
  if (!content || content.trim().length === 0) {
    return {
      code: ItemErrorCodes.CONTENT_REQUIRED,
      message: 'Item content is required',
    };
  }
  return null;
}

/**
 * Validates item type
 */
export function validateItemType(itemType: string): ItemError | null {
  const validTypes = Object.values(ItemType);
  if (!validTypes.includes(itemType as ItemType)) {
    return {
      code: ItemErrorCodes.INVALID_ITEM_TYPE,
      message: `Invalid item type. Must be one of: ${validTypes.join(', ')}`,
      details: { providedValue: itemType, allowedValues: validTypes },
    };
  }
  return null;
}

/**
 * Creates a successful ItemResult
 */
function createSuccessResult(item: Item): ItemResult {
  return {
    success: true,
    item,
    error: null,
  };
}

/**
 * Creates an error ItemResult
 */
function createErrorResult(error: ItemError): ItemResult {
  return {
    success: false,
    item: null,
    error,
  };
}

/**
 * Parses PocketBase errors into ItemError
 */
function parseError(err: unknown): ItemError {
  if (err instanceof ClientResponseError) {
    if (err.status === 404) {
      return {
        code: ItemErrorCodes.NOT_FOUND,
        message: 'Item not found',
      };
    }

    if (err.status === 403) {
      return {
        code: ItemErrorCodes.PERMISSION_DENIED,
        message: 'You do not have permission to perform this action',
      };
    }

    if (err.status === 400) {
      const data = err.data as Record<string, unknown>;
      return {
        code: ItemErrorCodes.VALIDATION_ERROR,
        message: err.message || 'Validation failed',
        details: data,
      };
    }

    return {
      code: ItemErrorCodes.UNKNOWN_ERROR,
      message: err.message || 'An unexpected error occurred',
      details: { status: err.status, data: err.data },
    };
  }

  if (err instanceof Error) {
    return {
      code: ItemErrorCodes.UNKNOWN_ERROR,
      message: err.message,
    };
  }

  return {
    code: ItemErrorCodes.UNKNOWN_ERROR,
    message: 'An unexpected error occurred',
  };
}

/**
 * Generates a hierarchical path for an item
 * Path format: "1", "1.1", "1.1.2", etc.
 */
export function generatePath(parentPath: string | null, position: number): string {
  if (!parentPath) {
    return String(position + 1);
  }
  return `${parentPath}.${position + 1}`;
}

/**
 * Calculates the depth of a path
 */
export function getPathDepth(path: string): number {
  return path.split('.').length;
}

/**
 * Checks if a path is a descendant of another path
 */
export function isDescendantPath(childPath: string, parentPath: string): boolean {
  return childPath.startsWith(parentPath + '.');
}

// ============================================================================
// Item Service Class
// ============================================================================

/**
 * Item Service
 * 
 * Provides methods for managing checklist items including:
 * - CRUD operations (create, read, update, delete)
 * - Support for task and reference item types
 * - Hierarchical path management
 */
export class ItemService {
  private pb: PocketBase;

  constructor(pb?: PocketBase) {
    this.pb = pb ?? getPocketBaseClient();
  }

  /**
   * Creates a new checklist item.
   * Supports both task and reference item types.
   * 
   * Requirements: 3.2
   * 
   * @param input - Item creation data
   * @returns ItemResult with created item on success
   */
  async create(input: CreateItemInput): Promise<ItemResult> {
    try {
      console.log('[ItemService.create] Input:', JSON.stringify(input));
      
      // Validate content
      const contentError = validateContent(input.content);
      if (contentError) {
        return createErrorResult(contentError);
      }

      // Validate item type
      const typeError = validateItemType(input.itemType);
      if (typeError) {
        return createErrorResult(typeError);
      }

      // Validate reference for reference items
      if (input.itemType === ItemType.REFERENCE && !input.referenceId) {
        return createErrorResult({
          code: ItemErrorCodes.REFERENCE_REQUIRED,
          message: 'Reference ID is required for reference items',
        });
      }

      // Get current user ID
      const userId = this.pb.authStore.record?.id;
      if (!userId) {
        return createErrorResult({
          code: ItemErrorCodes.PERMISSION_DENIED,
          message: 'You must be authenticated to create an item',
        });
      }

      // Verify template exists
      try {
        await this.pb.collection(Collections.TEMPLATES).getOne(input.templateId);
      } catch {
        return createErrorResult({
          code: ItemErrorCodes.TEMPLATE_NOT_FOUND,
          message: 'Template not found or you do not have access',
        });
      }

      // Get parent item if specified
      let parentPath: string | null = null;
      if (input.parentId) {
        try {
          const parent = await this.pb
            .collection(Collections.ITEMS)
            .getOne<Item>(input.parentId);
          parentPath = parent.path;

          // Check max depth
          const parentDepth = getPathDepth(parent.path);
          if (parentDepth >= MAX_NESTING_DEPTH) {
            return createErrorResult({
              code: ItemErrorCodes.MAX_DEPTH_EXCEEDED,
              message: `Maximum nesting depth of ${MAX_NESTING_DEPTH} exceeded`,
              details: { currentDepth: parentDepth, maxDepth: MAX_NESTING_DEPTH },
            });
          }
        } catch {
          return createErrorResult({
            code: ItemErrorCodes.PARENT_NOT_FOUND,
            message: 'Parent item not found',
          });
        }
      }

      // Verify reference template exists for reference items
      // and check for circular dependencies
      if (input.itemType === ItemType.REFERENCE && input.referenceId) {
        try {
          await this.pb.collection(Collections.TEMPLATES).getOne(input.referenceId);
        } catch {
          return createErrorResult({
            code: ItemErrorCodes.REFERENCE_NOT_FOUND,
            message: 'Referenced template not found',
          });
        }

        // Check for circular dependency (Requirements: 3.3, 3.4, 7.4, 7.5)
        const cycleResult = await this.detectCircularDependency(input.templateId, input.referenceId);
        if (cycleResult.hasCycle) {
          return createErrorResult({
            code: ItemErrorCodes.CIRCULAR_REFERENCE,
            message: cycleResult.message || 'Circular dependency detected',
            details: { dependencyChain: cycleResult.dependencyChain },
          });
        }
      }

      // Calculate position if not provided
      // Note: PocketBase has "Nonzero" validation on position field, so we use 1-based indexing
      let position = input.position ?? 1;
      if (input.position === undefined) {
        // Get the next position for items at this level (1-based)
        const siblings = await this.getItemsByParent(input.templateId, input.parentId ?? null);
        position = siblings.length + 1;
        console.log('[ItemService.create] Calculated position:', position, 'from', siblings.length, 'siblings (1-based)');
      } else if (input.position === 0) {
        // If explicitly passed 0, convert to 1 for PocketBase compatibility
        position = 1;
        console.log('[ItemService.create] Converted position 0 to 1 for PocketBase Nonzero validation');
      }

      // Generate path
      const path = generatePath(parentPath, position);
      console.log('[ItemService.create] Generated path:', path);

      // Create item data
      const createData: ItemCreate = {
        blueprint: input.templateId, // Mapping templateId to blueprint field
        parent: input.parentId,
        path,
        itemType: input.itemType,
        content: input.content.trim(),
        description: input.description,
        resources: input.resources,
        reference: input.itemType === ItemType.REFERENCE ? input.referenceId : undefined,
        position,
        metadata: input.metadata,
      };

      console.log('[ItemService.create] Creating item with data:', JSON.stringify(createData));

      const item = await this.pb
        .collection(Collections.ITEMS)
        .create<Item>(createData);

      console.log('[ItemService.create] Item created successfully:', item.id);

      return createSuccessResult(item);
    } catch (err) {
      console.error('[ItemService.create] Error:', err);
      return createErrorResult(parseError(err));
    }
  }

  /**
   * Updates an existing item.
   * 
   * @param id - Item ID
   * @param input - Update data
   * @returns ItemResult with updated item on success
   */
  async update(id: string, input: UpdateItemInput): Promise<ItemResult> {
    try {
      // Validate content if provided
      if (input.content !== undefined) {
        const contentError = validateContent(input.content);
        if (contentError) {
          return createErrorResult(contentError);
        }
      }

      // Validate item type if provided
      if (input.itemType !== undefined) {
        const typeError = validateItemType(input.itemType);
        if (typeError) {
          return createErrorResult(typeError);
        }

        // Validate reference for reference items
        if (input.itemType === ItemType.REFERENCE && !input.referenceId) {
          return createErrorResult({
            code: ItemErrorCodes.REFERENCE_REQUIRED,
            message: 'Reference ID is required for reference items',
          });
        }
      }

      // Get current item
      let currentItem: Item;
      try {
        currentItem = await this.pb
          .collection(Collections.ITEMS)
          .getOne<Item>(id);
      } catch {
        return createErrorResult({
          code: ItemErrorCodes.NOT_FOUND,
          message: 'Item not found',
        });
      }

      // Build update data
      const updateData: ItemUpdate = {};

      if (input.content !== undefined) {
        updateData.content = input.content.trim();
      }
      if (input.itemType !== undefined) {
        updateData.itemType = input.itemType;
      }
      if (input.referenceId !== undefined) {
        updateData.reference = input.referenceId;

        // Check for circular dependency when updating reference (Requirements: 3.3, 3.4, 7.4, 7.5)
        if (input.referenceId !== null) {
          const cycleResult = await this.detectCircularDependency(currentItem.blueprint, input.referenceId);
          if (cycleResult.hasCycle) {
            return createErrorResult({
              code: ItemErrorCodes.CIRCULAR_REFERENCE,
              message: cycleResult.message || 'Circular dependency detected',
              details: { dependencyChain: cycleResult.dependencyChain },
            });
          }
        }
      }
      if (input.metadata !== undefined) {
        updateData.metadata = input.metadata;
      }
      if (input.description !== undefined) {
        updateData.description = input.description;
      }
      if (input.resources !== undefined) {
        updateData.resources = input.resources;
      }
      if (input.position !== undefined) {
        updateData.position = input.position;
      }

      // Handle parent change
      if (input.parentId !== undefined && input.parentId !== currentItem.parent) {
        // Validate new parent
        if (input.parentId !== null) {
          try {
            const newParent = await this.pb
              .collection(Collections.ITEMS)
              .getOne<Item>(input.parentId);

            // Check max depth
            const parentDepth = getPathDepth(newParent.path);
            if (parentDepth >= MAX_NESTING_DEPTH) {
              return createErrorResult({
                code: ItemErrorCodes.MAX_DEPTH_EXCEEDED,
                message: `Maximum nesting depth of ${MAX_NESTING_DEPTH} exceeded`,
                details: { currentDepth: parentDepth, maxDepth: MAX_NESTING_DEPTH },
              });
            }

            // Prevent circular reference (can't make an item a child of its descendant)
            if (isDescendantPath(newParent.path, currentItem.path)) {
              return createErrorResult({
                code: ItemErrorCodes.CIRCULAR_REFERENCE,
                message: 'Cannot move an item to be a child of its own descendant',
              });
            }

            updateData.parent = input.parentId;
            updateData.path = generatePath(newParent.path, input.position ?? currentItem.position);
          } catch {
            return createErrorResult({
              code: ItemErrorCodes.PARENT_NOT_FOUND,
              message: 'Parent item not found',
            });
          }
        } else {
          // Moving to root level
          updateData.parent = null;
          updateData.path = generatePath(null, input.position ?? currentItem.position);
        }
      }

      const item = await this.pb
        .collection(Collections.ITEMS)
        .update<Item>(id, updateData);

      return createSuccessResult(item);
    } catch (err) {
      return createErrorResult(parseError(err));
    }
  }

  /**
   * Deletes an item by ID.
   * Also deletes all child items due to cascade delete.
   * 
   * @param id - Item ID to delete
   * @returns Success status and any error
   */
  async delete(id: string): Promise<{ success: boolean; error: ItemError | null }> {
    try {
      await this.pb.collection(Collections.ITEMS).delete(id);
      return { success: true, error: null };
    } catch (err) {
      return { success: false, error: parseError(err) };
    }
  }

  /**
   * Gets an item by ID.
   * 
   * @param id - Item ID
   * @param expand - Optional relations to expand (e.g., 'blueprint,parent,reference')
   * @returns ItemResult with item on success
   */
  async getById(id: string, expand?: string): Promise<ItemResult> {
    try {
      const options: { expand?: string } = {};
      if (expand) {
        options.expand = expand;
      }

      const item = await this.pb
        .collection(Collections.ITEMS)
        .getOne<Item>(id, options);

      return createSuccessResult(item);
    } catch (err) {
      return createErrorResult(parseError(err));
    }
  }

  /**
   * Gets all items for a template.
   * 
   * @param templateId - Template ID
   * @param options - Query options
   * @returns Array of items
   */
  async getByTemplate(
    templateId: string,
    options?: {
      expand?: string;
      sort?: string;
    }
  ): Promise<Item[]> {
    try {
      const queryOptions: { filter: string; sort: string; expand?: string } = {
        filter: `blueprint = "${templateId}"`, // DB field name
        sort: options?.sort ?? 'path,position',
      };

      if (options?.expand) {
        queryOptions.expand = options.expand;
      }

      const result = await this.pb
        .collection(Collections.ITEMS)
        .getFullList<Item>(queryOptions);

      return result;
    } catch (err) {
      console.error('Error fetching items by template:', err);
      return [];
    }
  }
  
  /** 
   * @deprecated Use getByTemplate instead
   */
  async getByBlueprint(templateId: string, options?: any) {
    return this.getByTemplate(templateId, options);
  }



  /**
   * Gets items by parent (for hierarchical queries).
   * 
   * @param templateId - Template ID
   * @param parentId - Parent item ID (null for root items)
   * @returns Array of child items
   */
  async getItemsByParent(templateId: string, parentId: string | null): Promise<Item[]> {
    try {
      const filter = parentId
        ? `blueprint = "${templateId}" && parent = "${parentId}"`
        : `blueprint = "${templateId}" && parent = null`;

      const result = await this.pb
        .collection(Collections.ITEMS)
        .getFullList<Item>({
          filter,
          sort: 'position',
        });

      return result;
    } catch (err) {
      console.error('Error fetching items by parent:', err);
      return [];
    }
  }

  /**
   * Gets all descendants of an item.
   * 
   * @param itemId - Parent item ID
   * @returns Array of descendant items
   */
  async getDescendants(itemId: string): Promise<Item[]> {
    try {
      // Get the parent item to get its path
      const parent = await this.pb
        .collection(Collections.ITEMS)
        .getOne<Item>(itemId);

      // Get all items whose path starts with the parent's path
      const result = await this.pb
        .collection(Collections.ITEMS)
        .getFullList<Item>({
          filter: `blueprint = "${parent.blueprint}" && path ~ "${parent.path}.%"`,
          sort: 'path,position',
        });

      return result;
    } catch (err) {
      console.error('Error fetching descendants:', err);
      return [];
    }
  }

  /**
   * Gets the total number of items for a template.
   * 
   * @param templateId - Template ID
   * @returns Total count of items
   */
  async getItemCount(templateId: string): Promise<number> {
    try {
      const result = await this.pb
        .collection(Collections.ITEMS)
        .getList(1, 1, {
          filter: `blueprint = "${templateId}"`, // DB field name
          $autoCancel: false,
        });
      return result.totalItems;
    } catch (err) {
      console.error('Error fetching item count:', err);
      return 0;
    }
  }

  /**
   * Reorders items within a template.
   * Updates positions and paths for the specified items.
   * 
   * Requirements: 3.5
   * 
   * @param templateId - Template ID
   * @param items - Array of items with new positions
   * @returns BatchItemResult with updated items
   */
  async reorder(templateId: string, items: ReorderInput[]): Promise<BatchItemResult> {
    const updatedItems: Item[] = [];
    const errors: ItemError[] = [];

    for (const itemInput of items) {
      const result = await this.update(itemInput.id, {
        position: itemInput.position,
        parentId: itemInput.parentId,
      });

      if (result.success && result.item) {
        updatedItems.push(result.item);
      } else if (result.error) {
        errors.push(result.error);
      }
    }

    return {
      success: errors.length === 0,
      items: updatedItems,
      errors,
    };
  }

  /**
   * Moves a single item to a new position (drag-and-drop support).
   * Automatically updates sibling positions to maintain order.
   * 
   * Requirements: 3.5
   * 
   * @param templateId - Template ID
   * @param input - Move item input with itemId, newParentId, and newPosition
   * @returns BatchItemResult with all updated items
   */
  async moveItem(templateId: string, input: MoveItemInput): Promise<BatchItemResult> {
    const updatedItems: Item[] = [];
    const errors: ItemError[] = [];

    try {
      // Get the item being moved
      const itemResult = await this.getById(input.itemId);
      if (!itemResult.success || !itemResult.item) {
        return {
          success: false,
          items: [],
          errors: [itemResult.error || { code: ItemErrorCodes.NOT_FOUND, message: 'Item not found' }],
        };
      }

      const movingItem = itemResult.item;
      const oldParentId = movingItem.parent;
      const oldPosition = movingItem.position;
      const newParentId = input.newParentId ?? null;
      const newPosition = input.newPosition;

      // Check if actually moving
      const isSameParent = oldParentId === newParentId;
      const isSamePosition = oldPosition === newPosition;

      if (isSameParent && isSamePosition) {
        // No change needed
        return {
          success: true,
          items: [movingItem],
          errors: [],
        };
      }

      // Validate new parent if changing parent
      if (!isSameParent && newParentId !== null) {
        try {
          const newParent = await this.pb
            .collection(Collections.ITEMS)
            .getOne<Item>(newParentId);

          // Check max depth
          const parentDepth = getPathDepth(newParent.path);
          if (parentDepth >= MAX_NESTING_DEPTH) {
            return {
              success: false,
              items: [],
              errors: [{
                code: ItemErrorCodes.MAX_DEPTH_EXCEEDED,
                message: `Maximum nesting depth of ${MAX_NESTING_DEPTH} exceeded`,
                details: { currentDepth: parentDepth, maxDepth: MAX_NESTING_DEPTH },
              }],
            };
          }

          // Prevent circular reference
          if (isDescendantPath(newParent.path, movingItem.path)) {
            return {
              success: false,
              items: [],
              errors: [{
                code: ItemErrorCodes.CIRCULAR_REFERENCE,
                message: 'Cannot move an item to be a child of its own descendant',
              }],
            };
          }
        } catch {
          return {
            success: false,
            items: [],
            errors: [{
              code: ItemErrorCodes.PARENT_NOT_FOUND,
              message: 'New parent item not found',
            }],
          };
        }
      }

      // Get siblings at the old location (to update their positions)
      if (!isSameParent) {
        const oldSiblings = await this.getItemsByParent(templateId, oldParentId);
        // Update positions of items that were after the moved item
        for (const sibling of oldSiblings) {
          if (sibling.id !== input.itemId && sibling.position > oldPosition) {
            const updateResult = await this.update(sibling.id, {
              position: sibling.position - 1,
            });
            if (updateResult.success && updateResult.item) {
              updatedItems.push(updateResult.item);
            }
          }
        }
      }

      // Get siblings at the new location
      const newSiblings = await this.getItemsByParent(templateId, newParentId);
      
      // Update positions of items at the new location to make room
      for (const sibling of newSiblings) {
        if (sibling.id !== input.itemId && sibling.position >= newPosition) {
          const updateResult = await this.update(sibling.id, {
            position: sibling.position + 1,
          });
          if (updateResult.success && updateResult.item) {
            updatedItems.push(updateResult.item);
          }
        }
      }

      // Move the item itself
      const moveResult = await this.update(input.itemId, {
        parentId: newParentId,
        position: newPosition,
      });

      if (moveResult.success && moveResult.item) {
        updatedItems.push(moveResult.item);
      } else if (moveResult.error) {
        errors.push(moveResult.error);
      }

      return {
        success: errors.length === 0,
        items: updatedItems,
        errors,
      };

    } catch (err) {
      return {
        success: false,
        items: [],
        errors: [parseError(err)],
      };
    }
  }

  /**
   * Handle reference deletion (when a template is deleted).
   * Converts items referencing the deleted template to standalone copies.
   * 
   * Requirements: 7.6
   * 
   * @param templateId - Deleted template ID
   */
  async handleReferenceDeletion(templateId: string): Promise<{ success: boolean; errors: ItemError[] }> {
    const errors: ItemError[] = [];

    try {
      // Find all items referencing this template
      const itemsToUpdate = await this.pb
        .collection(Collections.ITEMS)
        .getFullList<Item>({
          filter: `reference = "${templateId}"`,
        });

      if (itemsToUpdate.length === 0) {
        return { success: true, errors: [] };
      }

      // Instead of deep copy, we just remove the reference link
      // This effectively keeps the item but it no longer links to a live template
      // Alternatively, we could mark it as "broken reference" or convert to a task
      // Decision: Convert to regular task item type
      for (const item of itemsToUpdate) {
        try {
          await this.pb.collection(Collections.ITEMS).update(item.id, {
            itemType: ItemType.TASK,
            reference: null,
            content: `${item.content} (Reference Removed)`,
          });
        } catch (err) {
          errors.push(parseError(err));
        }
      }

      return {
        success: errors.length === 0,
        errors,
      };
    } catch (err) {
      return {
        success: false,
        errors: [parseError(err)],
      };
    }
  }

  /**
   * Duplicates a set of items within a template.
   * Creates copies with "(Copy)" appended to content, same parent, and position incremented by 1.
   *
   * @param itemIds - Array of item IDs to duplicate
   * @param templateId - Template ID the items belong to
   * @returns BatchItemResult with created copies on success
   */
  async duplicateItems(itemIds: string[], templateId: string): Promise<BatchItemResult> {
    const createdItems: Item[] = [];
    const errors: ItemError[] = [];

    for (const itemId of itemIds) {
      try {
        const original = await this.pb
          .collection(Collections.ITEMS)
          .getOne<Item>(itemId);

        const createData: ItemCreate = {
          blueprint: templateId,
          parent: original.parent ?? undefined,
          path: original.path,
          itemType: original.itemType,
          content: `${original.content} (Copy)`,
          description: original.description ?? undefined,
          resources: original.resources ?? undefined,
          reference: original.reference ?? undefined,
          position: original.position + 1,
          metadata: original.metadata ?? undefined,
        };

        const newItem = await this.pb
          .collection(Collections.ITEMS)
          .create<Item>(createData);

        createdItems.push(newItem);
      } catch (err) {
        errors.push(parseError(err));
      }
    }

    return {
      success: errors.length === 0,
      items: createdItems,
      errors,
    };
  }

  /**
   * Detects circular dependencies in blueprint references.
   * A cycle exists if template A references template B, and template B references template A (directly or indirectly).
   *
   * @param rootTemplateId - The ID of the template where the reference is being added
   * @param targetTemplateId - The ID of the template being referenced
   * @returns Result indicating if cycle exists and the path
   */
  async detectCircularDependency(rootTemplateId: string, targetTemplateId: string): Promise<CircularDependencyResult> {
    const detector = new CircularDependencyDetector(this.pb);
    return detector.detectCycle(rootTemplateId, targetTemplateId);
  }
}
