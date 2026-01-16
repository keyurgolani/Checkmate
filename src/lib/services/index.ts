/**
 * Services Index
 * 
 * Re-exports all service modules for convenient imports.
 * Note: Some modules have conflicting exports, so we use explicit re-exports
 * to avoid ambiguity.
 */

// Auth service
export * from './auth';

// Template service
export type {
  CreateTemplateInput,
  UpdateTemplateInput,
  TemplateError,
  TemplateResult,
  SearchFilters as TemplateSearchFilters,
  PaginatedResult as TemplatePaginatedResult,
} from './template';

export {
  TemplateService,
  TemplateErrorCodes,
  DEFAULT_PAGE_SIZE as DEFAULT_TEMPLATE_PAGE_SIZE,
  createTemplateService,
  getTemplateService,
  validateTitle,
  validateVisibility,
  MAX_TITLE_LENGTH,
} from './template';

// Item service
export * from './item';

// Checklist service
export type {
  ChecklistError,
  CreateChecklistInput,
  ChecklistResult,
  ChecklistCreationResult,
  BatchTaskResult,
  SyncConflict,
  SyncResult,
  AddCustomTaskInput,
  ModifyTaskInput,
  TaskResult,
  ProgressResult,
  ToggleCompletionResult,
} from './checklist';

export {
  ChecklistService,
  ChecklistErrorCodes,
  MAX_TASK_DEPTH,
  validateName as validateChecklistName,
} from './checklist';

// Circular dependency service
export * from './circular-dependency';

// Collaboration service
export * from './collaboration';

// Notification service
export * from './notification';

// Activity service
export * from './activity';

// Search service - has SearchFilters (conflicts with template)
export type {
  SearchFilters as SearchServiceFilters,
  Category,
  CategoryOperationResult,
  SearchResult,
  SearchError,
  SearchOperationResult,
} from './search';

export {
  SearchService,
  SearchErrorCodes,
  DEFAULT_SEARCH_PAGE_SIZE,
  MAX_SEARCH_PAGE_SIZE,
  MIN_QUERY_LENGTH,
  createSearchService,
  getSearchService,
} from './search';

// Workspace service - has PaginatedResult, DEFAULT_PAGE_SIZE, validateName (conflicts)
export type {
  WorkspaceError,
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  WorkspaceResult,
  WorkspaceStatistics,
} from './workspace';

export {
  WorkspaceService,
  WorkspaceErrorCodes,
  MAX_NAME_LENGTH as MAX_WORKSPACE_NAME_LENGTH,
  DEFAULT_PAGE_SIZE as DEFAULT_WORKSPACE_PAGE_SIZE,
  DEFAULT_WORKSPACE_NAME,
  validateName as validateWorkspaceName,
  createWorkspaceService,
  getWorkspaceService,
} from './workspace';

// Export service
export * from './export';

// Preferences service
export * from './preferences';

// Realtime service
export * from './realtime';

// Re-export server-side auth utilities
export * from '../server-auth';
export * from '../auth-cookies';

// Re-export PocketBase types and typed client
export * from '../pocketbase-types';
export * from '../pocketbase-client';
