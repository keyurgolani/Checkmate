/**
 * Type-Safe PocketBase Client Wrapper
 * 
 * Provides type-safe access to PocketBase collections with full TypeScript support.
 * This wrapper ensures that all CRUD operations are properly typed based on the
 * collection schemas defined in pocketbase-types.ts.
 */

import PocketBase, { RecordService, ListResult, RecordSubscription } from 'pocketbase';
import { createPocketBaseClient, getPocketBaseClient } from './pocketbase';
import {
  Collections,
  CollectionName,
  RecordType,
  CreateInput,
  UpdateInput,
  User,
  Workspace,
  Blueprint,
  Item,
  Collaborator,
  Instance,
  InstanceItem,
  Notification,
  ActivityLog,
  UserCreate,
  UserUpdate,
  WorkspaceCreate,
  WorkspaceUpdate,
  BlueprintCreate,
  BlueprintUpdate,
  ItemCreate,
  ItemUpdate,
  CollaboratorCreate,
  CollaboratorUpdate,
  InstanceCreate,
  InstanceUpdate,
  InstanceItemCreate,
  InstanceItemUpdate,
  NotificationCreate,
  NotificationUpdate,
  ActivityLogCreate,
} from './pocketbase-types';

// ============================================================================
// Query Options Types
// ============================================================================

export interface ListOptions {
  page?: number;
  perPage?: number;
  sort?: string;
  filter?: string;
  expand?: string;
  fields?: string;
  skipTotal?: boolean;
}

export interface GetOptions {
  expand?: string;
  fields?: string;
}

// ============================================================================
// Type-Safe Collection Service
// ============================================================================

/**
 * Generic type-safe collection service that wraps PocketBase RecordService
 */
export class TypedCollectionService<
  TRecord extends RecordType<CollectionName>,
  TCreate,
  TUpdate
> {
  constructor(
    private pb: PocketBase,
    private collectionName: CollectionName
  ) {}

  /**
   * Get the underlying PocketBase RecordService
   */
  get service(): RecordService {
    return this.pb.collection(this.collectionName);
  }

  /**
   * Get a single record by ID
   */
  async getOne(id: string, options?: GetOptions): Promise<TRecord> {
    return this.service.getOne(id, options) as Promise<TRecord>;
  }

  /**
   * Get a list of records with pagination
   */
  async getList(
    page: number = 1,
    perPage: number = 30,
    options?: Omit<ListOptions, 'page' | 'perPage'>
  ): Promise<ListResult<TRecord>> {
    return this.service.getList(page, perPage, options) as Promise<ListResult<TRecord>>;
  }

  /**
   * Get all records matching the filter (auto-paginated)
   */
  async getFullList(options?: ListOptions): Promise<TRecord[]> {
    return this.service.getFullList(options) as Promise<TRecord[]>;
  }

  /**
   * Get the first record matching the filter
   */
  async getFirstListItem(filter: string, options?: GetOptions): Promise<TRecord> {
    return this.service.getFirstListItem(filter, options) as Promise<TRecord>;
  }

  /**
   * Create a new record
   */
  async create(data: TCreate, options?: GetOptions): Promise<TRecord> {
    return this.service.create(data as Record<string, unknown>, options) as Promise<TRecord>;
  }

  /**
   * Update an existing record
   */
  async update(id: string, data: TUpdate, options?: GetOptions): Promise<TRecord> {
    return this.service.update(id, data as Record<string, unknown>, options) as Promise<TRecord>;
  }

  /**
   * Delete a record
   */
  async delete(id: string): Promise<boolean> {
    return this.service.delete(id);
  }

  /**
   * Subscribe to realtime changes
   */
  subscribe(
    topic: string,
    callback: (data: RecordSubscription<TRecord>) => void
  ): Promise<() => void> {
    return this.service.subscribe(topic, callback as (data: RecordSubscription<unknown>) => void);
  }

  /**
   * Unsubscribe from realtime changes
   */
  unsubscribe(topic?: string): Promise<void> {
    return this.service.unsubscribe(topic);
  }
}

// ============================================================================
// Typed PocketBase Client
// ============================================================================

/**
 * Type-safe PocketBase client with typed collection accessors
 */
export class TypedPocketBase {
  private pb: PocketBase;

  // Typed collection services
  private _users: TypedCollectionService<User, UserCreate, UserUpdate> | null = null;
  private _workspaces: TypedCollectionService<Workspace, WorkspaceCreate, WorkspaceUpdate> | null = null;
  private _blueprints: TypedCollectionService<Blueprint, BlueprintCreate, BlueprintUpdate> | null = null;
  private _items: TypedCollectionService<Item, ItemCreate, ItemUpdate> | null = null;
  private _collaborators: TypedCollectionService<Collaborator, CollaboratorCreate, CollaboratorUpdate> | null = null;
  private _instances: TypedCollectionService<Instance, InstanceCreate, InstanceUpdate> | null = null;
  private _instanceItems: TypedCollectionService<InstanceItem, InstanceItemCreate, InstanceItemUpdate> | null = null;
  private _notifications: TypedCollectionService<Notification, NotificationCreate, NotificationUpdate> | null = null;
  private _activityLog: TypedCollectionService<ActivityLog, ActivityLogCreate, never> | null = null;

  constructor(pb?: PocketBase) {
    this.pb = pb ?? getPocketBaseClient();
  }

  /**
   * Get the underlying PocketBase client
   */
  get client(): PocketBase {
    return this.pb;
  }

  /**
   * Get the auth store
   */
  get authStore() {
    return this.pb.authStore;
  }

  // ============================================================================
  // Typed Collection Accessors
  // ============================================================================

  /**
   * Users collection (auth collection)
   */
  get users(): TypedCollectionService<User, UserCreate, UserUpdate> {
    if (!this._users) {
      this._users = new TypedCollectionService<User, UserCreate, UserUpdate>(
        this.pb,
        Collections.USERS
      );
    }
    return this._users;
  }

  /**
   * Workspaces collection
   */
  get workspaces(): TypedCollectionService<Workspace, WorkspaceCreate, WorkspaceUpdate> {
    if (!this._workspaces) {
      this._workspaces = new TypedCollectionService<Workspace, WorkspaceCreate, WorkspaceUpdate>(
        this.pb,
        Collections.WORKSPACES
      );
    }
    return this._workspaces;
  }

  /**
   * Blueprints collection
   */
  get blueprints(): TypedCollectionService<Blueprint, BlueprintCreate, BlueprintUpdate> {
    if (!this._blueprints) {
      this._blueprints = new TypedCollectionService<Blueprint, BlueprintCreate, BlueprintUpdate>(
        this.pb,
        Collections.TEMPLATES
      );
    }
    return this._blueprints;
  }

  /**
   * Items collection (checklist items)
   */
  get items(): TypedCollectionService<Item, ItemCreate, ItemUpdate> {
    if (!this._items) {
      this._items = new TypedCollectionService<Item, ItemCreate, ItemUpdate>(
        this.pb,
        Collections.ITEMS
      );
    }
    return this._items;
  }

  /**
   * Collaborators collection
   */
  get collaborators(): TypedCollectionService<Collaborator, CollaboratorCreate, CollaboratorUpdate> {
    if (!this._collaborators) {
      this._collaborators = new TypedCollectionService<Collaborator, CollaboratorCreate, CollaboratorUpdate>(
        this.pb,
        Collections.COLLABORATORS
      );
    }
    return this._collaborators;
  }

  /**
   * Instances collection (checklist instances)
   */
  get instances(): TypedCollectionService<Instance, InstanceCreate, InstanceUpdate> {
    if (!this._instances) {
      this._instances = new TypedCollectionService<Instance, InstanceCreate, InstanceUpdate>(
        this.pb,
        Collections.CHECKLISTS
      );
    }
    return this._instances;
  }

  /**
   * Instance items collection
   */
  get instanceItems(): TypedCollectionService<InstanceItem, InstanceItemCreate, InstanceItemUpdate> {
    if (!this._instanceItems) {
      this._instanceItems = new TypedCollectionService<InstanceItem, InstanceItemCreate, InstanceItemUpdate>(
        this.pb,
        Collections.CHECKLIST_ITEMS
      );
    }
    return this._instanceItems;
  }

  /**
   * Notifications collection
   */
  get notifications(): TypedCollectionService<Notification, NotificationCreate, NotificationUpdate> {
    if (!this._notifications) {
      this._notifications = new TypedCollectionService<Notification, NotificationCreate, NotificationUpdate>(
        this.pb,
        Collections.NOTIFICATIONS
      );
    }
    return this._notifications;
  }

  /**
   * Activity log collection (immutable - no updates)
   */
  get activityLog(): TypedCollectionService<ActivityLog, ActivityLogCreate, never> {
    if (!this._activityLog) {
      this._activityLog = new TypedCollectionService<ActivityLog, ActivityLogCreate, never>(
        this.pb,
        Collections.ACTIVITY_LOG
      );
    }
    return this._activityLog;
  }

  // ============================================================================
  // Generic Collection Access
  // ============================================================================

  /**
   * Get a typed collection service by name
   */
  collection<T extends CollectionName>(
    name: T
  ): TypedCollectionService<RecordType<T>, CreateInput<T>, UpdateInput<T>> {
    return new TypedCollectionService<RecordType<T>, CreateInput<T>, UpdateInput<T>>(
      this.pb,
      name
    );
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new TypedPocketBase client instance.
 * Each call returns a fresh instance to avoid state sharing issues in SSR.
 */
export function createTypedPocketBase(): TypedPocketBase {
  return new TypedPocketBase(createPocketBaseClient());
}

/**
 * Get a TypedPocketBase client for browser-side usage.
 * Reuses the same underlying PocketBase instance.
 */
let browserTypedClient: TypedPocketBase | null = null;

export function getTypedPocketBase(): TypedPocketBase {
  if (typeof window === 'undefined') {
    // Server-side: always create a new instance
    return createTypedPocketBase();
  }

  // Client-side: reuse the same instance
  if (!browserTypedClient) {
    browserTypedClient = new TypedPocketBase();
  }

  return browserTypedClient;
}

// ============================================================================
// Default Export
// ============================================================================

export default TypedPocketBase;
