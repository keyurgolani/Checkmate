/**
 * Property-Based Test Generators
 * Custom generators for fast-check property testing
 * 
 * These generators create valid test data for CheckMate domain objects
 */

import * as fc from 'fast-check';

/**
 * Valid email generator
 */
export const validEmailArb = fc.emailAddress();

/**
 * Valid password generator (8+ chars, mixed case, number, special char)
 */
export const validPasswordArb = fc
  .tuple(
    fc.string({ minLength: 2, maxLength: 20 }).filter(s => /[a-z]/.test(s)),
    fc.string({ minLength: 2, maxLength: 20 }).filter(s => /[A-Z]/.test(s)),
    fc.string({ minLength: 2, maxLength: 10 }).filter(s => /[0-9]/.test(s)),
    fc.constantFrom('!', '@', '#', '$', '%', '^', '&', '*')
  )
  .map(([lower, upper, num, special]) => `${lower}${upper}${num}${special}`);

/**
 * Invalid password generator (too short or missing requirements)
 */
export const invalidPasswordArb = fc.oneof(
  fc.string({ maxLength: 7 }), // Too short
  fc.string({ minLength: 8 }).filter(s => !/[A-Z]/.test(s)), // No uppercase
  fc.string({ minLength: 8 }).filter(s => !/[a-z]/.test(s)), // No lowercase
  fc.string({ minLength: 8 }).filter(s => !/[0-9]/.test(s))  // No number
);

/**
 * Template title generator (1-200 chars, non-empty after trim)
 */
export const validTitleArb = fc
  .string({ minLength: 1, maxLength: 200 })
  .filter(s => s.trim().length > 0);

/**
 * Invalid template title generator (empty or > 200 chars)
 */
export const invalidTitleArb = fc.oneof(
  fc.constant(''),
  fc.constant('   '), // Whitespace only
  fc.string({ minLength: 201, maxLength: 300 }) // Too long
);

/**
 * Visibility generator
 */
export const visibilityArb = fc.constantFrom('private', 'public', 'shared') as fc.Arbitrary<'private' | 'public' | 'shared'>;

/**
 * Permission level generator
 */
export const permissionLevelArb = fc.constantFrom('viewer', 'editor', 'admin') as fc.Arbitrary<'viewer' | 'editor' | 'admin'>;

/**
 * Item type generator
 */
export const itemTypeArb = fc.constantFrom('task', 'reference') as fc.Arbitrary<'task' | 'reference'>;

/**
 * Checklist item generator
 */
export const checklistItemArb = fc.record({
  type: itemTypeArb,
  content: fc.string({ minLength: 1, maxLength: 1000 }),
  position: fc.nat({ max: 1000 }),
});

/**
 * Task item generator (only task type)
 */
export const taskItemArb = fc.record({
  type: fc.constant('task' as const),
  content: fc.string({ minLength: 1, maxLength: 1000 }),
  position: fc.nat({ max: 1000 }),
});

/**
 * Reference item generator (only reference type)
 */
export const referenceItemArb = fc.record({
  type: fc.constant('reference' as const),
  content: fc.string({ minLength: 1, maxLength: 1000 }),
  position: fc.nat({ max: 1000 }),
  referenceId: fc.uuid(),
});

/**
 * Template data generator
 */
export const templateArb = fc.record({
  title: validTitleArb,
  description: fc.string({ maxLength: 2000 }),
  visibility: visibilityArb,
  category: fc.string({ minLength: 1, maxLength: 50 }),
  tags: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { maxLength: 10 }),
});

/**
 * Workspace data generator
 */
export const workspaceArb = fc.record({
  name: fc.string({ minLength: 1, maxLength: 100 }),
  description: fc.string({ maxLength: 500 }),
});

/**
 * Hex color generator
 */
const hexCharArb = fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f');
const hexColorArb = fc.tuple(hexCharArb, hexCharArb, hexCharArb, hexCharArb, hexCharArb, hexCharArb)
  .map(chars => `#${chars.join('')}`);

/**
 * User preferences generator
 */
export const userPreferencesArb = fc.record({
  theme: fc.constantFrom('light', 'dark', 'system'),
  accentColor: hexColorArb,
  notifications: fc.record({
    email: fc.boolean(),
    inApp: fc.boolean(),
    push: fc.boolean(),
  }),
});

/**
 * Nested items generator with depth limit
 * Prevents infinite recursion by limiting depth
 */
export interface NestedItem {
  type: 'task' | 'reference';
  content: string;
  position: number;
  children: NestedItem[];
}

export const nestedItemsArb = (maxDepth: number): fc.Arbitrary<NestedItem[]> => {
  if (maxDepth <= 0) {
    return fc.constant([] as NestedItem[]);
  }
  
  return fc.array(
    fc.record({
      type: itemTypeArb,
      content: fc.string({ minLength: 1, maxLength: 500 }),
      position: fc.nat({ max: 100 }),
      children: fc.oneof(
        { weight: 3, arbitrary: fc.constant([] as NestedItem[]) },
        { weight: 1, arbitrary: nestedItemsArb(maxDepth - 1) }
      ),
    }),
    { maxLength: 5 }
  ) as fc.Arbitrary<NestedItem[]>;
};

/**
 * Acyclic reference graph generator
 * Generates a graph of templates with references that is guaranteed to be acyclic
 */
export interface GraphNode {
  id: string;
  references: string[];
}

export const acyclicGraphArb = fc
  .array(
    fc.record({
      id: fc.uuid(),
      references: fc.array(fc.uuid(), { maxLength: 3 }),
    }),
    { minLength: 1, maxLength: 20 }
  )
  .map((nodes): GraphNode[] => {
    // Ensure no cycles by only allowing references to earlier nodes
    const nodeIds = nodes.map(n => n.id);
    return nodes.map((node, i) => ({
      id: node.id,
      references: node.references
        .filter((_, j) => j < i)
        .filter(refId => nodeIds.slice(0, i).includes(refId)),
    }));
  });

/**
 * Cyclic reference graph generator
 * Generates a graph that is guaranteed to have at least one cycle
 */
export const cyclicGraphArb = fc
  .array(fc.uuid(), { minLength: 2, maxLength: 10 })
  .map((ids): GraphNode[] => {
    // Create a cycle: last node references first node
    return ids.map((id, i) => {
      const nextRef = i === ids.length - 1 ? ids[0] : ids[i + 1];
      return {
        id,
        references: nextRef ? [nextRef] : [],
      };
    });
  });

/**
 * Progress percentage generator (0-100)
 */
export const progressArb = fc.integer({ min: 0, max: 100 });

/**
 * Checklist completion state generator
 */
export const checklistCompletionArb = fc.record({
  totalItems: fc.integer({ min: 1, max: 100 }),
  completedItems: fc.integer({ min: 0, max: 100 }),
}).filter(({ totalItems, completedItems }) => completedItems <= totalItems);

/**
 * Search query generator
 */
export const searchQueryArb = fc.string({ minLength: 1, maxLength: 100 });

/**
 * Search filters generator
 */
export const searchFiltersArb = fc.record({
  category: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
  tags: fc.option(fc.array(fc.string({ minLength: 1, maxLength: 30 }), { maxLength: 5 })),
  sortBy: fc.option(fc.constantFrom('relevance', 'popularity', 'rating', 'date')),
  page: fc.option(fc.integer({ min: 1, max: 100 })),
  limit: fc.option(fc.integer({ min: 1, max: 50 })),
});

/**
 * Export format generator
 */
export const exportFormatArb = fc.constantFrom('json', 'csv', 'markdown');

/**
 * UUID generator
 */
export const uuidArb = fc.uuid();

/**
 * Timestamp generator (within reasonable range)
 */
export const timestampArb = fc.date({
  min: new Date('2020-01-01'),
  max: new Date('2030-12-31'),
});


// ============================================================================
// New Collection Generators
// ============================================================================

/**
 * Notification type generator
 */
export const notificationTypeArb = fc.constantFrom(
  'collaboration_invite',
  'collaboration_accepted',
  'collaboration_revoked',
  'blueprint_updated',
  'instance_reminder',
  'access_request',
  'system'
) as fc.Arbitrary<'collaboration_invite' | 'collaboration_accepted' | 'collaboration_revoked' | 'blueprint_updated' | 'instance_reminder' | 'access_request' | 'system'>;

/**
 * Resource type generator
 */
export const resourceTypeArb = fc.constantFrom(
  'template',
  'item',
  'checklist',
  'checklistItem',
  'collaborator',
  'workspace'
) as fc.Arbitrary<'template' | 'item' | 'checklist' | 'checklistItem' | 'collaborator' | 'workspace'>;

/**
 * Activity action generator
 */
export const activityActionArb = fc.constantFrom(
  'create',
  'update',
  'delete',
  'complete',
  'uncomplete',
  'invite',
  'accept',
  'revoke'
) as fc.Arbitrary<'create' | 'update' | 'delete' | 'complete' | 'uncomplete' | 'invite' | 'accept' | 'revoke'>;

/**
 * Collaborator data generator
 */
export const collaboratorArb = fc.record({
  blueprint: fc.uuid(), // DB field remains blueprint
  user: fc.uuid(),
  permissionLevel: permissionLevelArb,
  invitedAt: timestampArb.map(d => d.toISOString()),
  acceptedAt: fc.option(timestampArb.map(d => d.toISOString())),
});

/**
 * Checklist data generator
 */
export const checklistArb = fc.record({
  blueprint: fc.uuid(), // DB field remains blueprint
  user: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 200 }),
  isSynced: fc.boolean(),
  progress: fc.float({ min: 0, max: 100, noNaN: true }),
  completedAt: fc.option(timestampArb.map(d => d.toISOString())),
});

/**
 * Checklist item data generator
 * (Uses DB field 'instance' which maps to checklist ID, if I remember correctly checklist item has 'instance' as field)
 */
export const checklistItemDataArb = fc.record({
  instance: fc.uuid(), // DB field remains instance
  sourceItem: fc.option(fc.uuid()),
  parent: fc.option(fc.uuid()),
  path: fc.string({ minLength: 1, maxLength: 500 }),
  content: fc.string({ minLength: 1, maxLength: 1000 }),
  isCompleted: fc.boolean(),
  completedAt: fc.option(timestampArb.map(d => d.toISOString())),
  isCustom: fc.boolean(),
  position: fc.nat({ max: 1000 }),
});

/**
 * Notification data generator
 */
export const notificationDataArb = fc.record({
  templateId: fc.option(fc.uuid()),
  templateTitle: fc.option(fc.string({ minLength: 1, maxLength: 200 })),
  collaboratorId: fc.option(fc.uuid()),
  checklistId: fc.option(fc.uuid()),
});

/**
 * Notification generator
 */
export const notificationArb = fc.record({
  user: fc.uuid(),
  type: notificationTypeArb,
  title: fc.string({ minLength: 1, maxLength: 200 }),
  message: fc.option(fc.string({ maxLength: 1000 })),
  data: fc.option(notificationDataArb),
  isRead: fc.boolean(),
});

/**
 * Activity metadata generator
 */
export const activityMetadataArb = fc.record({
  previousValue: fc.option(fc.string({ maxLength: 500 })),
  newValue: fc.option(fc.string({ maxLength: 500 })),
  itemId: fc.option(fc.uuid()),
  collaboratorId: fc.option(fc.uuid()),
});

/**
 * Activity log generator
 */
export const activityLogArb = fc.record({
  user: fc.uuid(),
  resourceType: resourceTypeArb,
  resourceId: fc.uuid(),
  action: activityActionArb,
  metadata: fc.option(activityMetadataArb),
});
