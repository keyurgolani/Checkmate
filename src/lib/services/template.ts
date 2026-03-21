/**
 * Template Service
 * 
 * Provides CRUD operations for checklist templates using PocketBase SDK.
 * Implements create, update, delete, getById, getByWorkspace, and getPublic methods.
 * 
 * Requirements: 3.1, 3.7, 7.6
 */

import PocketBase, { ClientResponseError } from 'pocketbase';
import { createPocketBaseClient, getPocketBaseClient } from '../pocketbase';
import type {
  Template,
  TemplateCreate,
  TemplateUpdate,
  Collaborator,
  ResourceLink,
} from '../pocketbase-types';
import { Collections, Visibility } from '../pocketbase-types';
import { ItemService } from './item';

// ============================================================================
// Types
// ============================================================================

/**
 * Input for creating a new template
 */
export interface CreateTemplateInput {
  workspaceId: string;
  title: string;
  description?: string;
  category?: string;
  tags?: string[];
  visibility?: Visibility;
  questions?: Array<{
    id: string;
    question: string;
    answerType: 'boolean' | 'enum';
    enumOptions?: string[];
    defaultValue?: boolean | string;
  }>;
  resources?: ResourceLink[];
}

/**
 * Input for updating a template
 */
export interface UpdateTemplateInput {
  title?: string;
  description?: string;
  category?: string;
  tags?: string[];
  visibility?: Visibility;
  questions?: Array<{
    id: string;
    question: string;
    answerType: 'boolean' | 'enum';
    enumOptions?: string[];
    defaultValue?: boolean | string;
  }> | null;
  resources?: ResourceLink[] | null;
}

/**
 * Search filters for querying templates
 */
export interface SearchFilters {
  category?: string;
  tags?: string[];
  sortBy?: 'relevance' | 'popularity' | 'rating' | 'date';
  page?: number;
  limit?: number;
}

/**
 * Paginated result for template queries
 */
export interface PaginatedResult<T> {
  items: T[];
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
}

/**
 * Template operation result
 */
export interface TemplateResult {
  success: boolean;
  template: Template | null;
  error: TemplateError | null;
}

/**
 * Template error with code and message
 */
export interface TemplateError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// Error Codes
// ============================================================================

export const TemplateErrorCodes = {
  NOT_FOUND: 'TEMPLATE_001',
  VALIDATION_ERROR: 'TEMPLATE_002',
  PERMISSION_DENIED: 'TEMPLATE_003',
  WORKSPACE_NOT_FOUND: 'TEMPLATE_004',
  TITLE_REQUIRED: 'TEMPLATE_005',
  TITLE_TOO_LONG: 'TEMPLATE_006',
  INVALID_VISIBILITY: 'TEMPLATE_007',
  SHARED_REQUIRES_COLLABORATORS: 'TEMPLATE_008',
  UNKNOWN_ERROR: 'TEMPLATE_999',
} as const;

// ============================================================================
// Constants
// ============================================================================

/**
 * Maximum title length for templates
 */
export const MAX_TITLE_LENGTH = 200;

/**
 * Default page size for list queries
 */
export const DEFAULT_PAGE_SIZE = 30;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validates template title
 */
export function validateTitle(title: string): TemplateError | null {
  if (!title || title.trim().length === 0) {
    return {
      code: TemplateErrorCodes.TITLE_REQUIRED,
      message: 'Template title is required',
    };
  }

  if (title.length > MAX_TITLE_LENGTH) {
    return {
      code: TemplateErrorCodes.TITLE_TOO_LONG,
      message: `Template title must be ${MAX_TITLE_LENGTH} characters or less`,
      details: { maxLength: MAX_TITLE_LENGTH, actualLength: title.length },
    };
  }

  return null;
}

/**
 * Validates visibility value
 */
export function validateVisibility(visibility: string): TemplateError | null {
  const validValues = Object.values(Visibility);
  if (!validValues.includes(visibility as Visibility)) {
    return {
      code: TemplateErrorCodes.INVALID_VISIBILITY,
      message: `Invalid visibility value. Must be one of: ${validValues.join(', ')}`,
      details: { providedValue: visibility, allowedValues: validValues },
    };
  }
  return null;
}

/**
 * Creates a successful TemplateResult
 */
function createSuccessResult(template: Template): TemplateResult {
  return {
    success: true,
    template,
    error: null,
  };
}

/**
 * Creates an error TemplateResult
 */
function createErrorResult(error: TemplateError): TemplateResult {
  return {
    success: false,
    template: null,
    error,
  };
}

/**
 * Parses PocketBase errors into TemplateError
 */
function parseError(err: unknown): TemplateError {
  if (err instanceof ClientResponseError) {
    if (err.status === 404) {
      return {
        code: TemplateErrorCodes.NOT_FOUND,
        message: 'Template not found',
      };
    }

    if (err.status === 403) {
      return {
        code: TemplateErrorCodes.PERMISSION_DENIED,
        message: 'You do not have permission to perform this action',
      };
    }

    if (err.status === 400) {
      const data = err.data as Record<string, unknown>;
      return {
        code: TemplateErrorCodes.VALIDATION_ERROR,
        message: err.message || 'Validation failed',
        details: data,
      };
    }

    return {
      code: TemplateErrorCodes.UNKNOWN_ERROR,
      message: err.message || 'An unexpected error occurred',
      details: { status: err.status, data: err.data },
    };
  }

  if (err instanceof Error) {
    return {
      code: TemplateErrorCodes.UNKNOWN_ERROR,
      message: err.message,
    };
  }

  return {
    code: TemplateErrorCodes.UNKNOWN_ERROR,
    message: 'An unexpected error occurred',
  };
}

/**
 * Builds sort string for PocketBase queries
 */
function buildSortString(sortBy?: SearchFilters['sortBy']): string {
  switch (sortBy) {
    case 'popularity':
      return '-instanceCount';
    case 'rating':
      return '-ratingSum';
    case 'date':
      return '-created';
    case 'relevance':
    default:
      return '-created'; // Default to newest first
  }
}

/**
 * Builds filter string for PocketBase queries
 */
function buildFilterString(filters: SearchFilters, baseFilter?: string): string {
  const conditions: string[] = [];

  if (baseFilter) {
    conditions.push(baseFilter);
  }

  if (filters.category) {
    conditions.push(`category = "${filters.category}"`);
  }

  if (filters.tags && filters.tags.length > 0) {
    // PocketBase array contains check
    const tagConditions = filters.tags.map(tag => `tags ~ "${tag}"`);
    conditions.push(`(${tagConditions.join(' || ')})`);
  }

  return conditions.length > 0 ? conditions.join(' && ') : '';
}

// ============================================================================
// Template Service Class
// ============================================================================

/**
 * Template Service
 * 
 * Provides methods for managing checklist templates including:
 * - CRUD operations (create, read, update, delete)
 * - Workspace-based queries
 * - Public template discovery
 */
export class TemplateService {
  private pb: PocketBase;

  constructor(pb?: PocketBase) {
    this.pb = pb ?? getPocketBaseClient();
  }

  /**
   * Creates a new checklist template.
   * Sets the current user as owner and defaults visibility to private.
   * 
   * Requirements: 3.1
   * 
   * @param input - Template creation data
   * @returns TemplateResult with created template on success
   */
  async create(input: CreateTemplateInput): Promise<TemplateResult> {
    try {
      // Validate title
      const titleError = validateTitle(input.title);
      if (titleError) {
        return createErrorResult(titleError);
      }

      // Get current user ID
      const userId = this.pb.authStore.record?.id;
      if (!userId) {
        return createErrorResult({
          code: TemplateErrorCodes.PERMISSION_DENIED,
          message: 'You must be authenticated to create a template',
        });
      }

      // Verify workspace exists and user has access
      try {
        await this.pb.collection(Collections.WORKSPACES).getOne(input.workspaceId);
      } catch {
        return createErrorResult({
          code: TemplateErrorCodes.WORKSPACE_NOT_FOUND,
          message: 'Workspace not found or you do not have access',
        });
      }

      // Create template data
      const createData: TemplateCreate = {
        workspace: input.workspaceId,
        owner: userId,
        title: input.title.trim(),
        description: input.description?.trim(),
        visibility: input.visibility ?? Visibility.PRIVATE,
        category: input.category?.trim(),
        tags: input.tags ?? [],
        version: 1,
        instanceCount: 0,
        ratingSum: 0,
        ratingCount: 0,
        questions: input.questions ?? [],
        resources: input.resources ?? [],
      };

      const template = await this.pb
        .collection(Collections.TEMPLATES)
        .create<Template>(createData);

      return createSuccessResult(template);
    } catch (err) {
      return createErrorResult(parseError(err));
    }
  }

  /**
   * Updates an existing template.
   * 
   * Requirements: 3.7
   * 
   * @param id - Template ID
   * @param input - Update data
   * @returns TemplateResult with updated template on success
   */
  async update(id: string, input: UpdateTemplateInput): Promise<TemplateResult> {
    try {
      // Validate title if provided
      if (input.title !== undefined) {
        const titleError = validateTitle(input.title);
        if (titleError) {
          return createErrorResult(titleError);
        }
      }

      // Build update data
      const updateData: TemplateUpdate = {};

      if (input.title !== undefined) {
        updateData.title = input.title.trim();
      }
      if (input.description !== undefined) {
        updateData.description = input.description?.trim();
      }
      if (input.category !== undefined) {
        updateData.category = input.category?.trim();
      }
      if (input.tags !== undefined) {
        updateData.tags = input.tags;
      }
      if (input.visibility !== undefined) {
        updateData.visibility = input.visibility;
      }
      if (input.questions !== undefined) {
        updateData.questions = input.questions;
      }
      if (input.resources !== undefined) {
        updateData.resources = input.resources;
      }

      const template = await this.pb
        .collection(Collections.TEMPLATES)
        .update<Template>(id, updateData);

      return createSuccessResult(template);
    } catch (err) {
      return createErrorResult(parseError(err));
    }
  }

  /**
   * Deletes a template by ID.
   * Before deletion, converts all items that reference this template to standalone copies.
   * 
   * Requirements: 7.6
   * 
   * @param id - Template ID to delete
   * @param options - Optional settings for deletion behavior
   * @returns Success status and any error
   */
  async delete(
    id: string,
    options?: { skipReferenceHandling?: boolean }
  ): Promise<{ success: boolean; error: TemplateError | null }> {
    try {
      // Handle reference deletion before deleting the template (Requirements: 7.6)
      // This converts all items that reference this template to standalone copies
      if (!options?.skipReferenceHandling) {
        // Note: ItemService needs to be checked if it handles renaming too
        const itemService = new ItemService(this.pb);
        const referenceResult = await itemService.handleReferenceDeletion(id);
        
        if (!referenceResult.success && referenceResult.errors.length > 0) {
          // Log the errors but continue with deletion
          console.warn(
            `Warning: Some references could not be converted during template deletion:`,
            referenceResult.errors
          );
        }
      }

      await this.pb.collection(Collections.TEMPLATES).delete(id);
      return { success: true, error: null };
    } catch (err) {
      return { success: false, error: parseError(err) };
    }
  }

  /**
   * Gets a template by ID.
   * 
   * @param id - Template ID
   * @param expand - Optional relations to expand (e.g., 'owner,workspace')
   * @returns TemplateResult with template on success
   */
  async getById(id: string, expand?: string): Promise<TemplateResult> {
    try {
      const options: { expand?: string } = {};
      if (expand) {
        options.expand = expand;
      }

      const template = await this.pb
        .collection(Collections.TEMPLATES)
        .getOne<Template>(id, options);

      return createSuccessResult(template);
    } catch (err) {
      return createErrorResult(parseError(err));
    }
  }

  /**
   * Gets all templates in a workspace.
   * 
   * @param workspaceId - Workspace ID
   * @param options - Query options (page, limit, sort)
   * @returns Paginated list of templates
   */
  async getByWorkspace(
    workspaceId: string,
    options?: {
      page?: number;
      limit?: number;
      sortBy?: SearchFilters['sortBy'];
      expand?: string;
    }
  ): Promise<PaginatedResult<Template>> {
    try {
      const page = options?.page ?? 1;
      const perPage = options?.limit ?? DEFAULT_PAGE_SIZE;
      const sort = buildSortString(options?.sortBy);

      const queryOptions: { filter: string; sort: string; expand?: string } = {
        filter: `workspace = "${workspaceId}"`,
        sort,
      };

      if (options?.expand) {
        queryOptions.expand = options.expand;
      }

      const result = await this.pb
        .collection(Collections.TEMPLATES)
        .getList<Template>(page, perPage, queryOptions);

      return {
        items: result.items,
        page: result.page,
        perPage: result.perPage,
        totalItems: result.totalItems,
        totalPages: result.totalPages,
      };
    } catch (err) {
      // Return empty result on error
      console.error('Error fetching templates by workspace:', err);
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
   * Gets public templates with optional filtering.
   * 
   * @param filters - Search filters (category, tags, sortBy, pagination)
   * @returns Paginated list of public templates
   */
  async getPublic(filters?: SearchFilters): Promise<PaginatedResult<Template>> {
    try {
      const page = filters?.page ?? 1;
      const perPage = filters?.limit ?? DEFAULT_PAGE_SIZE;
      const sort = buildSortString(filters?.sortBy);

      // Base filter for public visibility
      const baseFilter = 'visibility = "public"';
      const filter = buildFilterString(filters ?? {}, baseFilter);

      const result = await this.pb
        .collection(Collections.TEMPLATES)
        .getList<Template>(page, perPage, {
          filter,
          sort,
          expand: 'owner',
        });

      return {
        items: result.items,
        page: result.page,
        perPage: result.perPage,
        totalItems: result.totalItems,
        totalPages: result.totalPages,
      };
    } catch (err) {
      // Return empty result on error
      console.error('Error fetching public templates:', err);
      return {
        items: [],
        page: 1,
        perPage: filters?.limit ?? DEFAULT_PAGE_SIZE,
        totalItems: 0,
        totalPages: 0,
      };
    }
  }

  /**
   * Gets templates owned by the current user.
   * 
   * @param options - Query options
   * @returns Paginated list of user's templates
   */
  async getByOwner(options?: {
    page?: number;
    limit?: number;
    sortBy?: SearchFilters['sortBy'];
    expand?: string;
  }): Promise<PaginatedResult<Template>> {
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
      const sort = buildSortString(options?.sortBy);

      const queryOptions: { filter: string; sort: string; expand?: string } = {
        filter: `owner = "${userId}"`,
        sort,
      };

      if (options?.expand) {
        queryOptions.expand = options.expand;
      }

      const result = await this.pb
        .collection(Collections.TEMPLATES)
        .getList<Template>(page, perPage, queryOptions);

      return {
        items: result.items,
        page: result.page,
        perPage: result.perPage,
        totalItems: result.totalItems,
        totalPages: result.totalPages,
      };
    } catch (err) {
      console.error('Error fetching templates by owner:', err);
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
   * Increments the checklist count for a template.
   * Called when a new checklist is created from this template.
   * 
   * @param id - Template ID
   * @returns Updated template
   */
  async incrementChecklistCount(id: string): Promise<TemplateResult> {
    try {
      // Get current template to get checklist count
      const current = await this.pb
        .collection(Collections.TEMPLATES)
        .getOne<Template>(id);

      const template = await this.pb
        .collection(Collections.TEMPLATES)
        .update<Template>(id, {
          instanceCount: (current.instanceCount ?? 0) + 1,
        });

      return createSuccessResult(template);
    } catch (err) {
      return createErrorResult(parseError(err));
    }
  }

  /**
   * Increments the version number for a template.
   * Called when template items are modified.
   * 
   * @param id - Template ID
   * @returns Updated template
   */
  async incrementVersion(id: string): Promise<TemplateResult> {
    try {
      // Get current template to get version
      const current = await this.pb
        .collection(Collections.TEMPLATES)
        .getOne<Template>(id);

      const template = await this.pb
        .collection(Collections.TEMPLATES)
        .update<Template>(id, {
          version: (current.version ?? 1) + 1,
        });

      return createSuccessResult(template);
    } catch (err) {
      return createErrorResult(parseError(err));
    }
  }

  /**
   * Checks if the current user is the owner of a template.
   * 
   * @param templateId - Template ID to check
   * @returns true if current user is the owner
   */
  async isOwner(templateId: string): Promise<boolean> {
    try {
      const userId = this.pb.authStore.record?.id;
      if (!userId) {
        return false;
      }

      const template = await this.pb
        .collection(Collections.TEMPLATES)
        .getOne<Template>(templateId);

      return template.owner === userId;
    } catch {
      return false;
    }
  }

  /**
   * Sets the visibility of a template with validation.
   * Enforces that shared visibility requires at least one collaborator.
   * 
   * Requirements: 4.1, 4.2, 4.3
   * 
   * @param templateId - Template ID
   * @param visibility - New visibility value (private, public, shared)
   * @returns TemplateResult with updated template on success
   */
  async setVisibility(templateId: string, visibility: Visibility): Promise<TemplateResult> {
    try {
      // Validate visibility value
      const visibilityError = validateVisibility(visibility);
      if (visibilityError) {
        return createErrorResult(visibilityError);
      }

      // Get current user ID
      const userId = this.pb.authStore.record?.id;
      if (!userId) {
        return createErrorResult({
          code: TemplateErrorCodes.PERMISSION_DENIED,
          message: 'You must be authenticated to change template visibility',
        });
      }

      // Verify template exists and user is the owner
      let template: Template;
      try {
        template = await this.pb
          .collection(Collections.TEMPLATES)
          .getOne<Template>(templateId);
      } catch {
        return createErrorResult({
          code: TemplateErrorCodes.NOT_FOUND,
          message: 'Template not found',
        });
      }

      if (template.owner !== userId) {
        return createErrorResult({
          code: TemplateErrorCodes.PERMISSION_DENIED,
          message: 'Only the owner can change template visibility',
        });
      }

      // If setting to shared, verify at least one collaborator exists
      if (visibility === Visibility.SHARED) {
        const collaborators = await this.pb
          .collection(Collections.COLLABORATORS)
          .getList<Collaborator>(1, 1, {
            filter: `blueprint = "${templateId}"`, // Note: DB field is still 'blueprint'
          });

        if (collaborators.totalItems === 0) {
          return createErrorResult({
            code: TemplateErrorCodes.SHARED_REQUIRES_COLLABORATORS,
            message: 'Cannot set visibility to shared without at least one collaborator',
            details: { 
              hint: 'Add at least one collaborator before setting visibility to shared' 
            },
          });
        }
      }

      // Update the visibility
      const updatedTemplate = await this.pb
        .collection(Collections.TEMPLATES)
        .update<Template>(templateId, { visibility });

      return createSuccessResult(updatedTemplate);
    } catch (err) {
      return createErrorResult(parseError(err));
    }
  }

  /**
   * Gets the count of collaborators for a template.
   * 
   * @param templateId - Template ID
   * @returns Number of collaborators
   */
  async getCollaboratorCount(templateId: string): Promise<number> {
    try {
      const result = await this.pb
        .collection(Collections.COLLABORATORS)
        .getList<Collaborator>(1, 1, {
          filter: `blueprint = "${templateId}"`, // DB field name
        });
      return result.totalItems;
    } catch {
      return 0;
    }
  }

  /**
   * Duplicates a template and all its items.
   * Creates a new private copy with "Copy of" prepended to the title.
   *
   * @param templateId - Template ID to duplicate
   * @returns TemplateResult with the new template on success
   */
  async duplicate(templateId: string): Promise<TemplateResult> {
    try {
      const original = await this.pb.collection(Collections.TEMPLATES).getOne(templateId);

      const newTemplate = await this.pb.collection(Collections.TEMPLATES).create({
        owner: original.owner,
        workspace: original.workspace,
        title: `Copy of ${original.title}`,
        description: original.description,
        visibility: Visibility.PRIVATE,
        category: original.category,
        tags: original.tags,
        questions: original.questions,
        resources: original.resources,
      });

      // Copy all items
      const items = await this.pb.collection(Collections.ITEMS).getFullList({
        filter: `blueprint = "${templateId}"`,
        sort: "path",
      });

      const idMap = new Map<string, string>();

      for (const item of items) {
        const newParent = item.parent ? idMap.get(item.parent) ?? null : null;
        const newItem = await this.pb.collection(Collections.ITEMS).create({
          blueprint: newTemplate.id,
          parent: newParent,
          path: item.path,
          itemType: item.itemType,
          content: item.content,
          description: item.description,
          resources: item.resources,
          reference: item.reference,
          position: item.position,
          metadata: item.metadata,
        });
        idMap.set(item.id, newItem.id);
      }

      return createSuccessResult(newTemplate as Template);
    } catch (error) {
      return createErrorResult({
        code: "TEMPLATE_DUPLICATE_FAILED",
        message: error instanceof Error ? error.message : "Failed to duplicate template",
      });
    }
  }

  /**
   * Gets the underlying PocketBase client.
   * Useful for advanced operations.
   */
  getPocketBase(): PocketBase {
    return this.pb;
  }

  /**
   * Gets just the title of a template by ID using admin privileges.
   * This bypasses access control and is used when a user needs to see
   * the title of a private template that is referenced by a public template.
   * 
   * @param id - Template ID
   * @returns The template title, or null if not found
   */
  async getTitleById(id: string): Promise<string | null> {
    try {
      // Import admin client dynamically to avoid circular dependencies
      const { createAdminClient } = await import('../pocketbase');
      const adminPb = await createAdminClient();
      
      const template = await adminPb
        .collection(Collections.TEMPLATES)
        .getOne<Template>(id, { fields: 'title' });
      
      return template.title;
    } catch {
      return null;
    }
  }

  /**
   * Gets basic information of a template by ID using admin privileges.
   * This is used for the "Request Access" page when a user tries to access
   * a private template they don't have permission to view fully.
   * 
   * @param id - Template ID
   * @returns The template with limited fields, or null if not found
   */
  async getBasicInfoById(id: string): Promise<Template | null> {
    try {
      // Import admin client dynamically to avoid circular dependencies
      const { createAdminClient } = await import('../pocketbase');
      const adminPb = await createAdminClient();
      
      // Fetch only necessary fields for the preview page
      const template = await adminPb
        .collection(Collections.TEMPLATES)
        .getOne<Template>(id, { 
          expand: 'owner',
          fields: 'id,title,description,owner,visibility,instanceCount,ratingSum,ratingCount,created,updated,expand.owner.id,expand.owner.displayName,expand.owner.avatarUrl'
        });
      
      return template;
    } catch {
      return null;
    }
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Creates a new TemplateService instance with a fresh PocketBase client.
 * Use this for server-side operations.
 */
export function createTemplateService(): TemplateService {
  return new TemplateService(createPocketBaseClient());
}

/**
 * Gets the singleton TemplateService instance for client-side usage.
 */
let clientTemplateService: TemplateService | null = null;

export function getTemplateService(): TemplateService {
  if (typeof window === 'undefined') {
    // Server-side: always create a new instance
    return createTemplateService();
  }

  // Client-side: reuse the same instance
  if (!clientTemplateService) {
    clientTemplateService = new TemplateService();
  }

  return clientTemplateService;
}
