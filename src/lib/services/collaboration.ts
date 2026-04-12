/**
 * Collaboration Service
 * 
 * Provides collaboration management for checklist blueprints using PocketBase SDK.
 * Implements invite, updatePermission, revoke, and acceptInvitation methods.
 * 
 * Requirements: 4.4, 4.5, 4.6, 10.1
 */

import PocketBase, { ClientResponseError } from 'pocketbase';
import { getPocketBaseClient } from '../pocketbase';
import { makeServiceAccessor } from './_service-factory';
import type {
  Blueprint,
  Collaborator,
  CollaboratorCreate,
  CollaboratorUpdate,
  User,
} from '../pocketbase-types';
import { Collections, PermissionLevel } from '../pocketbase-types';
import { NotificationService } from './notification';

// ============================================================================
// Types
// ============================================================================

/**
 * Input for inviting a collaborator
 */
export interface InviteCollaboratorInput {
  blueprintId: string;
  email: string;
  permissionLevel: PermissionLevel;
}

/**
 * Collaboration operation result
 */
export interface CollaborationResult {
  success: boolean;
  collaborator: Collaborator | null;
  error: CollaborationError | null;
}

/**
 * Collaboration error with code and message
 */
export interface CollaborationError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Result for listing collaborators
 */
export interface CollaboratorsListResult {
  success: boolean;
  collaborators: Collaborator[];
  error: CollaborationError | null;
}

// ============================================================================
// Error Codes
// ============================================================================

export const CollaborationErrorCodes = {
  NOT_FOUND: 'COLLAB_001',
  BLUEPRINT_NOT_FOUND: 'COLLAB_002',
  USER_NOT_FOUND: 'COLLAB_003',
  PERMISSION_DENIED: 'COLLAB_004',
  ALREADY_COLLABORATOR: 'COLLAB_005',
  CANNOT_INVITE_OWNER: 'COLLAB_006',
  INVALID_PERMISSION: 'COLLAB_007',
  INVITATION_NOT_FOUND: 'COLLAB_008',
  ALREADY_ACCEPTED: 'COLLAB_009',
  NOT_AUTHENTICATED: 'COLLAB_010',
  UNKNOWN_ERROR: 'COLLAB_999',
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validates permission level value
 */
export function validatePermissionLevel(permission: string): CollaborationError | null {
  const validValues = Object.values(PermissionLevel);
  if (!validValues.includes(permission as PermissionLevel)) {
    return {
      code: CollaborationErrorCodes.INVALID_PERMISSION,
      message: `Invalid permission level. Must be one of: ${validValues.join(', ')}`,
      details: { providedValue: permission, allowedValues: validValues },
    };
  }
  return null;
}

/**
 * Creates a successful CollaborationResult
 */
function createSuccessResult(collaborator: Collaborator): CollaborationResult {
  return {
    success: true,
    collaborator,
    error: null,
  };
}

/**
 * Creates an error CollaborationResult
 */
function createErrorResult(error: CollaborationError): CollaborationResult {
  return {
    success: false,
    collaborator: null,
    error,
  };
}

/**
 * Parses PocketBase errors into CollaborationError
 */
function parseError(err: unknown): CollaborationError {
  if (err instanceof ClientResponseError) {
    if (err.status === 404) {
      return {
        code: CollaborationErrorCodes.NOT_FOUND,
        message: 'Collaborator not found',
      };
    }

    if (err.status === 403) {
      return {
        code: CollaborationErrorCodes.PERMISSION_DENIED,
        message: 'You do not have permission to perform this action',
      };
    }

    if (err.status === 400) {
      const data = err.data as Record<string, unknown>;
      return {
        code: CollaborationErrorCodes.UNKNOWN_ERROR,
        message: err.message || 'Validation failed',
        details: data,
      };
    }

    return {
      code: CollaborationErrorCodes.UNKNOWN_ERROR,
      message: err.message || 'An unexpected error occurred',
      details: { status: err.status, data: err.data },
    };
  }

  if (err instanceof Error) {
    return {
      code: CollaborationErrorCodes.UNKNOWN_ERROR,
      message: err.message,
    };
  }

  return {
    code: CollaborationErrorCodes.UNKNOWN_ERROR,
    message: 'An unexpected error occurred',
  };
}

// ============================================================================
// Collaboration Service Class
// ============================================================================

/**
 * Collaboration Service
 * 
 * Provides methods for managing blueprint collaborations including:
 * - Inviting collaborators by email
 * - Updating collaborator permissions
 * - Revoking collaborator access
 * - Accepting collaboration invitations
 */
export class CollaborationService {
  private pb: PocketBase;
  private notificationService: NotificationService;

  constructor(pb?: PocketBase) {
    this.pb = pb ?? getPocketBaseClient();
    this.notificationService = new NotificationService(this.pb);
  }

  /**
   * Invites a user to collaborate on a blueprint.
   * Sends an invitation notification to the user.
   * 
   * Requirements: 4.4
   * 
   * @param input - Invitation data including blueprintId, email, and permissionLevel
   * @param options - Optional configuration including sudo client for user lookup
   * @returns CollaborationResult with created collaborator on success
   */
  async invite(
    input: InviteCollaboratorInput,
    options?: { userLookupDb?: PocketBase }
  ): Promise<CollaborationResult> {
    try {
      // Validate permission level
      const permissionError = validatePermissionLevel(input.permissionLevel);
      if (permissionError) {
        return createErrorResult(permissionError);
      }

      // Get current user ID
      const currentUserId = this.pb.authStore.record?.id;
      if (!currentUserId) {
        return createErrorResult({
          code: CollaborationErrorCodes.NOT_AUTHENTICATED,
          message: 'You must be authenticated to invite collaborators',
        });
      }

      // Verify blueprint exists and get owner info
      let template: Blueprint;
      try {
        template = await this.pb
          .collection(Collections.TEMPLATES)
          .getOne<Blueprint>(input.blueprintId);
      } catch {
        return createErrorResult({
          code: CollaborationErrorCodes.BLUEPRINT_NOT_FOUND,
          message: 'Blueprint not found',
        });
      }

      // Check if current user has permission to invite (must be owner or admin)
      const hasPermission = await this.canManageCollaborators(input.blueprintId, currentUserId);
      if (!hasPermission) {
        return createErrorResult({
          code: CollaborationErrorCodes.PERMISSION_DENIED,
          message: 'You do not have permission to invite collaborators to this blueprint',
        });
      }

      // Find user by email
      // Use provided lookup DB (e.g. admin client) or default client
      const lookupDb = options?.userLookupDb ?? this.pb;
      let targetUser: User | undefined;
      try {
        const users = await lookupDb
          .collection(Collections.USERS)
          .getList<User>(1, 1, {
            filter: `email = "${input.email}"`,
          });

        if (users.items.length === 0) {
          return createErrorResult({
            code: CollaborationErrorCodes.USER_NOT_FOUND,
            message: 'No user found with this email address',
          });
        }

        targetUser = users.items[0];
      } catch {
        return createErrorResult({
          code: CollaborationErrorCodes.USER_NOT_FOUND,
          message: 'Failed to find user',
        });
      }

      // Safety check - should not happen due to length check above
      if (!targetUser) {
        return createErrorResult({
          code: CollaborationErrorCodes.USER_NOT_FOUND,
          message: 'No user found with this email address',
        });
      }

      // Cannot invite the owner
      if (targetUser.id === template.owner) {
        return createErrorResult({
          code: CollaborationErrorCodes.CANNOT_INVITE_OWNER,
          message: 'Cannot invite the blueprint owner as a collaborator',
        });
      }

      // Check if user is already a collaborator
      const existingCollaborators = await this.pb
        .collection(Collections.COLLABORATORS)
        .getList<Collaborator>(1, 1, {
          filter: `blueprint = "${input.blueprintId}" && user = "${targetUser.id}"`,
        });

      if (existingCollaborators.totalItems > 0) {
        return createErrorResult({
          code: CollaborationErrorCodes.ALREADY_COLLABORATOR,
          message: 'This user is already a collaborator on this blueprint',
        });
      }

      // Create collaborator record
      const createData: CollaboratorCreate = {
        blueprint: input.blueprintId,
        user: targetUser.id,
        permissionLevel: input.permissionLevel,
        invitedAt: new Date().toISOString(),
        acceptedAt: undefined,
      };

      const collaborator = await this.pb
        .collection(Collections.COLLABORATORS)
        .create<Collaborator>(createData);

      // Send notification to the invited user
      // Requirements: 4.4, 10.1
      const currentUser = this.pb.authStore.record as User | null;
      await this.notificationService.createCollaborationInviteNotification({
        userId: targetUser.id,
        blueprintId: input.blueprintId,
        blueprintTitle: template.title,
        collaboratorId: collaborator.id,
        inviterName: currentUser?.displayName || currentUser?.email || undefined,
        permissionLevel: input.permissionLevel,
      });

      return createSuccessResult(collaborator);
    } catch (err) {
      return createErrorResult(parseError(err));
    }
  }

  /**
   * Updates a collaborator's permission level.
   * 
   * Requirements: 4.5
   * 
   * @param collaboratorId - ID of the collaborator to update
   * @param permissionLevel - New permission level
   * @returns CollaborationResult with updated collaborator on success
   */
  async updatePermission(
    collaboratorId: string,
    permissionLevel: PermissionLevel
  ): Promise<CollaborationResult> {
    try {
      // Validate permission level
      const permissionError = validatePermissionLevel(permissionLevel);
      if (permissionError) {
        return createErrorResult(permissionError);
      }

      // Get current user ID
      const currentUserId = this.pb.authStore.record?.id;
      if (!currentUserId) {
        return createErrorResult({
          code: CollaborationErrorCodes.NOT_AUTHENTICATED,
          message: 'You must be authenticated to update collaborator permissions',
        });
      }

      // Get the collaborator record
      let collaborator: Collaborator;
      try {
        collaborator = await this.pb
          .collection(Collections.COLLABORATORS)
          .getOne<Collaborator>(collaboratorId);
      } catch {
        return createErrorResult({
          code: CollaborationErrorCodes.NOT_FOUND,
          message: 'Collaborator not found',
        });
      }

      // Check if current user has permission to update (must be owner or admin)
      const hasPermission = await this.canManageCollaborators(collaborator.blueprint, currentUserId);
      if (!hasPermission) {
        return createErrorResult({
          code: CollaborationErrorCodes.PERMISSION_DENIED,
          message: 'You do not have permission to update collaborator permissions',
        });
      }

      // Store previous permission level for notification
      const previousPermissionLevel = collaborator.permissionLevel;

      // Update the permission level
      const updateData: CollaboratorUpdate = {
        permissionLevel,
      };

      const updatedCollaborator = await this.pb
        .collection(Collections.COLLABORATORS)
        .update<Collaborator>(collaboratorId, updateData);

      // Send notification to the collaborator about permission change
      // Requirements: 4.4, 10.1
      try {
        const blueprint = await this.pb
          .collection(Collections.TEMPLATES)
          .getOne<Blueprint>(collaborator.blueprint);

        await this.notificationService.createPermissionChangeNotification({
          userId: collaborator.user,
          blueprintId: collaborator.blueprint,
          blueprintTitle: blueprint.title,
          collaboratorId: collaboratorId,
          permissionLevel: permissionLevel,
          previousPermissionLevel: previousPermissionLevel,
        });
      } catch {
        // Notification failure should not fail the permission update
        console.warn('Failed to send permission change notification');
      }

      return createSuccessResult(updatedCollaborator);
    } catch (err) {
      return createErrorResult(parseError(err));
    }
  }

  /**
   * Revokes a collaborator's access to a blueprint.
   * 
   * Requirements: 4.6
   * 
   * @param collaboratorId - ID of the collaborator to revoke
   * @returns Success status and any error
   */
  async revoke(collaboratorId: string): Promise<{ success: boolean; error: CollaborationError | null }> {
    try {
      // Get current user ID
      const currentUserId = this.pb.authStore.record?.id;
      if (!currentUserId) {
        return {
          success: false,
          error: {
            code: CollaborationErrorCodes.NOT_AUTHENTICATED,
            message: 'You must be authenticated to revoke collaborator access',
          },
        };
      }

      // Get the collaborator record
      let collaborator: Collaborator;
      try {
        collaborator = await this.pb
          .collection(Collections.COLLABORATORS)
          .getOne<Collaborator>(collaboratorId);
      } catch {
        return {
          success: false,
          error: {
            code: CollaborationErrorCodes.NOT_FOUND,
            message: 'Collaborator not found',
          },
        };
      }

      // Check if current user has permission to revoke (must be owner or admin)
      const hasPermission = await this.canManageCollaborators(collaborator.blueprint, currentUserId);
      if (!hasPermission) {
        return {
          success: false,
          error: {
            code: CollaborationErrorCodes.PERMISSION_DENIED,
            message: 'You do not have permission to revoke collaborator access',
          },
        };
      }

      // Get blueprint info for notification before deleting
      let blueprintTitle = 'Unknown Blueprint';
      const blueprintId = collaborator.blueprint;
      const revokedUserId = collaborator.user;
      
      try {
        const blueprint = await this.pb
          .collection(Collections.TEMPLATES)
          .getOne<Blueprint>(collaborator.blueprint);
        blueprintTitle = blueprint.title;
      } catch {
        // Continue with revocation even if we can't get the blueprint title
      }

      // Delete the collaborator record
      await this.pb.collection(Collections.COLLABORATORS).delete(collaboratorId);

      // Send notification to the revoked user
      // Requirements: 4.6, 10.1
      try {
        await this.notificationService.createCollaborationRevokedNotification({
          userId: revokedUserId,
          blueprintId: blueprintId,
          blueprintTitle: blueprintTitle,
        });
      } catch {
        // Notification failure should not fail the revocation
        console.warn('Failed to send revocation notification');
      }

      return { success: true, error: null };
    } catch (err) {
      return { success: false, error: parseError(err) };
    }
  }

  /**
   * Accepts a collaboration invitation.
   * Sets the acceptedAt timestamp on the collaborator record.
   * 
   * Requirements: 4.4
   * 
   * @param collaboratorId - ID of the collaborator invitation to accept
   * @returns CollaborationResult with updated collaborator on success
   */
  async acceptInvitation(collaboratorId: string): Promise<CollaborationResult> {
    try {
      // Get current user ID
      const currentUserId = this.pb.authStore.record?.id;
      if (!currentUserId) {
        return createErrorResult({
          code: CollaborationErrorCodes.NOT_AUTHENTICATED,
          message: 'You must be authenticated to accept an invitation',
        });
      }

      // Get the collaborator record
      let collaborator: Collaborator;
      try {
        collaborator = await this.pb
          .collection(Collections.COLLABORATORS)
          .getOne<Collaborator>(collaboratorId);
      } catch {
        return createErrorResult({
          code: CollaborationErrorCodes.INVITATION_NOT_FOUND,
          message: 'Invitation not found',
        });
      }

      // Verify the invitation is for the current user
      if (collaborator.user !== currentUserId) {
        return createErrorResult({
          code: CollaborationErrorCodes.PERMISSION_DENIED,
          message: 'This invitation is not for you',
        });
      }

      // Check if already accepted
      if (collaborator.acceptedAt) {
        return createErrorResult({
          code: CollaborationErrorCodes.ALREADY_ACCEPTED,
          message: 'This invitation has already been accepted',
        });
      }

      // Update the acceptedAt timestamp
      const updateData: CollaboratorUpdate = {
        acceptedAt: new Date().toISOString(),
      };

      const updatedCollaborator = await this.pb
        .collection(Collections.COLLABORATORS)
        .update<Collaborator>(collaboratorId, updateData);

      return createSuccessResult(updatedCollaborator);
    } catch (err) {
      return createErrorResult(parseError(err));
    }
  }

  /**
   * Gets all collaborators for a blueprint.
   * 
   * @param blueprintId - Blueprint ID
   * @param options - Query options
   * @returns List of collaborators
   */
  async getCollaborators(
    blueprintId: string,
    options?: {
      includeUser?: boolean;
      acceptedOnly?: boolean;
    }
  ): Promise<CollaboratorsListResult> {
    try {
      let filter = `blueprint = "${blueprintId}"`;
      
      if (options?.acceptedOnly) {
        filter += ' && acceptedAt != null';
      }

      const queryOptions: { filter: string; expand?: string; sort: string } = {
        filter,
        sort: '-created',
      };

      if (options?.includeUser) {
        queryOptions.expand = 'user';
      }

      const result = await this.pb
        .collection(Collections.COLLABORATORS)
        .getFullList<Collaborator>(queryOptions);

      return {
        success: true,
        collaborators: result,
        error: null,
      };
    } catch (err) {
      return {
        success: false,
        collaborators: [],
        error: parseError(err),
      };
    }
  }

  /**
   * Gets pending invitations for the current user.
   * 
   * @returns List of pending collaborator invitations
   */
  async getPendingInvitations(): Promise<CollaboratorsListResult> {
    try {
      const currentUserId = this.pb.authStore.record?.id;
      if (!currentUserId) {
        return {
          success: false,
          collaborators: [],
          error: {
            code: CollaborationErrorCodes.NOT_AUTHENTICATED,
            message: 'You must be authenticated to view invitations',
          },
        };
      }

      const result = await this.pb
        .collection(Collections.COLLABORATORS)
        .getFullList<Collaborator>({
          filter: `user = "${currentUserId}" && acceptedAt = null`,
          expand: 'blueprint,blueprint.owner',
          sort: '-invitedAt',
        });

      return {
        success: true,
        collaborators: result,
        error: null,
      };
    } catch (err) {
      return {
        success: false,
        collaborators: [],
        error: parseError(err),
      };
    }
  }

  /**
   * Gets the current user's collaboration on a blueprint.
   * 
   * @param blueprintId - Blueprint ID
   * @returns Collaborator record if user is a collaborator, null otherwise
   */
  async getMyCollaboration(blueprintId: string): Promise<Collaborator | null> {
    try {
      const currentUserId = this.pb.authStore.record?.id;
      if (!currentUserId) {
        return null;
      }

      const result = await this.pb
        .collection(Collections.COLLABORATORS)
        .getList<Collaborator>(1, 1, {
          filter: `blueprint = "${blueprintId}" && user = "${currentUserId}"`,
        });

      return result.items.length > 0 ? result.items[0] ?? null : null;
    } catch {
      return null;
    }
  }

  /**
   * Checks if a user can manage collaborators for a blueprint.
   * Only the owner or collaborators with admin permission can manage collaborators.
   * 
   * @param blueprintId - Blueprint ID
   * @param userId - User ID to check
   * @returns true if user can manage collaborators
   */
  async canManageCollaborators(blueprintId: string, userId: string): Promise<boolean> {
    try {
      // Check if user is the owner
      const blueprint = await this.pb
        .collection(Collections.TEMPLATES)
        .getOne<Blueprint>(blueprintId);

      if (blueprint.owner === userId) {
        return true;
      }

      // Check if user is an admin collaborator
      const collaborators = await this.pb
        .collection(Collections.COLLABORATORS)
        .getList<Collaborator>(1, 1, {
          filter: `blueprint = "${blueprintId}" && user = "${userId}" && permissionLevel = "admin" && acceptedAt != null`,
        });

      return collaborators.totalItems > 0;
    } catch {
      return false;
    }
  }

  /**
   * Checks if a user has at least the specified permission level on a blueprint.
   * 
   * @param blueprintId - Blueprint ID
   * @param userId - User ID to check
   * @param requiredLevel - Minimum required permission level
   * @returns true if user has sufficient permissions
   */
  async hasPermission(
    blueprintId: string,
    userId: string,
    requiredLevel: PermissionLevel
  ): Promise<boolean> {
    try {
      // Check if user is the owner (owners have all permissions)
      const blueprint = await this.pb
        .collection(Collections.TEMPLATES)
        .getOne<Blueprint>(blueprintId);

      if (blueprint.owner === userId) {
        return true;
      }

      // Get user's collaboration
      const collaborators = await this.pb
        .collection(Collections.COLLABORATORS)
        .getList<Collaborator>(1, 1, {
          filter: `blueprint = "${blueprintId}" && user = "${userId}" && acceptedAt != null`,
        });

      if (collaborators.totalItems === 0) {
        return false;
      }

      const collaborator = collaborators.items[0];
      if (!collaborator) {
        return false;
      }
      
      const permissionHierarchy: Record<PermissionLevel, number> = {
        [PermissionLevel.VIEWER]: 1,
        [PermissionLevel.EDITOR]: 2,
        [PermissionLevel.ADMIN]: 3,
      };

      const userLevel = permissionHierarchy[collaborator.permissionLevel];
      const required = permissionHierarchy[requiredLevel];

      return userLevel >= required;
    } catch {
      return false;
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

const _collaboration = makeServiceAccessor(CollaborationService);
export const createCollaborationService = _collaboration.create;
export const getCollaborationService = _collaboration.get;
