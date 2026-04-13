/**
 * User Preferences Service
 * 
 * Provides functionality for managing user preferences including theme and accent color.
 * Preferences are stored in the user record in PocketBase.
 * 
 * Requirements: 14.1, 14.3, 14.4
 */

import PocketBase, { ClientResponseError } from 'pocketbase';
import { getPocketBaseClient } from '../pocketbase';
import { makeServiceAccessor } from './_service-factory';
import type { User, UserPreferences } from '../pocketbase-types';
import { type Result, ok, err } from '../result';

// ============================================================================
// Constants
// ============================================================================

/**
 * Default theme setting
 */
export const DEFAULT_THEME: UserPreferences['theme'] = 'system';

/**
 * Default accent color (blue)
 */
export const DEFAULT_ACCENT_COLOR = '#3b82f6';

/**
 * Available theme options
 */
export const THEME_OPTIONS = ['light', 'dark', 'system'] as const;

/**
 * Predefined accent color options
 */
export const ACCENT_COLOR_OPTIONS = [
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Cyan', value: '#06b6d4' },
] as const;

// ============================================================================
// Types
// ============================================================================

/**
 * Theme type
 */
export type Theme = 'light' | 'dark' | 'system';

/**
 * Preferences error with code and message
 */
export interface PreferencesError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Result of a preferences operation
 */
export type PreferencesResult = Result<UserPreferences, PreferencesError>;

/**
 * Input for updating preferences
 */
export interface UpdatePreferencesInput {
  theme?: Theme;
  accentColor?: string;
  notifications?: {
    email?: boolean;
    inApp?: boolean;
    push?: boolean;
  };
}

// ============================================================================
// Error Codes
// ============================================================================

export const PreferencesErrorCodes = {
  NOT_AUTHENTICATED: 'PREF_001',
  INVALID_THEME: 'PREF_002',
  INVALID_ACCENT_COLOR: 'PREF_003',
  UPDATE_FAILED: 'PREF_004',
  FETCH_FAILED: 'PREF_005',
  UNKNOWN_ERROR: 'PREF_999',
} as const;

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validates a theme value
 */
export function isValidTheme(theme: string): theme is Theme {
  return THEME_OPTIONS.includes(theme as Theme);
}

/**
 * Validates an accent color value (hex color format)
 */
export function isValidAccentColor(color: string): boolean {
  // Accept any valid hex color (3, 4, 6, or 8 characters after #)
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{4}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(color);
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parses PocketBase errors into PreferencesError
 */
function parseError(err: unknown): PreferencesError {
  if (err instanceof ClientResponseError) {
    if (err.status === 401) {
      return {
        code: PreferencesErrorCodes.NOT_AUTHENTICATED,
        message: 'Not authenticated',
      };
    }
    
    return {
      code: PreferencesErrorCodes.UPDATE_FAILED,
      message: err.message || 'Failed to update preferences',
      details: { status: err.status, data: err.data },
    };
  }
  
  if (err instanceof Error) {
    return {
      code: PreferencesErrorCodes.UNKNOWN_ERROR,
      message: err.message,
    };
  }
  
  return {
    code: PreferencesErrorCodes.UNKNOWN_ERROR,
    message: 'An unexpected error occurred',
  };
}

/**
 * Gets default preferences
 */
export function getDefaultPreferences(): UserPreferences {
  return {
    theme: DEFAULT_THEME,
    accentColor: DEFAULT_ACCENT_COLOR,
    notifications: {
      email: true,
      inApp: true,
      push: false,
    },
  };
}

// ============================================================================
// Preferences Service Class
// ============================================================================

/**
 * User Preferences Service
 * 
 * Provides methods for managing user preferences:
 * - Get current preferences
 * - Update theme
 * - Update accent color
 * - Update notification settings
 * - Reset to defaults
 * 
 * Requirements: 14.1, 14.3, 14.4
 */
export class PreferencesService {
  private pb: PocketBase;

  constructor(pb?: PocketBase) {
    this.pb = pb ?? getPocketBaseClient();
  }

  /**
   * Gets the current user's preferences.
   * Returns default preferences if none are set.
   * 
   * Requirements: 14.1, 14.3, 14.4
   * 
   * @returns Current preferences or defaults
   */
  async getPreferences(): Promise<PreferencesResult> {
    try {
      const userId = this.pb.authStore.record?.id;
      if (!userId) {
        return err({
          code: PreferencesErrorCodes.NOT_AUTHENTICATED,
          message: 'Not authenticated',
        });
      }

      const user = await this.pb.collection('users').getOne<User>(userId);
      const preferences = user.preferences ?? getDefaultPreferences();
      
      // Ensure all fields have values (merge with defaults)
      const mergedPreferences: UserPreferences = {
        ...getDefaultPreferences(),
        ...preferences,
        notifications: {
          ...getDefaultPreferences().notifications,
          ...preferences.notifications,
        },
      };

      return ok(mergedPreferences);
    } catch (caught) {
      return err(parseError(caught));
    }
  }

  /**
   * Updates the current user's preferences.
   * 
   * Requirements: 14.1, 14.3, 14.4
   * 
   * @param input - Preferences to update
   * @returns Updated preferences
   */
  async updatePreferences(input: UpdatePreferencesInput): Promise<PreferencesResult> {
    try {
      const userId = this.pb.authStore.record?.id;
      if (!userId) {
        return err({
          code: PreferencesErrorCodes.NOT_AUTHENTICATED,
          message: 'Not authenticated',
        });
      }

      // Validate theme if provided
      if (input.theme !== undefined && !isValidTheme(input.theme)) {
        return err({
          code: PreferencesErrorCodes.INVALID_THEME,
          message: `Invalid theme. Must be one of: ${THEME_OPTIONS.join(', ')}`,
        });
      }

      // Validate accent color if provided
      if (input.accentColor !== undefined && !isValidAccentColor(input.accentColor)) {
        return err({
          code: PreferencesErrorCodes.INVALID_ACCENT_COLOR,
          message: 'Invalid accent color. Must be a valid hex color (e.g., #3b82f6)',
        });
      }

      // Get current preferences
      const currentResult = await this.getPreferences();
      if (!currentResult.success) {
        return currentResult;
      }

      // Merge with new values
      const updatedPreferences: UserPreferences = {
        ...currentResult.data,
        ...(input.theme !== undefined && { theme: input.theme }),
        ...(input.accentColor !== undefined && { accentColor: input.accentColor }),
        ...(input.notifications !== undefined && {
          notifications: {
            ...currentResult.data.notifications,
            ...input.notifications,
          },
        }),
      };

      // Update user record
      await this.pb.collection('users').update(userId, {
        preferences: updatedPreferences,
      });

      return ok(updatedPreferences);
    } catch (caught) {
      return err(parseError(caught));
    }
  }

  /**
   * Sets the theme preference.
   * 
   * Requirements: 14.1, 14.3
   * 
   * @param theme - Theme to set ('light', 'dark', or 'system')
   * @returns Updated preferences
   */
  async setTheme(theme: Theme): Promise<PreferencesResult> {
    return this.updatePreferences({ theme });
  }

  /**
   * Sets the accent color preference.
   * 
   * Requirements: 14.4
   * 
   * @param accentColor - Hex color value (e.g., '#3b82f6')
   * @returns Updated preferences
   */
  async setAccentColor(accentColor: string): Promise<PreferencesResult> {
    return this.updatePreferences({ accentColor });
  }

  /**
   * Sets notification preferences.
   * 
   * @param notifications - Notification settings to update
   * @returns Updated preferences
   */
  async setNotificationPreferences(notifications: {
    email?: boolean;
    inApp?: boolean;
    push?: boolean;
  }): Promise<PreferencesResult> {
    return this.updatePreferences({ notifications });
  }

  /**
   * Resets preferences to defaults.
   * 
   * @returns Default preferences
   */
  async resetToDefaults(): Promise<PreferencesResult> {
    try {
      const userId = this.pb.authStore.record?.id;
      if (!userId) {
        return err({
          code: PreferencesErrorCodes.NOT_AUTHENTICATED,
          message: 'Not authenticated',
        });
      }

      const defaultPreferences = getDefaultPreferences();

      await this.pb.collection('users').update(userId, {
        preferences: defaultPreferences,
      });

      return ok(defaultPreferences);
    } catch (caught) {
      return err(parseError(caught));
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

const _preferences = makeServiceAccessor(PreferencesService);
export const createPreferencesService = _preferences.create;
export const getPreferencesService = _preferences.get;
