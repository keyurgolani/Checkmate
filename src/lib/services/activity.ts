/**
 * Activity Logging Service
 * 
 * Provides activity logging for modifications to shared blueprints.
 * Logs actions like create, update, delete on blueprints and items.
 * 
 * Requirements: 10.3
 */

import PocketBase, { ClientResponseError } from 'pocketbase';
import { getPocketBaseClient } from '../pocketbase';
import { makeServiceAccessor } from './_service-factory';
import type {
  ActivityLog,
  ActivityLogCreate,
  ActivityMetadata,
  Blueprint,
} from '../pocketbase-types';
import { Collections, ResourceType, ActivityAction, Visibility } from '../pocketbase-types';

// ============================================================================
// Types
// ============================================================================

/**
 * Result for activity log operations
 */
export interface ActivityLogResult {
  success: boolean;
  activityLog: ActivityLog | null;
  error: ActivityLogError | null;
}

/**
 * Result for listing activity logs
 */
export interface ActivityLogsListResult {
  success: boolean;
  activityLogs: ActivityLog[];
  totalItems: number;
  error: ActivityLogError | null;
}

/**
 * Activity log error with code and message
 */
export interface ActivityLogError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Options for logging activity
 */
export interface LogActivityOptions {
  userId: string;
  resourceType: ResourceType;
  resourceId: string;
  action: ActivityAction;
  metadata?: ActivityMetadata;
}

/**
 * Options for logging blueprint modifications
 */
export interface LogBlueprintModificationOptions {
  blueprintId: string;
  action: ActivityAction;
  metadata?: ActivityMetadata;
}

/**
 * Options for logging item modifications
 */
export interface LogItemModificationOptions {
  blueprintId: string;
  itemId: string;
  action: ActivityAction;
  metadata?: ActivityMetadata;
}

// ============================================================================
// Error Codes
// ============================================================================

export const ActivityLogErrorCodes = {
  NOT_FOUND: 'ACTIVITY_001',
  PERMISSION_DENIED: 'ACTIVITY_002',
  NOT_AUTHENTICATED: 'ACTIVITY_003',
  CREATION_FAILED: 'ACTIVITY_004',
  BLUEPRINT_NOT_FOUND: 'ACTIVITY_005',
  NOT_SHARED_BLUEPRINT: 'ACTIVITY_006',
  UNKNOWN_ERROR: 'ACTIVITY_999',
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Creates a successful ActivityLogResult
 */
function createSuccessResult(activityLog: ActivityLog): ActivityLogResult {
  return {
    success: true,
    activityLog,
    error: null,
  };
}

/**
 * Creates an error ActivityLogResult
 */
function createErrorResult(error: ActivityLogError): ActivityLogResult {
  return {
    success: false,
    activityLog: null,
    error,
  };
}

/**
 * Parses PocketBase errors into ActivityLogError
 */
function parseError(err: unknown): ActivityLogError {
  if (err instanceof ClientResponseError) {
    if (err.status === 404) {
      return {
        code: ActivityLogErrorCodes.NOT_FOUND,
        message: 'Activity log not found',
      };
    }

    if (err.status === 403) {
      return {
        code: ActivityLogErrorCodes.PERMISSION_DENIED,
        message: 'You do not have permission to perform this action',
      };
    }

    return {
      code: ActivityLogErrorCodes.UNKNOWN_ERROR,
      message: err.message || 'An unexpected error occurred',
      details: { status: err.status, data: err.data },
    };
  }

  if (err instanceof Error) {
    return {
      code: ActivityLogErrorCodes.UNKNOWN_ERROR,
      message: err.message,
    };
  }

  return {
    code: ActivityLogErrorCodes.UNKNOWN_ERROR,
    message: 'An unexpected error occurred',
  };
}

// ============================================================================
// Activity Service Class
// ============================================================================

/**
 * Activity Service
 * 
 * Provides methods for logging and retrieving activity on shared blueprints.
 * 
 * Requirements: 10.3
 */
export class ActivityService {
  private pb: PocketBase;

  constructor(pb?: PocketBase) {
    this.pb = pb ?? getPocketBaseClient();
  }

  /**
   * Logs an activity entry.
   * 
   * @param options - Activity log options
   * @returns ActivityLogResult with created activity log on success
   */
  async logActivity(options: LogActivityOptions): Promise<ActivityLogResult> {
    try {
      const createData: ActivityLogCreate = {
        user: options.userId,
        resourceType: options.resourceType,
        resourceId: options.resourceId,
        action: options.action,
        metadata: options.metadata,
      };

      const activityLog = await this.pb
        .collection(Collections.ACTIVITY_LOG)
        .create<ActivityLog>(createData);

      return createSuccessResult(activityLog);
    } catch (err) {
      return createErrorResult(parseError(err));
    }
  }

  /**
   * Logs a modification to a shared blueprint.
   * Only logs if the blueprint has shared visibility.
   * 
   * Requirements: 10.3
   * 
   * @param options - Blueprint modification options
   * @returns ActivityLogResult with created activity log on success, or null if not shared
   */
  async logBlueprintModification(
    options: LogBlueprintModificationOptions
  ): Promise<ActivityLogResult> {
    try {
      // Get current user ID
      const userId = this.pb.authStore.record?.id;
      if (!userId) {
        return createErrorResult({
          code: ActivityLogErrorCodes.NOT_AUTHENTICATED,
          message: 'You must be authenticated to log activity',
        });
      }

      // Check if blueprint exists and is shared
      let template: Blueprint;
      try {
        template = await this.pb
          .collection(Collections.TEMPLATES)
          .getOne<Blueprint>(options.blueprintId);
      } catch {
        return createErrorResult({
          code: ActivityLogErrorCodes.BLUEPRINT_NOT_FOUND,
          message: 'Blueprint not found',
        });
      }

      // Only log activity for shared blueprints
      if (template.visibility !== Visibility.SHARED) {
        // Return success but with null activity log (not an error, just not logged)
        return {
          success: true,
          activityLog: null,
          error: null,
        };
      }

      return this.logActivity({
        userId,
        resourceType: ResourceType.TEMPLATE,
        resourceId: options.blueprintId,
        action: options.action,
        metadata: {
          ...options.metadata,
          blueprintTitle: template.title,
        },
      });
    } catch (err) {
      return createErrorResult(parseError(err));
    }
  }

  /**
   * Logs a modification to an item in a shared blueprint.
   * Only logs if the parent blueprint has shared visibility.
   * 
   * Requirements: 10.3
   * 
   * @param options - Item modification options
   * @returns ActivityLogResult with created activity log on success, or null if not shared
   */
  async logItemModification(
    options: LogItemModificationOptions
  ): Promise<ActivityLogResult> {
    try {
      // Get current user ID
      const userId = this.pb.authStore.record?.id;
      if (!userId) {
        return createErrorResult({
          code: ActivityLogErrorCodes.NOT_AUTHENTICATED,
          message: 'You must be authenticated to log activity',
        });
      }

      // Check if blueprint exists and is shared
      let template: Blueprint;
      try {
        template = await this.pb
          .collection(Collections.TEMPLATES)
          .getOne<Blueprint>(options.blueprintId);
      } catch {
        return createErrorResult({
          code: ActivityLogErrorCodes.BLUEPRINT_NOT_FOUND,
          message: 'Blueprint not found',
        });
      }

      // Only log activity for shared blueprints
      if (template.visibility !== Visibility.SHARED) {
        // Return success but with null activity log (not an error, just not logged)
        return {
          success: true,
          activityLog: null,
          error: null,
        };
      }

      return this.logActivity({
        userId,
        resourceType: ResourceType.ITEM,
        resourceId: options.itemId,
        action: options.action,
        metadata: {
          ...options.metadata,
          blueprintId: options.blueprintId,
          blueprintTitle: template.title,
          itemId: options.itemId,
        },
      });
    } catch (err) {
      return createErrorResult(parseError(err));
    }
  }

  /**
   * Gets activity logs for a specific blueprint.
   * 
   * @param blueprintId - Blueprint ID
   * @param options - Query options
   * @returns List of activity logs
   */
  async getActivityForBlueprint(
    blueprintId: string,
    options?: {
      page?: number;
      perPage?: number;
      includeUser?: boolean;
    }
  ): Promise<ActivityLogsListResult> {
    try {
      // Build filter for blueprint-related activities
      // This includes direct blueprint modifications and item modifications within the blueprint
      const filter = `(resourceType = "${ResourceType.TEMPLATE}" && resourceId = "${blueprintId}") || (resourceType = "${ResourceType.ITEM}" && metadata.blueprintId = "${blueprintId}")`;

      const queryOptions: { filter: string; sort: string; expand?: string } = {
        filter,
        sort: '-created',
      };

      if (options?.includeUser) {
        queryOptions.expand = 'user';
      }

      const result = await this.pb
        .collection(Collections.ACTIVITY_LOG)
        .getList<ActivityLog>(options?.page || 1, options?.perPage || 20, queryOptions);

      return {
        success: true,
        activityLogs: result.items,
        totalItems: result.totalItems,
        error: null,
      };
    } catch (err) {
      return {
        success: false,
        activityLogs: [],
        totalItems: 0,
        error: parseError(err),
      };
    }
  }

  /**
   * Gets activity logs for a specific user.
   * 
   * @param userId - User ID
   * @param options - Query options
   * @returns List of activity logs
   */
  async getActivityByUser(
    userId: string,
    options?: {
      page?: number;
      perPage?: number;
      resourceType?: ResourceType;
    }
  ): Promise<ActivityLogsListResult> {
    try {
      let filter = `user = "${userId}"`;
      
      if (options?.resourceType) {
        filter += ` && resourceType = "${options.resourceType}"`;
      }

      const result = await this.pb
        .collection(Collections.ACTIVITY_LOG)
        .getList<ActivityLog>(options?.page || 1, options?.perPage || 20, {
          filter,
          sort: '-created',
        });

      return {
        success: true,
        activityLogs: result.items,
        totalItems: result.totalItems,
        error: null,
      };
    } catch (err) {
      return {
        success: false,
        activityLogs: [],
        totalItems: 0,
        error: parseError(err),
      };
    }
  }

  /**
   * Gets recent activity across all shared blueprints the current user has access to.
   * 
   * @param options - Query options
   * @returns List of activity logs
   */
  async getRecentActivity(options?: {
    page?: number;
    perPage?: number;
    includeUser?: boolean;
  }): Promise<ActivityLogsListResult> {
    try {
      const currentUserId = this.pb.authStore.record?.id;
      if (!currentUserId) {
        return {
          success: false,
          activityLogs: [],
          totalItems: 0,
          error: {
            code: ActivityLogErrorCodes.NOT_AUTHENTICATED,
            message: 'You must be authenticated to view activity',
          },
        };
      }

      const queryOptions: { sort: string; expand?: string } = {
        sort: '-created',
      };

      if (options?.includeUser) {
        queryOptions.expand = 'user';
      }

      const result = await this.pb
        .collection(Collections.ACTIVITY_LOG)
        .getList<ActivityLog>(options?.page || 1, options?.perPage || 20, queryOptions);

      return {
        success: true,
        activityLogs: result.items,
        totalItems: result.totalItems,
        error: null,
      };
    } catch (err) {
      return {
        success: false,
        activityLogs: [],
        totalItems: 0,
        error: parseError(err),
      };
    }
  }

  /**
   * Gets the underlying PocketBase client.
   */
  getPocketBase(): PocketBase {
    return this.pb;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

const _activity = makeServiceAccessor(ActivityService);
export const createActivityService = _activity.create;
export const getActivityService = _activity.get;
