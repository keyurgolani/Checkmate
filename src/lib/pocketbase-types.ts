/**
 * PocketBase Collection Types
 * 
 * These types match the PocketBase collections defined in pb_schema.json
 * and provide type-safe access to the database.
 */

import type { RecordModel } from 'pocketbase';

// ============================================================================
// Enums
// ============================================================================

export enum Visibility {
  PRIVATE = 'private',
  PUBLIC = 'public',
  SHARED = 'shared',
}

export enum ItemType {
  TASK = 'task',
  REFERENCE = 'reference',
}

export enum PermissionLevel {
  VIEWER = 'viewer',
  EDITOR = 'editor',
  ADMIN = 'admin',
}

export enum NotificationType {
  COLLABORATION_INVITE = 'collaboration_invite',
  COLLABORATION_ACCEPTED = 'collaboration_accepted',
  COLLABORATION_REVOKED = 'collaboration_revoked',
  TEMPLATE_UPDATED = 'template_updated',
  CHECKLIST_REMINDER = 'checklist_reminder',
  ACCESS_REQUEST = 'access_request',
  SYSTEM = 'system',
}

export enum ResourceType {
  TEMPLATE = 'template',
  ITEM = 'item',
  CHECKLIST = 'checklist',
  CHECKLIST_ITEM = 'checklistItem',
  COLLABORATOR = 'collaborator',
  WORKSPACE = 'workspace',
}

export enum ActivityAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  COMPLETE = 'complete',
  UNCOMPLETE = 'uncomplete',
  INVITE = 'invite',
  ACCEPT = 'accept',
  REVOKE = 'revoke',
}

// ============================================================================
// User Preferences
// ============================================================================

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system';
  accentColor?: string;
  notifications?: {
    email?: boolean;
    inApp?: boolean;
    push?: boolean;
  };
}

// ============================================================================
// Workspace Settings
// ============================================================================

export interface WorkspaceSettings {
  defaultVisibility?: Visibility;
  notificationPreferences?: {
    collaboratorChanges?: boolean;
    templateUpdates?: boolean;
  };
}

// ============================================================================
// Conditional Questions Types
// ============================================================================

/**
 * Answer type for conditional questions
 */
export type ConditionAnswerType = 'boolean' | 'enum';

/**
 * A conditional question that can be defined at the template level
 */
export interface TemplateQuestion {
  /** Unique identifier for the question within the template */
  id: string;
  /** The question text displayed to users */
  question: string;
  /** Type of answer expected */
  answerType: ConditionAnswerType;
  /** For enum type, the available options */
  enumOptions?: string[];
  /** Default value if user doesn't answer */
  defaultValue?: boolean | string;
}

/**
 * A condition that determines whether an item should be included
 */
export interface ItemCondition {
  /** ID of the question this condition references */
  questionId: string;
  /** The operator for comparison */
  operator: 'equals' | 'notEquals';
  /** The value to compare against */
  value: boolean | string;
}

/**
 * Answers provided by user when creating a checklist
 */
export interface ConditionAnswers {
  [questionId: string]: boolean | string | undefined;
}

// ============================================================================
// Resource Link Type
// ============================================================================

export interface ResourceLink {
  /** Display title for the resource */
  title: string;
  /** URL of the resource */
  url: string;
  /** Optional description of what this resource provides */
  description?: string;
}

// ============================================================================
// Item Metadata
// ============================================================================

export interface ItemMetadata {
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high';
  notes?: string;
  /** Conditions that must be met for this item to be included */
  conditions?: ItemCondition[];
  [key: string]: unknown;
}

// ============================================================================
// Base Record Type (extends PocketBase RecordModel)
// ============================================================================

export interface BaseRecord extends RecordModel {
  id: string;
  created: string;
  updated: string;
  collectionId: string;
  collectionName: string;
}

// ============================================================================
// User Collection (Auth Collection)
// ============================================================================

export interface User extends BaseRecord {
  collectionName: 'users';
  email: string;
  emailVisibility: boolean;
  verified: boolean;
  displayName: string | null;
  avatarUrl: string | null;
  preferences: UserPreferences | null;
  failedLoginAttempts: number | null;
  lastFailedLogin: string | null;
  lockedUntil: string | null;
}

export interface UserCreate {
  email: string;
  password: string;
  passwordConfirm: string;
  displayName?: string;
  avatarUrl?: string;
  preferences?: UserPreferences;
}

export interface UserUpdate {
  displayName?: string;
  avatarUrl?: string;
  preferences?: UserPreferences;
  failedLoginAttempts?: number;
  lastFailedLogin?: string;
  lockedUntil?: string | null;
}

// ============================================================================
// Workspace Collection
// ============================================================================

export interface Workspace extends BaseRecord {
  collectionName: 'workspaces';
  owner: string; // User ID
  name: string;
  description: string | null;
  settings: WorkspaceSettings | null;
  isArchived: boolean;
  // Expanded relations
  expand?: {
    owner?: User;
  };
}

export interface WorkspaceCreate {
  owner: string;
  name: string;
  description?: string;
  settings?: WorkspaceSettings;
  isArchived?: boolean;
}

export interface WorkspaceUpdate {
  name?: string;
  description?: string;
  settings?: WorkspaceSettings;
  isArchived?: boolean;
}

// ============================================================================
// Template Collection (formerly Blueprint)
// ============================================================================

export interface Template extends BaseRecord {
  collectionName: 'blueprints'; // PocketBase collection name unchanged
  workspace: string; // Workspace ID
  owner: string; // User ID
  title: string;
  description: string | null;
  visibility: Visibility;
  category: string | null;
  tags: string[] | null;
  version: number;
  instanceCount: number; // matches PocketBase schema field name
  ratingSum: number;
  ratingCount: number;
  /** Conditional questions for dynamic template customization */
  questions: TemplateQuestion[] | null;
  // Expanded relations
  expand?: {
    workspace?: Workspace;
    owner?: User;
  };
}

export interface TemplateCreate {
  workspace: string;
  owner: string;
  title: string;
  description?: string;
  visibility?: Visibility;
  category?: string;
  tags?: string[];
  version?: number;
  instanceCount?: number;
  ratingSum?: number;
  ratingCount?: number;
  questions?: TemplateQuestion[];
}

export interface TemplateUpdate {
  title?: string;
  description?: string;
  visibility?: Visibility;
  category?: string;
  tags?: string[];
  version?: number;
  instanceCount?: number;
  ratingSum?: number;
  ratingCount?: number;
  questions?: TemplateQuestion[] | null;
}

// ============================================================================
// Item Collection (Template Items)
// ============================================================================

export interface Item extends BaseRecord {
  collectionName: 'items';
  blueprint: string; // Blueprint/Template ID (actual field name in DB)
  parent: string | null; // Item ID (self-relation for hierarchy)
  path: string; // Hierarchical path (e.g., "1.2.3")
  itemType: ItemType;
  content: string;
  description: string | null; // Detailed description of how to perform this step
  resources: ResourceLink[] | null; // Helpful resource links
  reference: string | null; // Template ID (for reference items)
  position: number;
  metadata: ItemMetadata | null;
  // Expanded relations
  expand?: {
    blueprint?: Template;
    parent?: Item;
    reference?: Template;
  };
}

export interface ItemCreate {
  blueprint: string;
  parent?: string;
  path: string;
  itemType: ItemType;
  content: string;
  description?: string;
  resources?: ResourceLink[];
  reference?: string;
  position: number;
  metadata?: ItemMetadata;
}

export interface ItemUpdate {
  parent?: string | null;
  path?: string;
  itemType?: ItemType;
  content?: string;
  description?: string | null;
  resources?: ResourceLink[] | null;
  reference?: string | null;
  position?: number;
  metadata?: ItemMetadata;
}

// ============================================================================
// Collaborator Collection
// ============================================================================

export interface Collaborator extends BaseRecord {
  collectionName: 'collaborators';
  blueprint: string; // Template ID (field name in DB is 'blueprint')
  user: string; // User ID
  permissionLevel: PermissionLevel;
  invitedAt: string;
  acceptedAt: string | null;
  // Expanded relations
  expand?: {
    blueprint?: Template;
    user?: User;
  };
}

export interface CollaboratorCreate {
  blueprint: string;
  user: string;
  permissionLevel: PermissionLevel;
  invitedAt: string;
  acceptedAt?: string;
}

export interface CollaboratorUpdate {
  permissionLevel?: PermissionLevel;
  acceptedAt?: string;
}

// ============================================================================
// Checklist Collection (formerly Instance)
// ============================================================================

export interface Checklist extends BaseRecord {
  collectionName: 'instances'; // PocketBase collection name unchanged
  blueprint: string; // Blueprint/Template ID (actual field name in DB)
  user: string; // User ID
  workspace: string | null; // Workspace ID (optional, derived from template)
  name: string;
  isSynced: boolean;
  progress: number;
  completedAt: string | null;
  // Expanded relations
  expand?: {
    blueprint?: Template;
    user?: User;
    workspace?: Workspace;
  };
}

export interface ChecklistCreate {
  blueprint: string;
  user: string;
  workspace?: string;
  name: string;
  isSynced?: boolean;
  progress?: number;
  completedAt?: string;
}

export interface ChecklistUpdate {
  name?: string;
  workspace?: string | null;
  isSynced?: boolean;
  progress?: number;
  completedAt?: string | null;
}

// ============================================================================
// Checklist Item Collection
// ============================================================================

export interface ChecklistItem extends BaseRecord {
  collectionName: 'instanceItems'; // PocketBase collection name unchanged
  instance: string; // Instance/Checklist ID (actual field name in DB)
  sourceItem: string | null; // Item ID (original template item)
  parent: string | null; // ChecklistItem ID (self-relation for hierarchy)
  path: string; // Hierarchical path
  content: string;
  description: string | null; // Detailed description of how to perform this step
  resources: ResourceLink[] | null; // Helpful resource links
  isCompleted: boolean;
  completedAt: string | null;
  isCustom: boolean;
  position: number;
  // Expanded relations
  expand?: {
    instance?: Checklist;
    sourceItem?: Item;
    parent?: ChecklistItem;
  };
}

export interface ChecklistItemCreate {
  instance: string;
  sourceItem?: string;
  parent?: string;
  path: string;
  content: string;
  description?: string;
  resources?: ResourceLink[];
  isCompleted?: boolean;
  completedAt?: string;
  isCustom?: boolean;
  position: number;
}

export interface ChecklistItemUpdate {
  parent?: string | null;
  path?: string;
  content?: string;
  description?: string | null;
  resources?: ResourceLink[] | null;
  isCompleted?: boolean;
  completedAt?: string | null;
  isCustom?: boolean;
  position?: number;
}

// ============================================================================
// Notification Collection
// ============================================================================

export interface NotificationData {
  templateId?: string;
  templateTitle?: string;
  collaboratorId?: string;
  checklistId?: string;
  [key: string]: unknown;
}

export interface Notification extends BaseRecord {
  collectionName: 'notifications';
  user: string; // User ID
  type: NotificationType;
  title: string;
  message: string | null;
  data: NotificationData | null;
  isRead: boolean;
  // Expanded relations
  expand?: {
    user?: User;
  };
}

export interface NotificationCreate {
  user: string;
  type: NotificationType;
  title: string;
  message?: string;
  data?: NotificationData;
  isRead?: boolean;
}

export interface NotificationUpdate {
  isRead?: boolean;
}

// ============================================================================
// Activity Log Collection
// ============================================================================

export interface ActivityMetadata {
  previousValue?: unknown;
  newValue?: unknown;
  itemId?: string;
  collaboratorId?: string;
  [key: string]: unknown;
}

export interface ActivityLog extends BaseRecord {
  collectionName: 'activityLog';
  user: string; // User ID
  resourceType: ResourceType;
  resourceId: string;
  action: ActivityAction;
  metadata: ActivityMetadata | null;
  // Expanded relations
  expand?: {
    user?: User;
  };
}

export interface ActivityLogCreate {
  user: string;
  resourceType: ResourceType;
  resourceId: string;
  action: ActivityAction;
  metadata?: ActivityMetadata;
}

// ActivityLog records are immutable, no update interface needed

// ============================================================================
// Collection Names (for type-safe collection access)
// Note: These map to actual PocketBase collection names which remain unchanged
// ============================================================================

export type CollectionName = 
  | 'users' 
  | 'workspaces' 
  | 'blueprints'  // Template collection in PocketBase
  | 'items' 
  | 'collaborators' 
  | 'instances'   // Checklist collection in PocketBase
  | 'instanceItems' // ChecklistItem collection in PocketBase
  | 'notifications' 
  | 'activityLog';

export const Collections = {
  USERS: 'users' as const,
  WORKSPACES: 'workspaces' as const,
  TEMPLATES: 'blueprints' as const, // Maps to 'blueprints' collection in PocketBase
  ITEMS: 'items' as const,
  COLLABORATORS: 'collaborators' as const,
  CHECKLISTS: 'instances' as const,  // Maps to 'instances' collection in PocketBase
  CHECKLIST_ITEMS: 'instanceItems' as const, // Maps to 'instanceItems' collection in PocketBase
  NOTIFICATIONS: 'notifications' as const,
  ACTIVITY_LOG: 'activityLog' as const,
} as const;

// ============================================================================
// Type Guards
// ============================================================================

export function isUser(record: BaseRecord): record is User {
  return record.collectionName === 'users';
}

export function isWorkspace(record: BaseRecord): record is Workspace {
  return record.collectionName === 'workspaces';
}

export function isTemplate(record: BaseRecord): record is Template {
  return record.collectionName === 'blueprints';
}

export function isItem(record: BaseRecord): record is Item {
  return record.collectionName === 'items';
}

export function isCollaborator(record: BaseRecord): record is Collaborator {
  return record.collectionName === 'collaborators';
}

export function isChecklist(record: BaseRecord): record is Checklist {
  return record.collectionName === 'instances';
}

export function isChecklistItem(record: BaseRecord): record is ChecklistItem {
  return record.collectionName === 'instanceItems';
}

export function isNotification(record: BaseRecord): record is Notification {
  return record.collectionName === 'notifications';
}

export function isActivityLog(record: BaseRecord): record is ActivityLog {
  return record.collectionName === 'activityLog';
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Helper type to get the create input type for a collection
 */
export type CreateInput<T extends CollectionName> = 
  T extends 'users' ? UserCreate :
  T extends 'workspaces' ? WorkspaceCreate :
  T extends 'blueprints' ? TemplateCreate :
  T extends 'items' ? ItemCreate :
  T extends 'collaborators' ? CollaboratorCreate :
  T extends 'instances' ? ChecklistCreate :
  T extends 'instanceItems' ? ChecklistItemCreate :
  T extends 'notifications' ? NotificationCreate :
  T extends 'activityLog' ? ActivityLogCreate :
  never;

/**
 * Helper type to get the update input type for a collection
 */
export type UpdateInput<T extends CollectionName> = 
  T extends 'users' ? UserUpdate :
  T extends 'workspaces' ? WorkspaceUpdate :
  T extends 'blueprints' ? TemplateUpdate :
  T extends 'items' ? ItemUpdate :
  T extends 'collaborators' ? CollaboratorUpdate :
  T extends 'instances' ? ChecklistUpdate :
  T extends 'instanceItems' ? ChecklistItemUpdate :
  T extends 'notifications' ? NotificationUpdate :
  T extends 'activityLog' ? never : // ActivityLog is immutable
  never;

/**
 * Helper type to get the record type for a collection
 */
export type RecordType<T extends CollectionName> = 
  T extends 'users' ? User :
  T extends 'workspaces' ? Workspace :
  T extends 'blueprints' ? Template :
  T extends 'items' ? Item :
  T extends 'collaborators' ? Collaborator :
  T extends 'instances' ? Checklist :
  T extends 'instanceItems' ? ChecklistItem :
  T extends 'notifications' ? Notification :
  T extends 'activityLog' ? ActivityLog :
  never;
export const isInstanceItem = isChecklistItem;

// ============================================================================
// User-Facing Type Aliases
// ============================================================================

/**
 * Task - User-facing alias for ChecklistItem
 * Represents an individual task within an active checklist.
 * Maps to the 'instanceItems' collection in PocketBase.
 */
export type Task = ChecklistItem;

/** User-facing alias for ChecklistItemCreate */
export type TaskCreate = ChecklistItemCreate;

/** User-facing alias for ChecklistItemUpdate */
export type TaskUpdate = ChecklistItemUpdate;

/** User-facing type guard for Task (alias for isChecklistItem) */
export const isTask = isChecklistItem;

// Legacy collection constant aliases
/** @deprecated Use Collections.TEMPLATES instead */
export const BLUEPRINTS_COLLECTION = Collections.TEMPLATES;
/** @deprecated Use Collections.CHECKLISTS instead */
export const INSTANCES_COLLECTION = Collections.CHECKLISTS;
/** @deprecated Use Collections.CHECKLIST_ITEMS instead */
export const INSTANCE_ITEMS_COLLECTION = Collections.CHECKLIST_ITEMS;
export type InstanceUpdate = ChecklistUpdate;
/** @deprecated Use ChecklistItem instead */
export type InstanceItem = ChecklistItem;
/** @deprecated Use ChecklistItemCreate instead */
export type InstanceItemCreate = ChecklistItemCreate;
/** @deprecated Use ChecklistItemUpdate instead */
export type InstanceItemUpdate = ChecklistItemUpdate;
/** @deprecated Use isTemplate instead */
export const isBlueprint = isTemplate;
/** @deprecated Use isChecklist instead */
export const isInstance = isChecklist;
/** @deprecated Use isChecklistItem instead */

/** @deprecated Use Template instead */
export type Blueprint = Template;
/** @deprecated Use TemplateCreate instead */
export type BlueprintCreate = TemplateCreate;
/** @deprecated Use TemplateUpdate instead */
export type BlueprintUpdate = TemplateUpdate;
/** @deprecated Use Checklist instead */
export type Instance = Checklist;
/** @deprecated Use ChecklistCreate instead */
export type InstanceCreate = ChecklistCreate;
/** @deprecated Use ChecklistUpdate instead */
// ============================================================================
// End of Types
// ============================================================================