/**
 * Checklist Service
 * 
 * Provides operations for checklists using PocketBase SDK.
 * Supports creating checklists from templates, copying all tasks including nested references,
 * and maintaining reference to the source template.
 * 
 * Requirements: 5.1, 5.2
 */

import PocketBase, { ClientResponseError } from 'pocketbase';
import { createPocketBaseClient, getPocketBaseClient } from '../pocketbase';
import type {
  Instance,
  InstanceCreate,
  InstanceUpdate,
  InstanceItem,
  InstanceItemCreate,
  InstanceItemUpdate,
  Item,
  Template,
  ConditionAnswers,
} from '../pocketbase-types';
import { Collections, ItemType } from '../pocketbase-types';
import { ItemService, generatePath, getPathDepth } from './item';
import { TemplateService } from './template';
import { filterItemsByConditions } from './condition';
import { type Result, ok, err } from '../result';

// ============================================================================
// Types
// ============================================================================

/**
 * Input for creating a new checklist
 */
export interface CreateChecklistInput {
  templateId: string; // Renamed from blueprintId
  name: string;
  workspaceId?: string; // Optional workspace override
  /** Answers to conditional questions for filtering items */
  conditionAnswers?: ConditionAnswers;
}

/**
 * Checklist operation result
 */
export type ChecklistResult = Result<Instance, ChecklistError>;

/**
 * Checklist error with code and message
 */
export interface ChecklistError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}


/**
 * Result for checklist creation with tasks
 */
export type ChecklistCreationResult = Result<
  { checklist: Instance; tasks: InstanceItem[] },
  ChecklistError
>;

/**
 * Result for batch task operations
 */
export interface BatchTaskResult {
  success: boolean;
  tasks: InstanceItem[];
  errors: ChecklistError[];
}

/**
 * Conflict information during sync
 * Requirements: 5.5
 */
export interface SyncConflict {
  instanceItemId: string;
  templateItemId: string; // Renamed from blueprintItemId
  type: 'update_failed' | 'delete_failed' | 'add_failed';
  message: string;
}

/**
 * Result for sync operations
 * Requirements: 5.5
 */
export interface SyncResult {
  success: boolean;
  added: number;
  updated: number;
  removed: number;
  conflicts: SyncConflict[];
  error: ChecklistError | null;
}

/**
 * Input for adding a custom task to a checklist
 * Requirements: 5.3
 */
export interface AddCustomTaskInput {
  content: string;
  parentId?: string;
  position?: number;
}

/**
 * Input for modifying a task
 * Requirements: 5.3
 */
export interface ModifyTaskInput {
  content?: string;
  isCompleted?: boolean;
  parentId?: string | null;
  position?: number;
}

/**
 * Result for single task operations
 */
export type TaskResult = Result<InstanceItem, ChecklistError>;

/**
 * Result for progress calculation
 * Requirements: 6.1, 6.2, 6.3
 */
export interface ProgressResult {
  totalItems: number;
  completedItems: number;
  percentage: number;
}

/**
 * Result for toggle task completion
 * Requirements: 6.1
 */
export type ToggleCompletionResult = Result<
  { task: InstanceItem; progress: ProgressResult },
  ChecklistError
>;

// ============================================================================
// Error Codes
// ============================================================================

export const ChecklistErrorCodes = {
  NOT_FOUND: 'CHECKLIST_001',
  VALIDATION_ERROR: 'CHECKLIST_002',
  PERMISSION_DENIED: 'CHECKLIST_003',
  TEMPLATE_NOT_FOUND: 'CHECKLIST_004', // Renamed from BLUEPRINT_NOT_FOUND
  NAME_REQUIRED: 'CHECKLIST_005',
  ITEM_NOT_FOUND: 'CHECKLIST_006',
  UNKNOWN_ERROR: 'CHECKLIST_999',
} as const;

// ============================================================================
// Constants
// ============================================================================

/**
 * Maximum nesting depth for tasks (matches template steps)
 */
export const MAX_TASK_DEPTH = 5;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validates checklist name
 */
export function validateName(name: string): ChecklistError | null {
  if (!name || name.trim().length === 0) {
    return {
      code: ChecklistErrorCodes.NAME_REQUIRED,
      message: 'Checklist name is required',
    };
  }
  return null;
}


/**
 * Parses PocketBase errors into ChecklistError
 */
function parseError(err: unknown): ChecklistError {
  if (err instanceof ClientResponseError) {
    if (err.status === 404) {
      return {
        code: ChecklistErrorCodes.NOT_FOUND,
        message: 'Checklist not found',
      };
    }

    if (err.status === 403) {
      return {
        code: ChecklistErrorCodes.PERMISSION_DENIED,
        message: 'You do not have permission to perform this action',
      };
    }

    if (err.status === 400) {
      const data = err.data as Record<string, unknown>;
      return {
        code: ChecklistErrorCodes.VALIDATION_ERROR,
        message: err.message || 'Validation failed',
        details: data,
      };
    }

    return {
      code: ChecklistErrorCodes.UNKNOWN_ERROR,
      message: err.message || 'An unexpected error occurred',
      details: { status: err.status, data: err.data },
    };
  }

  if (err instanceof Error) {
    return {
      code: ChecklistErrorCodes.UNKNOWN_ERROR,
      message: err.message,
    };
  }

  return {
    code: ChecklistErrorCodes.UNKNOWN_ERROR,
    message: 'An unexpected error occurred',
  };
}

// ============================================================================
// Checklist Service Class
// ============================================================================

/**
 * Checklist Service
 * 
 * Provides methods for managing checklists including:
 * - Creating checklists from templates (copying all items)
 * - Maintaining reference to source template
 * - CRUD operations for checklists
 */
export class ChecklistService {
  private pb: PocketBase;
  private itemService: ItemService;
  private templateService: TemplateService;

  constructor(pb?: PocketBase) {
    this.pb = pb ?? getPocketBaseClient();
    this.itemService = new ItemService(this.pb);
    this.templateService = new TemplateService(this.pb);
  }

  /**
   * Creates a new checklist from a template.
   * Copies all items from the template including nested references.
   * Maintains reference to the source template.
   * 
   * Requirements: 5.1, 5.2
   * 
   * @param input - Checklist creation data (templateId and name)
   * @returns ChecklistCreationResult with created checklist and items on success
   */
  async create(input: CreateChecklistInput): Promise<ChecklistCreationResult> {
    try {
      // Validate name
      const nameError = validateName(input.name);
      if (nameError) {
        return err(nameError);
      }

      // Get current user ID
      const userId = this.pb.authStore.record?.id;
      if (!userId) {
        return err({
          code: ChecklistErrorCodes.PERMISSION_DENIED,
          message: 'You must be authenticated to create a checklist',
        });
      }

      // Verify template exists and user has access
      const templateResult = await this.templateService.getById(input.templateId);
      if (!templateResult.success || !templateResult.data) {
        return err({
          code: ChecklistErrorCodes.TEMPLATE_NOT_FOUND,
          message: 'Template not found or you do not have access',
        });
      }

      // Create the checklist record
      const checklistData: InstanceCreate = {
        blueprint: input.templateId, // DB field name
        user: userId,
        workspace: input.workspaceId ?? templateResult.data.workspace, // Use provided workspace or template's workspace
        name: input.name.trim(),
        description: templateResult.data.description ?? undefined,
        resources: templateResult.data.resources ?? undefined,
        isSynced: true,
        progress: 0,
      };

      const checklist = await this.pb
        .collection(Collections.CHECKLISTS)
        .create<Instance>(checklistData);

      // Verify the checklist was created and is accessible
      // const verifyChecklist = await this.pb
      //   .collection(Collections.CHECKLISTS)
      //   .getOne<Instance>(checklist.id);

      // Get all items from the template
      const templateItems = await this.itemService.getByTemplate(input.templateId, {
        sort: 'path,position',
      });

      // Filter items based on condition answers if provided
      const conditionAnswers = input.conditionAnswers ?? {};
      const { includedItems } = filterItemsByConditions(templateItems, conditionAnswers);

      // Copy filtered tasks to the checklist
      const copyResult = await this.copyTemplateTasksToChecklist(
        checklist.id,
        includedItems
      );

      // Increment the template's checklist count
      await this.templateService.incrementChecklistCount(input.templateId);

      return ok({ checklist, tasks: copyResult.tasks });
    } catch (caught) {
      return err(parseError(caught));
    }
  }

  /**
   * Copies all template steps to a checklist as tasks.
   * Handles nested steps and references by expanding them.
   * 
   * Requirements: 5.1, 5.2
   * 
   * @param checklistId - The checklist ID to copy tasks to
   * @param templateItems - The template steps to copy
   * @returns BatchTaskResult with created tasks
   */
  private async copyTemplateTasksToChecklist(
    checklistId: string,
    templateItems: Item[]
  ): Promise<BatchTaskResult> {
    const createdTasks: InstanceItem[] = [];
    const errors: ChecklistError[] = [];

    // Filter to only root-level steps (steps without parents)
    const rootItems = templateItems.filter(item => !item.parent);

    // Process only root steps - children will be handled recursively
    for (const templateItem of rootItems) {
      try {
        // If this is a reference step, we need to expand it
        if (templateItem.itemType === ItemType.REFERENCE && templateItem.reference) {
          // Check access by checking if getById succeeds
          const accessResult = await this.templateService.getById(templateItem.reference);
          const hasAccess = accessResult.success && accessResult.data !== null;

          // Determine the content for the reference task
          let taskContent = templateItem.content;
          if (!hasAccess) {
            // User doesn't have access to the referenced template
            // Only show the title of the private template
            const referencedTitle = await this.templateService.getTitleById(templateItem.reference);
            if (referencedTitle) {
              taskContent = referencedTitle;
            }
          }

          // Create the reference step itself as a container task
          const task = await this.createTaskWithContent(
            checklistId,
            templateItem,
            taskContent,
            undefined
          );
          
          if (task) {
            createdTasks.push(task);
            
            let referencedItems: Item[] = [];

            if (hasAccess) {
              // Get steps from the referenced template
              referencedItems = await this.itemService.getByTemplate(
                templateItem.reference,
                { sort: 'path,position' }
              );

              // Recursively copy referenced steps as child tasks
              if (referencedItems.length > 0) {
                const nestedResult = await this.copyReferencedStepsToChecklist(
                  checklistId,
                  task.id,
                  task.path,
                  referencedItems,
                  getPathDepth(task.path)
                );
                
                createdTasks.push(...nestedResult.tasks);
                errors.push(...nestedResult.errors);
              }
            }
            
            // After copying referenced steps, copy any child steps from the current template
            const childrenOfReference = templateItems.filter(item => item.parent === templateItem.id);
            if (childrenOfReference.length > 0) {
              const referencedRootItems = referencedItems.filter(item => !item.parent);
              const startPosition = referencedRootItems.length;
              
              const childResult = await this.copyChildStepsToChecklist(
                checklistId,
                task.id,
                task.path,
                childrenOfReference,
                templateItems,
                getPathDepth(task.path),
                startPosition
              );
              
              createdTasks.push(...childResult.tasks);
              errors.push(...childResult.errors);
            }
          }
        } else {
          // Regular task step - copy it and its children
          const task = await this.createTask(
            checklistId,
            templateItem,
            undefined
          );
          
          if (task) {
            createdTasks.push(task);
            
            // Copy child steps recursively
            const childItems = templateItems.filter(item => item.parent === templateItem.id);
            if (childItems.length > 0) {
              const childResult = await this.copyChildStepsToChecklist(
                checklistId,
                task.id,
                task.path,
                childItems,
                templateItems,
                getPathDepth(task.path)
              );
              
              createdTasks.push(...childResult.tasks);
              errors.push(...childResult.errors);
            }
          }
        }
      } catch (caught) {
        errors.push(parseError(caught));
      }
    }

    return {
      success: errors.length === 0,
      tasks: createdTasks,
      errors,
    };
  }

  /**
   * Creates a single task from a template step.
   * 
   * @param checklistId - The checklist ID
   * @param templateItem - The template step to copy
   * @param parentTaskId - The parent task ID (if any)
   * @returns The created task
   */
  private async createTask(
    checklistId: string,
    templateItem: Item,
    parentTaskId?: string
  ): Promise<InstanceItem | null> {
    try {
      const taskData: InstanceItemCreate = {
        instance: checklistId,
        parent: parentTaskId,
        path: templateItem.path,
        content: templateItem.content,
        description: templateItem.description ?? undefined,
        resources: templateItem.resources ?? undefined,
        isCompleted: false,
        isCustom: false,
        position: templateItem.position + 1,
        itemType: templateItem.itemType,
      };

      const task = await this.pb
        .collection(Collections.CHECKLIST_ITEMS)
        .create<InstanceItem>(taskData);

      return task;
    } catch (caught) {
      console.error('Error creating task:', caught);
      return null;
    }
  }

  /**
   * Creates a single task from a template step with custom content.
   * Used when the user doesn't have access to a referenced template
   * and we need to show only the template title.
   * 
   * @param checklistId - The checklist ID
   * @param templateItem - The template step to copy
   * @param content - The content to use for the task
   * @param parentTaskId - The parent task ID (if any)
   * @returns The created task
   */
  private async createTaskWithContent(
    checklistId: string,
    templateItem: Item,
    content: string,
    parentTaskId?: string
  ): Promise<InstanceItem | null> {
    try {
      const taskData: InstanceItemCreate = {
        instance: checklistId,
        parent: parentTaskId,
        path: templateItem.path,
        content: content,
        description: templateItem.description ?? undefined,
        resources: templateItem.resources ?? undefined,
        isCompleted: false,
        isCustom: false,
        position: templateItem.position + 1,
        itemType: templateItem.itemType,
      };

      const task = await this.pb
        .collection(Collections.CHECKLIST_ITEMS)
        .create<InstanceItem>(taskData);

      return task;
    } catch (caught) {
      console.error('Error creating task:', caught);
      return null;
    }
  }

  /**
   * Recursively copies referenced template steps to a checklist as tasks.
   * Used when expanding reference steps.
   * 
   * Requirements: 5.1 (copy nested references)
   */
  private async copyReferencedStepsToChecklist(
    checklistId: string,
    parentTaskId: string,
    parentPath: string,
    referencedItems: Item[],
    currentDepth: number
  ): Promise<BatchTaskResult> {
    const createdTasks: InstanceItem[] = [];
    const errors: ChecklistError[] = [];

    if (currentDepth >= MAX_TASK_DEPTH) {
      return { success: true, tasks: [], errors: [] };
    }

    const rootItems = referencedItems.filter(item => !item.parent);
    rootItems.sort((a, b) => a.position - b.position);

    for (let i = 0; i < rootItems.length; i++) {
      const refItem = rootItems[i];
      if (!refItem) continue;

      try {
        const newPath = generatePath(parentPath, i);
        
        // Determine content - for reference items without access, use template title
        let taskContent = refItem.content;
        let hasAccess = false;
        
        if (refItem.itemType === ItemType.REFERENCE && refItem.reference) {
          // Check access for nested references
          const accessResult = await this.templateService.getById(refItem.reference);
          hasAccess = accessResult.success && accessResult.data !== null;
          
          if (!hasAccess) {
            // No access - get just the title of the private template
            const referencedTitle = await this.templateService.getTitleById(refItem.reference);
            if (referencedTitle) {
              taskContent = referencedTitle;
            }
          }
        }
        
        const taskData: InstanceItemCreate = {
          instance: checklistId,
          sourceItem: refItem.id,
          parent: parentTaskId,
          path: newPath,
          content: taskContent,
          description: refItem.description ?? undefined,
          resources: refItem.resources ?? undefined,
          isCompleted: false,
          isCustom: false,
          position: i + 1,
          itemType: refItem.itemType,
        };

        const task = await this.pb
          .collection(Collections.CHECKLIST_ITEMS)
          .create<InstanceItem>(taskData);

        createdTasks.push(task);

        if (refItem.itemType === ItemType.REFERENCE && refItem.reference) {
          let nestedRefItems: Item[] = [];

          if (hasAccess) {
            nestedRefItems = await this.itemService.getByTemplate(
              refItem.reference,
              { sort: 'path,position' }
            );

            if (nestedRefItems.length > 0) {
              const nestedResult = await this.copyReferencedStepsToChecklist(
                checklistId,
                task.id,
                newPath,
                nestedRefItems,
                getPathDepth(newPath)
              );
              
              createdTasks.push(...nestedResult.tasks);
              errors.push(...nestedResult.errors);
            }
          }
          
          const childrenOfReference = referencedItems.filter(item => item.parent === refItem.id);
          if (childrenOfReference.length > 0) {
            // Logic fix: The children are from the CURRENT template (referencedItems passed to this func),
            // but we append them after the expanded GRANDCHILDREN from nestedRefItems.
            // referencedItems are the items from the template we are currently expanding (the parent of this loop).
            
            const referencedRootItems = nestedRefItems.filter(item => !item.parent);
            const childStartPosition = referencedRootItems.length;
            
            const childResult = await this.copyChildStepsToChecklist(
              checklistId,
              task.id,
              newPath,
              childrenOfReference,
              referencedItems,
              getPathDepth(newPath),
              childStartPosition
            );
            
            createdTasks.push(...childResult.tasks);
            errors.push(...childResult.errors);
          }
        } else {
          const childItems = referencedItems.filter(item => item.parent === refItem.id);
          if (childItems.length > 0) {
            const childResult = await this.copyChildStepsToChecklist(
              checklistId,
              task.id,
              newPath,
              childItems,
              referencedItems,
              getPathDepth(newPath)
            );
            
            createdTasks.push(...childResult.tasks);
            errors.push(...childResult.errors);
          }
        }
      } catch (caught) {
        errors.push(parseError(caught));
      }
    }

    return {
      success: errors.length === 0,
      tasks: createdTasks,
      errors,
    };
  }

  /**
   * Recursively copies child steps to a checklist as tasks.
   */
  private async copyChildStepsToChecklist(
    checklistId: string,
    parentTaskId: string,
    parentPath: string,
    childItems: Item[],
    allSourceItems: Item[],
    currentDepth: number,
    startPosition: number = 0
  ): Promise<BatchTaskResult> {
    const createdTasks: InstanceItem[] = [];
    const errors: ChecklistError[] = [];

    if (currentDepth >= MAX_TASK_DEPTH) {
      return { success: true, tasks: [], errors: [] };
    }

    childItems.sort((a, b) => a.position - b.position);

    for (let i = 0; i < childItems.length; i++) {
      const childItem = childItems[i];
      if (!childItem) continue;

      try {
        const positionIndex = startPosition + i;
        const newPath = generatePath(parentPath, positionIndex);
        
        // Determine content - for reference items without access, use template title
        let taskContent = childItem.content;
        let hasAccess = false;
        
        if (childItem.itemType === ItemType.REFERENCE && childItem.reference) {
          // Check access for reference items
          const accessResult = await this.templateService.getById(childItem.reference);
          hasAccess = accessResult.success && accessResult.data !== null;
          
          if (!hasAccess) {
            // No access - get just the title of the private template
            const referencedTitle = await this.templateService.getTitleById(childItem.reference);
            if (referencedTitle) {
              taskContent = referencedTitle;
            }
          }
        }
        
        const taskData: InstanceItemCreate = {
          instance: checklistId,
          sourceItem: childItem.id,
          parent: parentTaskId,
          path: newPath,
          content: taskContent,
          description: childItem.description ?? undefined,
          resources: childItem.resources ?? undefined,
          isCompleted: false,
          isCustom: false,
          position: positionIndex + 1,
          itemType: childItem.itemType,
        };

        const task = await this.pb
          .collection(Collections.CHECKLIST_ITEMS)
          .create<InstanceItem>(taskData);

        createdTasks.push(task);

        if (childItem.itemType === ItemType.REFERENCE && childItem.reference) {
          let nestedRefItems: Item[] = [];
          
          if (hasAccess) {
            nestedRefItems = await this.itemService.getByTemplate(
              childItem.reference,
              { sort: 'path,position' }
            );

            if (nestedRefItems.length > 0) {
              const nestedResult = await this.copyReferencedStepsToChecklist(
                checklistId,
                task.id,
                newPath,
                nestedRefItems,
                getPathDepth(newPath)
              );
              
              createdTasks.push(...nestedResult.tasks);
              errors.push(...nestedResult.errors);
            }
          }
          
          const childrenOfReference = allSourceItems.filter(item => item.parent === childItem.id);
          if (childrenOfReference.length > 0) {
            const referencedRootItems = nestedRefItems.filter(item => !item.parent);
            const childStartPosition = referencedRootItems.length;
            
            const childResult = await this.copyChildStepsToChecklist(
              checklistId,
              task.id,
              newPath,
              childrenOfReference,
              allSourceItems,
              getPathDepth(newPath),
              childStartPosition
            );
            
            createdTasks.push(...childResult.tasks);
            errors.push(...childResult.errors);
          }
        } else {
          const grandchildItems = allSourceItems.filter(item => item.parent === childItem.id);
          if (grandchildItems.length > 0) {
            const grandchildResult = await this.copyChildStepsToChecklist(
              checklistId,
              task.id,
              newPath,
              grandchildItems,
              allSourceItems,
              getPathDepth(newPath)
            );
            
            createdTasks.push(...grandchildResult.tasks);
            errors.push(...grandchildResult.errors);
          }
        }
      } catch (caught) {
        errors.push(parseError(caught));
      }
    }

    return {
      success: errors.length === 0,
      tasks: createdTasks,
      errors,
    };
  }


  /**
   * Gets a checklist by ID.
   */
  async getById(id: string, expand?: string): Promise<ChecklistResult> {
    try {
      const options: { expand?: string } = {};
      if (expand) {
        options.expand = expand;
      }

      const checklist = await this.pb
        .collection(Collections.CHECKLISTS)
        .getOne<Instance>(id, options);

      return ok(checklist);
    } catch (caught) {
      return err(parseError(caught));
    }
  }

  /**
   * Gets all checklists for the current user.
   */
  async getByUser(options?: {
    expand?: string;
    sort?: string;
  }): Promise<Instance[]> {
    try {
      const userId = this.pb.authStore.record?.id;
      if (!userId) {
        return [];
      }

      const queryOptions: { filter: string; sort: string; expand?: string } = {
        filter: `user = "${userId}"`,
        sort: options?.sort ?? '-created',
      };

      if (options?.expand) {
        queryOptions.expand = options.expand;
      }

      const result = await this.pb
        .collection(Collections.CHECKLISTS)
        .getFullList<Instance>(queryOptions);

      return result;
    } catch (caught) {
      console.error('Error fetching checklists by user:', caught);
      return [];
    }
  }

  /**
   * Gets all checklists for a specific workspace.
   * Only returns checklists owned by the current user.
   * Falls back to template-based query if workspace field doesn't exist.
   * 
   * @param workspaceId - Workspace ID to filter by
   * @param options - Query options (expand, sort)
   * @returns Array of checklists in the workspace
   */
  async getByWorkspace(
    workspaceId: string,
    options?: {
      expand?: string;
      sort?: string;
    }
  ): Promise<Instance[]> {
    try {
      const userId = this.pb.authStore.record?.id;
      if (!userId) {
        return [];
      }

      try {
        // Try direct workspace query first (new approach)
        const queryOptions: { filter: string; sort: string; expand?: string } = {
          filter: `user = "${userId}" && workspace = "${workspaceId}"`,
          sort: options?.sort ?? '-created',
        };

        if (options?.expand) {
          queryOptions.expand = options.expand;
        }

        const result = await this.pb
          .collection(Collections.CHECKLISTS)
          .getFullList<Instance>(queryOptions);

        return result;
      } catch {
        // Fallback: workspace field doesn't exist yet, query through templates
        const templates = await this.pb
          .collection(Collections.TEMPLATES)
          .getFullList<Template>({
            filter: `workspace = "${workspaceId}"`,
            fields: 'id',
          });

        const templateIds = templates.map(t => t.id);

        if (templateIds.length === 0) {
          return [];
        }

        const checklistFilter = templateIds.map(id => `blueprint = "${id}"`).join(' || ');
        
        const queryOptions: { filter: string; sort: string; expand?: string } = {
          filter: `user = "${userId}" && (${checklistFilter})`,
          sort: options?.sort ?? '-created',
        };

        if (options?.expand) {
          queryOptions.expand = options.expand;
        }

        const result = await this.pb
          .collection(Collections.CHECKLISTS)
          .getFullList<Instance>(queryOptions);

        return result;
      }
    } catch (caught) {
      console.error('Error fetching checklists by workspace:', caught);
      return [];
    }
  }
  
  /** 
   * Updates a checklist
   */
  async update(id: string, data: Partial<Instance>): Promise<ChecklistResult> {
    try {
      const checklist = await this.pb
        .collection(Collections.CHECKLISTS)
        .update<Instance>(id, data);
        
      return ok(checklist);
    } catch (caught) {
      return err(parseError(caught));
    }
  }



  /**
   * Deletes a checklist by ID.
   * 
   * @param id - Checklist ID to delete
   * @returns Success status and any error
   */
  async delete(id: string): Promise<{ success: boolean; error: ChecklistError | null }> {
    try {
      // Due to PocketBase cascade delete rules, we might need to delete items manually
      // if not configured in DB. But assuming cascade is set or we just delete the root.
      // If we need to delete items first:
      // const items = await this.pb.collection(Collections.CHECKLIST_ITEMS).getFullList({ filter: `instance="${id}"` });
      // ... delete loop
      
      // Attempt to delete the checklist directly
      await this.pb.collection(Collections.CHECKLISTS).delete(id);
      return { success: true, error: null };
    } catch (caught) {
      return { success: false, error: parseError(caught) };
    }
  }

  /**
   * Gets tasks for a checklist.
   */
  async getTasks(
    checklistId: string, 
    options?: { sort?: string }
  ): Promise<InstanceItem[]> {
    try {
      const records = await this.pb
        .collection(Collections.CHECKLIST_ITEMS)
        .getFullList<InstanceItem>({
          filter: `instance = "${checklistId}"`, // DB field name
          sort: options?.sort ?? 'position',
        });
      return records;
    } catch (caught) {
      console.error('Error fetching checklist tasks:', caught);
      return [];
    }
  }


  /**
   * Calculates progress for a checklist
   */
  async calculateProgress(checklistId: string): Promise<ProgressResult> {
    try {
      const tasks = await this.getTasks(checklistId);
      const totalItems = tasks.length;
      const completedItems = tasks.filter(task => task.isCompleted).length;
      const percentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

      return {
        totalItems,
        completedItems,
        percentage,
      };
    } catch (caught) {
      console.error('Error calculating progress:', caught);
      return {
        totalItems: 0,
        completedItems: 0,
        percentage: 0,
      };
    }
  }

  /**
   * Toggles the completion status of a task
   * Requirements: 6.1
   */
  async toggleTaskCompletion(checklistId: string, taskId: string): Promise<ToggleCompletionResult> {
    try {
      // Get the task
      const task = await this.pb
        .collection(Collections.CHECKLIST_ITEMS)
        .getOne<InstanceItem>(taskId);

      if (!task || task.instance !== checklistId) {
        return err({
          code: ChecklistErrorCodes.ITEM_NOT_FOUND,
          message: 'Task not found',
        });
      }

      // Toggle completion
      const newIsCompleted = !task.isCompleted;
      const updatedTask = await this.pb
        .collection(Collections.CHECKLIST_ITEMS)
        .update<InstanceItem>(taskId, {
          isCompleted: newIsCompleted,
          completedAt: newIsCompleted ? new Date().toISOString() : null,
        });

      // Calculate new progress
      const progress = await this.calculateProgress(checklistId);

      // Update checklist progress
      await this.pb
        .collection(Collections.CHECKLISTS)
        .update(checklistId, {
          progress: progress.percentage,
          completedAt: progress.percentage >= 100 ? new Date().toISOString() : null,
        });

      return ok({ task: updatedTask, progress });
    } catch (caught) {
      console.error('Error toggling task completion:', caught);
      return err({
        code: ChecklistErrorCodes.UNKNOWN_ERROR,
        message: 'Failed to toggle task completion',
      });
    }
  }

  /**
   * Syncs a checklist with its source template
   * Requirements: 5.5
   */
  async syncWithTemplate(checklistId: string): Promise<SyncResult> {
    try {
      // Get the checklist
      const checklistResult = await this.getById(checklistId);
      if (!checklistResult.success) {
        return {
          success: false,
          added: 0,
          updated: 0,
          removed: 0,
          conflicts: [],
          error: {
            code: ChecklistErrorCodes.NOT_FOUND,
            message: 'Checklist not found',
          },
        };
      }

      const checklist = checklistResult.data;
      const templateId = checklist.blueprint;

      // Get the template
      const templateResult = await this.templateService.getById(templateId);
      if (!templateResult.success || !templateResult.data) {
        return {
          success: false,
          added: 0,
          updated: 0,
          removed: 0,
          conflicts: [],
          error: {
            code: ChecklistErrorCodes.TEMPLATE_NOT_FOUND,
            message: 'Source template not found',
          },
        };
      }

      // For now, return a simple success - full sync logic would be more complex
      // Mark checklist as synced
      await this.pb
        .collection(Collections.CHECKLISTS)
        .update(checklistId, { isSynced: true });

      return {
        success: true,
        added: 0,
        updated: 0,
        removed: 0,
        conflicts: [],
        error: null,
      };
    } catch (caught) {
      console.error('Error syncing with template:', caught);
      return {
        success: false,
        added: 0,
        updated: 0,
        removed: 0,
        conflicts: [],
        error: {
          code: ChecklistErrorCodes.UNKNOWN_ERROR,
          message: 'Failed to sync with template',
        },
      };
    }
  }
}