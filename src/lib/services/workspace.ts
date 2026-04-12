/**
 * Workspace Service
 * 
 * Provides CRUD operations for workspaces using PocketBase SDK.
 * Implements create, update, archive, getById, and getByOwner methods.
 * 
 * Requirements: 9.1, 9.5
 */

import PocketBase, { ClientResponseError } from 'pocketbase';
import { getPocketBaseClient } from '../pocketbase';
import { makeServiceAccessor } from './_service-factory';
import type {
  Workspace,
  WorkspaceCreate,
  WorkspaceUpdate,
  WorkspaceSettings,
  Template,
  Instance, // Should be Checklist
} from '../pocketbase-types';
import { Collections, Visibility } from '../pocketbase-types';

// ============================================================================
// Types
// ============================================================================

/**
 * Input for creating a new workspace
 */
export interface CreateWorkspaceInput {
  name: string;
  description?: string;
  settings?: WorkspaceSettings;
}

/**
 * Input for updating a workspace
 */
export interface UpdateWorkspaceInput {
  name?: string;
  description?: string;
  settings?: WorkspaceSettings;
}

/**
 * Paginated result for workspace queries
 */
export interface PaginatedResult<T> {
  items: T[];
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
}

/**
 * Workspace operation result
 */
export interface WorkspaceResult {
  success: boolean;
  workspace: Workspace | null;
  error: WorkspaceError | null;
}

/**
 * Workspace error with code and message
 */
export interface WorkspaceError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Workspace statistics
 */
export interface WorkspaceStatistics {
  templateCount: number; // Renamed from blueprintCount
  checklistCount: number;
  overallProgress: number;
}

// ============================================================================
// Error Codes
// ============================================================================

export const WorkspaceErrorCodes = {
  NOT_FOUND: 'WORKSPACE_001',
  VALIDATION_ERROR: 'WORKSPACE_002',
  PERMISSION_DENIED: 'WORKSPACE_003',
  NAME_REQUIRED: 'WORKSPACE_004',
  NAME_TOO_LONG: 'WORKSPACE_005',
  ALREADY_ARCHIVED: 'WORKSPACE_006',
  NOT_ARCHIVED: 'WORKSPACE_007',
  UNKNOWN_ERROR: 'WORKSPACE_999',
} as const;

// ============================================================================
// Constants
// ============================================================================

/**
 * Maximum name length for workspaces
 */
export const MAX_NAME_LENGTH = 100;

/**
 * Default page size for list queries
 */
export const DEFAULT_PAGE_SIZE = 30;

/**
 * Default workspace name for new users
 */
export const DEFAULT_WORKSPACE_NAME = 'Personal';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validates workspace name
 */
export function validateName(name: string): WorkspaceError | null {
  if (!name || name.trim().length === 0) {
    return {
      code: WorkspaceErrorCodes.NAME_REQUIRED,
      message: 'Workspace name is required',
    };
  }

  if (name.length > MAX_NAME_LENGTH) {
    return {
      code: WorkspaceErrorCodes.NAME_TOO_LONG,
      message: `Workspace name must be ${MAX_NAME_LENGTH} characters or less`,
      details: { maxLength: MAX_NAME_LENGTH, actualLength: name.length },
    };
  }

  return null;
}

/**
 * Creates a successful WorkspaceResult
 */
function createSuccessResult(workspace: Workspace): WorkspaceResult {
  return {
    success: true,
    workspace,
    error: null,
  };
}

/**
 * Creates an error WorkspaceResult
 */
function createErrorResult(error: WorkspaceError): WorkspaceResult {
  return {
    success: false,
    workspace: null,
    error,
  };
}

/**
 * Parses PocketBase errors into WorkspaceError
 */
function parseError(err: unknown): WorkspaceError {
  if (err instanceof ClientResponseError) {
    if (err.status === 404) {
      return {
        code: WorkspaceErrorCodes.NOT_FOUND,
        message: 'Workspace not found',
      };
    }

    if (err.status === 403) {
      return {
        code: WorkspaceErrorCodes.PERMISSION_DENIED,
        message: 'You do not have permission to perform this action',
      };
    }

    if (err.status === 400) {
      const data = err.data as Record<string, unknown>;
      return {
        code: WorkspaceErrorCodes.VALIDATION_ERROR,
        message: err.message || 'Validation failed',
        details: data,
      };
    }

    return {
      code: WorkspaceErrorCodes.UNKNOWN_ERROR,
      message: err.message || 'An unexpected error occurred',
      details: { status: err.status, data: err.data },
    };
  }

  if (err instanceof Error) {
    return {
      code: WorkspaceErrorCodes.UNKNOWN_ERROR,
      message: err.message,
    };
  }

  return {
    code: WorkspaceErrorCodes.UNKNOWN_ERROR,
    message: 'An unexpected error occurred',
  };
}

// ============================================================================
// Workspace Service Class
// ============================================================================

/**
 * Workspace Service
 * 
 * Provides methods for managing workspaces including:
 * - CRUD operations (create, read, update, archive)
 * - Owner-based queries
 * - Statistics calculation
 */
export class WorkspaceService {
  private pb: PocketBase;

  constructor(pb?: PocketBase) {
    this.pb = pb ?? getPocketBaseClient();
  }

  /**
   * Creates a new workspace.
   * Sets the current user as owner.
   * 
   * Requirements: 9.1
   * 
   * @param input - Workspace creation data
   * @returns WorkspaceResult with created workspace on success
   */
  async create(input: CreateWorkspaceInput): Promise<WorkspaceResult> {
    try {
      // Validate name
      const nameError = validateName(input.name);
      if (nameError) {
        return createErrorResult(nameError);
      }

      // Get current user ID
      const userId = this.pb.authStore.record?.id;
      if (!userId) {
        return createErrorResult({
          code: WorkspaceErrorCodes.PERMISSION_DENIED,
          message: 'You must be authenticated to create a workspace',
        });
      }

      // Create workspace data
      const createData: WorkspaceCreate = {
        owner: userId,
        name: input.name.trim(),
        description: input.description?.trim(),
        settings: input.settings ?? {},
        isArchived: false,
      };

      const workspace = await this.pb
        .collection(Collections.WORKSPACES)
        .create<Workspace>(createData);

      return createSuccessResult(workspace);
    } catch (err) {
      return createErrorResult(parseError(err));
    }
  }

  /**
   * Updates an existing workspace.
   * 
   * Requirements: 9.1
   * 
   * @param id - Workspace ID
   * @param input - Update data
   * @returns WorkspaceResult with updated workspace on success
   */
  async update(id: string, input: UpdateWorkspaceInput): Promise<WorkspaceResult> {
    try {
      // Validate name if provided
      if (input.name !== undefined) {
        const nameError = validateName(input.name);
        if (nameError) {
          return createErrorResult(nameError);
        }
      }

      // Build update data
      const updateData: WorkspaceUpdate = {};

      if (input.name !== undefined) {
        updateData.name = input.name.trim();
      }
      if (input.description !== undefined) {
        updateData.description = input.description?.trim();
      }
      if (input.settings !== undefined) {
        updateData.settings = input.settings;
      }

      const workspace = await this.pb
        .collection(Collections.WORKSPACES)
        .update<Workspace>(id, updateData);

      return createSuccessResult(workspace);
    } catch (err) {
      return createErrorResult(parseError(err));
    }
  }

  /**
   * Archives a workspace.
   * Archived workspaces are hidden from active view but data is preserved.
   * 
   * Requirements: 9.5
   * 
   * @param id - Workspace ID to archive
   * @returns WorkspaceResult with archived workspace on success
   */
  async archive(id: string): Promise<WorkspaceResult> {
    try {
      // Get current workspace to check if already archived
      const current = await this.pb
        .collection(Collections.WORKSPACES)
        .getOne<Workspace>(id);

      if (current.isArchived) {
        return createErrorResult({
          code: WorkspaceErrorCodes.ALREADY_ARCHIVED,
          message: 'Workspace is already archived',
        });
      }

      const workspace = await this.pb
        .collection(Collections.WORKSPACES)
        .update<Workspace>(id, { isArchived: true });

      return createSuccessResult(workspace);
    } catch (err) {
      return createErrorResult(parseError(err));
    }
  }

  /**
   * Unarchives a workspace.
   * Restores an archived workspace to active view.
   * 
   * @param id - Workspace ID to unarchive
   * @returns WorkspaceResult with unarchived workspace on success
   */
  async unarchive(id: string): Promise<WorkspaceResult> {
    try {
      // Get current workspace to check if archived
      const current = await this.pb
        .collection(Collections.WORKSPACES)
        .getOne<Workspace>(id);

      if (!current.isArchived) {
        return createErrorResult({
          code: WorkspaceErrorCodes.NOT_ARCHIVED,
          message: 'Workspace is not archived',
        });
      }

      const workspace = await this.pb
        .collection(Collections.WORKSPACES)
        .update<Workspace>(id, { isArchived: false });

      return createSuccessResult(workspace);
    } catch (err) {
      return createErrorResult(parseError(err));
    }
  }

  /**
   * Deletes a workspace by ID.
   * 
   * @param id - Workspace ID to delete
   * @returns Success status and any error
   */
  async delete(id: string): Promise<{ success: boolean; error: WorkspaceError | null }> {
    try {
      await this.pb.collection(Collections.WORKSPACES).delete(id);
      return { success: true, error: null };
    } catch (err) {
      return { success: false, error: parseError(err) };
    }
  }

  /**
   * Gets a workspace by ID.
   * 
   * @param id - Workspace ID
   * @param expand - Optional relations to expand (e.g., 'owner')
   * @returns WorkspaceResult with workspace on success
   */
  async getById(id: string, expand?: string): Promise<WorkspaceResult> {
    try {
      const options: { expand?: string } = {};
      if (expand) {
        options.expand = expand;
      }

      const workspace = await this.pb
        .collection(Collections.WORKSPACES)
        .getOne<Workspace>(id, options);

      return createSuccessResult(workspace);
    } catch (err) {
      return createErrorResult(parseError(err));
    }
  }

  /**
   * Gets all workspaces owned by the current user.
   * 
   * @param options - Query options (page, limit, includeArchived)
   * @returns Paginated list of workspaces
   */
  async getByOwner(options?: {
    page?: number;
    limit?: number;
    includeArchived?: boolean;
    expand?: string;
  }): Promise<PaginatedResult<Workspace>> {
    try {
      const userId = this.pb.authStore.record?.id;
      if (!userId) {
        return {
          items: [],
          page: 1,
          perPage: options?.limit ?? DEFAULT_PAGE_SIZE,
          totalItems: 0,
          totalPages: 0,
        };
      }

      const page = options?.page ?? 1;
      const perPage = options?.limit ?? DEFAULT_PAGE_SIZE;
      const includeArchived = options?.includeArchived ?? false;

      // Build filter - the listRule already filters by owner, so we only need isArchived
      const queryOptions: { filter?: string; sort: string; expand?: string } = {
        sort: '-created',
      };

      if (!includeArchived) {
        queryOptions.filter = 'isArchived = false';
      }

      if (options?.expand) {
        queryOptions.expand = options.expand;
      }

      const result = await this.pb
        .collection(Collections.WORKSPACES)
        .getList<Workspace>(page, perPage, queryOptions);

      return {
        items: result.items,
        page: result.page,
        perPage: result.perPage,
        totalItems: result.totalItems,
        totalPages: result.totalPages,
      };
    } catch (err) {
      console.error('Error fetching workspaces by owner:', err);
      return {
        items: [],
        page: 1,
        perPage: options?.limit ?? DEFAULT_PAGE_SIZE,
        totalItems: 0,
        totalPages: 0,
      };
    }
  }

  /**
   * Gets archived workspaces for the current user.
   * 
   * @param options - Query options (page, limit)
   * @returns Paginated list of archived workspaces
   */
  async getArchived(options?: {
    page?: number;
    limit?: number;
    expand?: string;
  }): Promise<PaginatedResult<Workspace>> {
    try {
      const userId = this.pb.authStore.record?.id;
      if (!userId) {
        return {
          items: [],
          page: 1,
          perPage: options?.limit ?? DEFAULT_PAGE_SIZE,
          totalItems: 0,
          totalPages: 0,
        };
      }

      const page = options?.page ?? 1;
      const perPage = options?.limit ?? DEFAULT_PAGE_SIZE;

      const queryOptions: { filter: string; sort: string; expand?: string } = {
        filter: `owner = "${userId}" && isArchived = true`,
        sort: '-updated',
      };

      if (options?.expand) {
        queryOptions.expand = options.expand;
      }

      const result = await this.pb
        .collection(Collections.WORKSPACES)
        .getList<Workspace>(page, perPage, queryOptions);

      return {
        items: result.items,
        page: result.page,
        perPage: result.perPage,
        totalItems: result.totalItems,
        totalPages: result.totalPages,
      };
    } catch (err) {
      console.error('Error fetching archived workspaces:', err);
      return {
        items: [],
        page: 1,
        perPage: options?.limit ?? DEFAULT_PAGE_SIZE,
        totalItems: 0,
        totalPages: 0,
      };
    }
  }

  /**
   * Checks if the current user is the owner of a workspace.
   * 
   * @param workspaceId - Workspace ID to check
   * @returns true if current user is the owner
   */
  async isOwner(workspaceId: string): Promise<boolean> {
    try {
      const userId = this.pb.authStore.record?.id;
      if (!userId) {
        return false;
      }

      const workspace = await this.pb
        .collection(Collections.WORKSPACES)
        .getOne<Workspace>(workspaceId);

      return workspace.owner === userId;
    } catch {
      return false;
    }
  }

  /**
   * Creates a default "Personal" workspace for a new user.
   * This should be called during user signup.
   * 
   * Requirements: 9.2
   * 
   * @returns WorkspaceResult with created workspace on success
   */
  async createDefaultWorkspace(): Promise<WorkspaceResult> {
    return this.create({
      name: DEFAULT_WORKSPACE_NAME,
      description: 'Your personal workspace',
      settings: {
        defaultVisibility: Visibility.PRIVATE,
      },
    });
  }

  /**
   * Gets workspace statistics including checklist count, template count, and overall progress.
   * 
   * Requirements: 9.6
   * 
   * @param workspaceId - Workspace ID
   * @returns WorkspaceStatistics
   */
  async getStatistics(workspaceId: string): Promise<WorkspaceStatistics> {
    try {
      // Get template count for this workspace
      const templates = await this.pb
        .collection(Collections.TEMPLATES)
        .getList<Template>(1, 1, {
          filter: `workspace = "${workspaceId}"`,
        });

      const templateCount = templates.totalItems;

      // Get checklist count and progress
      // Try using workspace field first, fall back to template-based query if field doesn't exist
      let checklistCount = 0;
      let totalProgress = 0;

      const userId = this.pb.authStore.record?.id;
      if (userId) {
        try {
          // Try direct workspace query first (new approach)
          const checklists = await this.pb
            .collection(Collections.CHECKLISTS)
            .getFullList<Instance>({
              filter: `user = "${userId}" && workspace = "${workspaceId}"`,
              fields: 'id,progress',
            });

          checklistCount = checklists.length;
          
          if (checklists.length > 0) {
            totalProgress = checklists.reduce((sum, inst) => sum + (inst.progress ?? 0), 0);
            totalProgress = totalProgress / checklists.length;
          }
        } catch {
          // Fallback: workspace field doesn't exist yet, query through templates
          const allTemplates = await this.pb
            .collection(Collections.TEMPLATES)
            .getFullList<Template>({
              filter: `workspace = "${workspaceId}"`,
              fields: 'id',
            });

          const templateIds = allTemplates.map(t => t.id);

          if (templateIds.length > 0) {
            const checklistFilter = templateIds.map(id => `blueprint = "${id}"`).join(' || ');
            
            const checklists = await this.pb
              .collection(Collections.CHECKLISTS)
              .getFullList<Instance>({
                filter: `user = "${userId}" && (${checklistFilter})`,
                fields: 'id,progress',
              });

            checklistCount = checklists.length;
            
            if (checklists.length > 0) {
              totalProgress = checklists.reduce((sum, inst) => sum + (inst.progress ?? 0), 0);
              totalProgress = totalProgress / checklists.length;
            }
          }
        }
      }

      return {
        templateCount,
        checklistCount,
        overallProgress: Math.round(totalProgress * 100) / 100,
      };
    } catch (err) {
      console.error('Error calculating workspace statistics:', err);
      return {
        templateCount: 0,
        checklistCount: 0,
        overallProgress: 0,
      };
    }
  }

  /**
   * Gets the underlying PocketBase client.
   * Useful for advanced operations.
   */
  getPocketBase(): PocketBase {
    return this.pb;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

const _workspace = makeServiceAccessor(WorkspaceService);
export const createWorkspaceService = _workspace.create;
export const getWorkspaceService = _workspace.get;
