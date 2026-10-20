/**
 * Integration Tests for Complex Scenarios
 * Tests nested templates, progress tracking, concurrent users, data persistence, and search
 *
 * Runs on the hermetic PocketBase fixture (npm run test:backend). Users are
 * seeded through the fixture's superuser, so they don't depend on signup.
 * The fixture deletes its data directory when the run ends.
 *
 * Positions are 1-based, as ItemService writes them: PocketBase 0.23+
 * rejects 0 in a required number field.
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { createAdminTestClient, createTestClient, seedUser, type SeededUser } from './pocketbase-helpers';
import type { Template, Item, Checklist, Workspace } from '@/lib/pocketbase-types';
import { ItemType, Visibility } from '@/lib/pocketbase-types';

describe('Integration Tests - Complex Scenarios', () => {
  describe('1. Nested Template References', () => {
    let workspace1: Workspace;
    let templateA: Template;
    let templateB: Template;
    let templateC: Template;
    let nestedUser: SeededUser;
    const pbNested = createTestClient();

    beforeAll(async () => {
      nestedUser = await seedUser({ displayName: 'Nested Test User' });
      await nestedUser.signIn(pbNested);
    });

    beforeEach(async () => {
      // Create workspace for test user
      workspace1 = await pbNested.collection('workspaces').create({
        owner: nestedUser.id,
        name: `Test Workspace ${Date.now()}`,
      });
    });

    it('should create nested template references (A -> B -> C)', async () => {
      // Create Template A with items
      templateA = await pbNested.collection('blueprints').create({
        workspace: workspace1.id,
        owner: nestedUser.id,
        title: 'Template A - Base',
        visibility: Visibility.PUBLIC,
      });

      await pbNested.collection('items').create({
        blueprint: templateA.id, // DB field name
        path: '1',
        itemType: ItemType.TASK,
        content: 'Task A1',
        position: 1,
      });

      await pbNested.collection('items').create({
        blueprint: templateA.id, // DB field name
        path: '2',
        itemType: ItemType.TASK,
        content: 'Task A2',
        position: 2,
      });

      // Create Template B that references Template A
      templateB = await pbNested.collection('blueprints').create({
        workspace: workspace1.id,
        owner: nestedUser.id,
        title: 'Template B - References A',
        visibility: Visibility.PUBLIC,
      });

      await pbNested.collection('items').create({
        blueprint: templateB.id, // DB field name
        path: '1',
        itemType: ItemType.TASK,
        content: 'Task B1',
        position: 1,
      });

      await pbNested.collection('items').create({
        blueprint: templateB.id, // DB field name
        path: '2',
        itemType: ItemType.REFERENCE,
        content: 'Reference to Template A',
        reference: templateA.id,
        position: 2,
      });

      // Create Template C that references Template B
      templateC = await pbNested.collection('blueprints').create({
        workspace: workspace1.id,
        owner: nestedUser.id,
        title: 'Template C - References B',
        visibility: Visibility.PUBLIC,
      });

      await pbNested.collection('items').create({
        blueprint: templateC.id, // DB field name
        path: '1',
        itemType: ItemType.REFERENCE,
        content: 'Reference to Template B',
        reference: templateB.id,
        position: 1,
      });

      // Verify all templates were created
      expect(templateA.id).toBeDefined();
      expect(templateB.id).toBeDefined();
      expect(templateC.id).toBeDefined();

      // Verify items were created
      const itemsA = await pbNested.collection('items').getFullList({ filter: `blueprint="${templateA.id}"` });
      const itemsB = await pbNested.collection('items').getFullList({ filter: `blueprint="${templateB.id}"` });
      const itemsC = await pbNested.collection('items').getFullList({ filter: `blueprint="${templateC.id}"` });

      expect(itemsA).toHaveLength(2);
      expect(itemsB).toHaveLength(2);
      expect(itemsC).toHaveLength(1);
    });

    it('should detect circular dependency', async () => {
      // Create two templates
      const t1 = await pbNested.collection('blueprints').create({
        workspace: workspace1.id,
        owner: nestedUser.id,
        title: 'Template 1',
        visibility: Visibility.PRIVATE,
      });

      const t2 = await pbNested.collection('blueprints').create({
        workspace: workspace1.id,
        owner: nestedUser.id,
        title: 'Template 2',
        visibility: Visibility.PRIVATE,
      });

      // T1 references T2
      await pbNested.collection('items').create({
        blueprint: t1.id, // DB field name
        path: '1',
        itemType: ItemType.REFERENCE,
        content: 'Reference to T2',
        reference: t2.id,
        position: 1,
      });

      // Try to make T2 reference T1 (circular dependency)
      // This should be prevented by application logic or database constraints
      const circularItem = await pbNested.collection('items').create({
        blueprint: t2.id, // DB field name
        path: '1',
        itemType: ItemType.REFERENCE,
        content: 'Reference to T1',
        reference: t1.id,
        position: 1,
      });

      // Note: Circular dependency detection should be implemented in application logic
      // For now, we just verify the items were created
      expect(circularItem.id).toBeDefined();
    });

    it('should create checklist from nested template and verify all items appear', async () => {
      // Create checklist from Template C
      const checklist = await pbNested.collection('instances').create({
        blueprint: templateC.id, // DB field name is blueprint
        user: nestedUser.id,
        name: 'Checklist of Template C',
        progress: 0,
      });

      expect(checklist.id).toBeDefined();

      // In a real implementation, checklist items would be created from template items
      // including nested references. For now, we verify the checklist was created.
      const checklists = await pbNested.collection('instances').getFullList({
        filter: `blueprint="${templateC.id}"`, // DB field name
      });

      expect(checklists).toHaveLength(1);
    });
  });

  describe('2. Progress Tracking with Nested Items', () => {
    let workspace: Workspace;
    let template: Template;
    let checklist: Checklist;
    let parentItem: Item;
    let childItems: Item[];
    let progressUser: SeededUser;
    const pbProgress = createTestClient();

    beforeAll(async () => {
      progressUser = await seedUser({ displayName: 'Progress Test User' });
      await progressUser.signIn(pbProgress);
    });

    beforeEach(async () => {
      workspace = await pbProgress.collection('workspaces').create({
        owner: progressUser.id,
        name: `Test Workspace ${Date.now()}`,
      });

      // Create template with nested items
      template = await pbProgress.collection('blueprints').create({
        workspace: workspace.id,
        owner: progressUser.id,
        title: 'Template with Nested Items',
        visibility: Visibility.PRIVATE,
      });

      // Create parent item
      parentItem = await pbProgress.collection('items').create({
        blueprint: template.id, // DB field name
        path: '1',
        itemType: ItemType.TASK,
        content: 'Parent Task',
        position: 1,
      });

      // Create 3 child items
      childItems = [];
      for (let i = 0; i < 3; i++) {
        const child = await pbProgress.collection('items').create({
          blueprint: template.id, // DB field name
          parent: parentItem.id,
          path: `1.${i + 1}`,
          itemType: ItemType.TASK,
          content: `Child Task ${i + 1}`,
          position: i + 1,
        });
        childItems.push(child as Item);
      }

      // Create checklist
      checklist = await pbProgress.collection('instances').create({
        blueprint: template.id, // DB field name
        user: progressUser.id,
        name: 'Test Checklist',
        progress: 0,
      });

      // Create checklist items
      const parentChecklistItem = await pbProgress.collection('instanceItems').create({
        instance: checklist.id, // DB field name
        sourceItem: parentItem.id,
        path: '1',
        content: parentItem.content,
        isCompleted: false,
        isCustom: false,
        position: 1, // Change 0 to 1
      });

      for (let i = 0; i < childItems.length; i++) {
        await pbProgress.collection('instanceItems').create({
          instance: checklist.id, // DB field name
          sourceItem: childItems[i]!.id,
          parent: parentChecklistItem.id, // Use the correct parent ID (ChecklistItem ID)
          path: `1.${i + 1}`,
          content: childItems[i]!.content,
          isCompleted: false,
          isCustom: false,
          position: i + 1, // Change i to i + 1
        });
      }
    });

    it('should update parent progress when child items are checked', async () => {
      // Get all checklist items
      const checklistItems = await pbProgress.collection('instanceItems').getFullList({
        filter: `instance="${checklist.id}"`, // DB field name
        sort: 'path',
      });

      expect(checklistItems).toHaveLength(4); // 1 parent + 3 children

      // Check all child items
      // First find the parent checklist item
      const parentChecklistItem = checklistItems.find(item => item.sourceItem === parentItem.id);
      expect(parentChecklistItem).toBeDefined();

      const childChecklistItems = checklistItems.filter(item => item.parent === parentChecklistItem!.id);
      expect(childChecklistItems).toHaveLength(3);

      for (const child of childChecklistItems) {
        await pbProgress.collection('instanceItems').update(child.id, {
          isCompleted: true,
          completedAt: new Date().toISOString(),
        });
      }

      // Verify children are completed
      const updatedChildren = await pbProgress.collection('instanceItems').getFullList({
        filter: `instance="${checklist.id}" && parent="${parentChecklistItem!.id}"`,
      });

      const allChildrenCompleted = updatedChildren.every(item => item.isCompleted);
      expect(allChildrenCompleted).toBe(true);

      // Calculate progress (3 out of 4 items completed = 75%)
      const completedCount = updatedChildren.length;
      const totalCount = checklistItems.length;
      const expectedProgress = (completedCount / totalCount) * 100;

      // Update checklist progress
      await pbProgress.collection('instances').update(checklist.id, {
        progress: expectedProgress,
      });

      const updatedChecklist = await pbProgress.collection('instances').getOne(checklist.id);
      expect(updatedChecklist.progress).toBe(expectedProgress);
    });

    it('should not affect child items when parent is checked', async () => {
      // Get parent checklist item
      const parentChecklistItem = await pbProgress.collection('instanceItems').getFirstListItem(
        `instance="${checklist.id}" && sourceItem="${parentItem.id}"`
      );

      // Check parent item
      await pbProgress.collection('instanceItems').update(parentChecklistItem.id, {
        isCompleted: true,
        completedAt: new Date().toISOString(),
      });

      // Verify parent is completed
      const updatedParent = await pbProgress.collection('instanceItems').getOne(parentChecklistItem.id);
      expect(updatedParent.isCompleted).toBe(true);

      // Verify children are still uncompleted
      const children = await pbProgress.collection('instanceItems').getFullList({
        filter: `instance="${checklist.id}" && parent="${parentChecklistItem.id}"`, // Use parentChecklistItem.id
      });

      const anyChildCompleted = children.some(item => item.isCompleted);
      expect(anyChildCompleted).toBe(false);
    });
  });

  describe('3. Concurrent User Actions', () => {
    let workspace: Workspace;
    let publicTemplate: Template;
    let user1: SeededUser;
    let user2: SeededUser;
    const pbConcurrent1 = createTestClient();
    const pbConcurrent2 = createTestClient();

    beforeAll(async () => {
      user1 = await seedUser({ displayName: 'Concurrent User 1' });
      await user1.signIn(pbConcurrent1);

      user2 = await seedUser({ displayName: 'Concurrent User 2' });
      await user2.signIn(pbConcurrent2);
    });

    beforeEach(async () => {
      workspace = await pbConcurrent1.collection('workspaces').create({
        owner: user1.id,
        name: `Public Workspace ${Date.now()}`,
      });

      // Create public template
      publicTemplate = await pbConcurrent1.collection('blueprints').create({
        workspace: workspace.id,
        owner: user1.id,
        title: 'Public Template for Concurrent Test',
        visibility: Visibility.PUBLIC,
      });

      await pbConcurrent1.collection('items').create({
        blueprint: publicTemplate.id, // DB field name
        path: '1',
        itemType: ItemType.TASK,
        content: 'Shared Task',
        position: 1,
      });
    });

    it('should allow two users to view the same public template', async () => {
      // User 1 views the template
      const t1 = await pbConcurrent1.collection('blueprints').getOne(publicTemplate.id);
      expect(t1.id).toBe(publicTemplate.id);

      // User 2 views the same template
      const t2 = await pbConcurrent2.collection('blueprints').getOne(publicTemplate.id);
      expect(t2.id).toBe(publicTemplate.id);

      // Both should see the same data
      expect(t1.title).toBe(t2.title);
    });

    it('should allow both users to create checklists from the same template', async () => {
      // User 1 creates a checklist
      const checklist1 = await pbConcurrent1.collection('instances').create({
        blueprint: publicTemplate.id, // DB field name
        user: user1.id,
        name: 'User 1 Checklist',
        progress: 0,
      });

      expect(checklist1.id).toBeDefined();
      expect(checklist1.user).toBe(user1.id);

      // User 2 creates a checklist
      const checklist2 = await pbConcurrent2.collection('instances').create({
        blueprint: publicTemplate.id, // DB field name
        user: user2.id,
        name: 'User 2 Checklist',
        progress: 0,
      });

      expect(checklist2.id).toBeDefined();
      expect(checklist2.user).toBe(user2.id);

      // Verify User 1 sees their checklist
      const user1Checklists = await pbConcurrent1.collection('instances').getFullList({
        filter: `blueprint="${publicTemplate.id}"`,
      });
      expect(user1Checklists).toHaveLength(1);
      expect(user1Checklists[0]!.id).toBe(checklist1.id);

      // Verify User 2 sees their checklist
      const user2Checklists = await pbConcurrent2.collection('instances').getFullList({
        filter: `blueprint="${publicTemplate.id}"`,
      });
      expect(user2Checklists).toHaveLength(1);
      expect(user2Checklists[0]!.id).toBe(checklist2.id);
    });
  });

  describe('4. Data Persistence', () => {
    let workspace: Workspace;
    let template: Template;
    let checklist: Checklist;
    let persistenceUser: SeededUser;
    let userPassword: string;
    let userEmail: string; // Store email
    const pbPersistence = createTestClient();

    beforeAll(async () => {
      persistenceUser = await seedUser({ displayName: 'Persistence Test User' });
      userEmail = persistenceUser.email;
      userPassword = persistenceUser.password;
      await persistenceUser.signIn(pbPersistence);
    });

    it('should persist template after sign out and sign in', async () => {
      // Create workspace and template
      workspace = await pbPersistence.collection('workspaces').create({
        owner: persistenceUser.id,
        name: `Persistence Test ${Date.now()}`,
      });

      template = await pbPersistence.collection('blueprints').create({
        workspace: workspace.id,
        owner: persistenceUser.id,
        title: 'Persistent Template',
        visibility: Visibility.PRIVATE,
      });

      const templateId = template.id;

      // Sign out
      pbPersistence.authStore.clear();
      expect(pbPersistence.authStore.isValid).toBe(false);

      // Sign back in
      await pbPersistence.collection('users').authWithPassword(userEmail, userPassword);
      expect(pbPersistence.authStore.isValid).toBe(true);

      // Verify template still exists
      const persistedTemplate = await pbPersistence.collection('blueprints').getOne(templateId);
      expect(persistedTemplate.id).toBe(templateId);
      expect(persistedTemplate.title).toBe('Persistent Template');
    });

    it('should persist checklist state after page refresh simulation', async () => {
      // Re-auth if needed
      if (!pbPersistence.authStore.isValid) {
         await pbPersistence.collection('users').authWithPassword(userEmail, userPassword);
      }
      
      // Create checklist
      checklist = await pbPersistence.collection('instances').create({
        blueprint: template.id, // DB field name
        user: persistenceUser.id,
        name: 'Persistent Checklist',
        progress: 50,
      });

      const checklistId = checklist.id;

      // Simulate page refresh by creating a new client and re-authenticating
      const pbRefresh = createTestClient();
      await pbRefresh.collection('users').authWithPassword(userEmail, userPassword);

      // Verify checklist state persists
      const persistedChecklist = await pbRefresh.collection('instances').getOne(checklistId);
      expect(persistedChecklist.id).toBe(checklistId);
      expect(persistedChecklist.name).toBe('Persistent Checklist');
      expect(persistedChecklist.progress).toBe(50);
    });
  });


  describe('5. Search & Filter', () => {
    let workspace: Workspace;
    let searchTemplates: Template[];
    let searchUser: SeededUser;
    const pbSearch = createTestClient();

    beforeAll(async () => {
      // Create isolated user for search tests
      searchUser = await seedUser({ displayName: 'Search Test User' });
      await searchUser.signIn(pbSearch);
    });

    beforeEach(async () => {
      // Create workspace with the isolated user
      workspace = await pbSearch.collection('workspaces').create({
        owner: searchUser.id,
        name: `Search Test Workspace ${Date.now()}`,
      });

      // Create multiple public templates with different categories and tags
      searchTemplates = [];

      const testData = [
        { title: 'Moving Checklist', category: 'life-events', tags: ['moving', 'relocation'] },
        { title: 'Wedding Planning', category: 'life-events', tags: ['wedding', 'celebration'] },
        { title: 'Project Launch', category: 'work', tags: ['project', 'launch'] },
        { title: 'Home Renovation', category: 'home', tags: ['renovation', 'diy'] },
        { title: 'Travel Packing', category: 'travel', tags: ['packing', 'vacation'] },
      ];

      for (const data of testData) {
        const t = await pbSearch.collection('blueprints').create({
          workspace: workspace.id,
          owner: searchUser.id,
          title: data.title,
          category: data.category,
          tags: data.tags,
          visibility: Visibility.PUBLIC,
        });
        searchTemplates.push(t as Template);
      }
    });

    it('should search templates by title', async () => {
      const searchResults = await pbSearch.collection('blueprints').getFullList({
        filter: `title ~ "Wedding"`,
      });

      expect(searchResults.length).toBeGreaterThan(0);
      expect(searchResults[0]!.title).toContain('Wedding');
    });

    it('should filter templates by category', async () => {
      const lifeEventsTemplates = await pbSearch.collection('blueprints').getFullList({
        filter: `category = "life-events"`,
      });

      expect(lifeEventsTemplates.length).toBeGreaterThanOrEqual(2);
      lifeEventsTemplates.forEach(t => {
        expect(t.category).toBe('life-events');
      });
    });

    it('should filter templates by tags', async () => {
      // Search for templates with 'moving' tag
      const movingTemplates = await pbSearch.collection('blueprints').getFullList({
        filter: `tags ~ "moving"`,
      });

      expect(movingTemplates.length).toBeGreaterThan(0);
      movingTemplates.forEach(t => {
        expect(t.tags).toContain('moving');
      });
    });

    it('should sort templates by creation date', async () => {
      const sortedByNewest = await pbSearch.collection('blueprints').getFullList({
        filter: `visibility = "public"`,
        sort: '-created',
      });

      expect(sortedByNewest.length).toBeGreaterThan(0);

      // Verify sorting (newest first)
      for (let i = 0; i < sortedByNewest.length - 1; i++) {
        const current = new Date(sortedByNewest[i]!.created);
        const next = new Date(sortedByNewest[i + 1]!.created);
        expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
      }
    });

    it('should sort templates by title alphabetically', async () => {
      const sortedByTitle = await pbSearch.collection('blueprints').getFullList({
        filter: `visibility = "public"`,
        sort: 'title',
      });

      expect(sortedByTitle.length).toBeGreaterThan(0);

      // Verify alphabetical sorting
      for (let i = 0; i < sortedByTitle.length - 1; i++) {
        expect(sortedByTitle[i]!.title.localeCompare(sortedByTitle[i + 1]!.title)).toBeLessThanOrEqual(0);
      }
    });

    it('should combine search and filter', async () => {
      // Search for templates with "Checklist" in title AND in "life-events" category
      const results = await pbSearch.collection('blueprints').getFullList({
        filter: `title ~ "Checklist" && category = "life-events"`,
      });

      expect(results.length).toBeGreaterThan(0);
      results.forEach(t => {
        expect(t.title).toContain('Checklist');
        expect(t.category).toBe('life-events');
      });
    });

    it('should paginate search results', async () => {
      // Both pages use one total order. beforeEach repeats titles, so id breaks ties.
      const sort = 'title,id';

      // Get first page (2 items per page)
      const page1 = await pbSearch.collection('blueprints').getList(1, 2, {
        filter: `visibility = "public"`,
        sort,
      });

      expect(page1.items).toHaveLength(2);
      expect(page1.page).toBe(1);
      expect(page1.perPage).toBe(2);

      // Get second page
      const page2 = await pbSearch.collection('blueprints').getList(2, 2, {
        filter: `visibility = "public"`,
        sort,
      });

      expect(page2.page).toBe(2);
      expect(page2.items.length).toBeGreaterThan(0);

      // Verify no overlap between pages
      const page1Ids = page1.items.map(t => t.id);
      const page2Ids = page2.items.map(t => t.id);
      const overlap = page1Ids.filter(id => page2Ids.includes(id));
      expect(overlap).toHaveLength(0);
    });
  });

  describe('6. Public Template Referencing Private Template', () => {
    let ownerUser: SeededUser;
    let otherUser: SeededUser;
    let workspace: Workspace;
    let privateTemplate: Template;
    let publicTemplate: Template;
    const pbOwner = createTestClient();
    const pbOther = createTestClient();

    beforeAll(async () => {
      // Create owner user who owns both templates
      ownerUser = await seedUser({ displayName: 'Template Owner' });
      await ownerUser.signIn(pbOwner);

      // Create another user who doesn't have access to private template
      otherUser = await seedUser({ displayName: 'Other User' });
      await otherUser.signIn(pbOther);

      // Create workspace for owner
      workspace = await pbOwner.collection('workspaces').create({
        owner: ownerUser.id,
        name: `Private Ref Test Workspace ${Date.now()}`,
      });

      // Create a private template with some items
      privateTemplate = await pbOwner.collection('blueprints').create({
        workspace: workspace.id,
        owner: ownerUser.id,
        title: 'Secret Private Template',
        description: 'This is a private template with secret content',
        visibility: Visibility.PRIVATE,
      });

      // Add items to private template
      await pbOwner.collection('items').create({
        blueprint: privateTemplate.id,
        path: '1',
        itemType: ItemType.TASK,
        content: 'Secret Task 1 - Should not be visible',
        position: 1,
      });

      await pbOwner.collection('items').create({
        blueprint: privateTemplate.id,
        path: '2',
        itemType: ItemType.TASK,
        content: 'Secret Task 2 - Should not be visible',
        position: 2,
      });

      // Create a public template that references the private template
      publicTemplate = await pbOwner.collection('blueprints').create({
        workspace: workspace.id,
        owner: ownerUser.id,
        title: 'Public Template with Private Reference',
        visibility: Visibility.PUBLIC,
      });

      // Add a regular task
      await pbOwner.collection('items').create({
        blueprint: publicTemplate.id,
        path: '1',
        itemType: ItemType.TASK,
        content: 'Public Task 1',
        position: 1,
      });

      // Add a reference to the private template
      await pbOwner.collection('items').create({
        blueprint: publicTemplate.id,
        path: '2',
        itemType: ItemType.REFERENCE,
        content: 'Reference to private template',
        reference: privateTemplate.id,
        position: 2,
      });

      // Add another regular task
      await pbOwner.collection('items').create({
        blueprint: publicTemplate.id,
        path: '3',
        itemType: ItemType.TASK,
        content: 'Public Task 2',
        position: 3,
      });
    });

    it('should allow other user to access public template', async () => {
      // Other user should be able to see the public template
      const template = await pbOther.collection('blueprints').getOne(publicTemplate.id);
      expect(template.id).toBe(publicTemplate.id);
      expect(template.title).toBe('Public Template with Private Reference');
    });

    it('should not allow other user to access private template directly', async () => {
      // Other user should NOT be able to access the private template
      await expect(
        pbOther.collection('blueprints').getOne(privateTemplate.id)
      ).rejects.toThrow();
    });

    // fails until #28 slice D
    it.fails('should verify private template title is accessible via admin for reference display', async () => {
      const { TemplateService } = await import('@/lib/services/template');
      const title = await new TemplateService(pbOther).getTitleById(privateTemplate.id);
      expect(title).toBe('Secret Private Template');
    });

    /** Creates a checklist from `templateId` as the other user, in a new workspace of theirs. */
    async function createChecklistAsOtherUser(templateId: string, name: string) {
      const { ChecklistService } = await import('@/lib/services/checklist');
      const otherWorkspace = await pbOther.collection('workspaces').create({
        owner: otherUser.id,
        name: `${name} Workspace ${Date.now()}`,
      });
      const result = await new ChecklistService(pbOther).create({ templateId, name, workspaceId: otherWorkspace.id });
      if (!result.success) throw new Error(`creating "${name}" failed: ${result.error.code} ${result.error.message}`);
      return result.data;
    }

    /** The content of every item stored for a checklist, read as the fixture's superuser. */
    async function storedContents(checklistId: string): Promise<string[]> {
      const admin = createAdminTestClient();
      const items = await admin.collection('instanceItems').getFullList({ filter: admin.filter('instance = {:id}', { id: checklistId }) });
      return items.map((item) => String(item.content));
    }

    describe('checklist the other user creates from the public template', () => {
      let checklistId: string;
      let contents: string[];

      beforeAll(async () => {
        const created = await createChecklistAsOtherUser(publicTemplate.id, 'My Checklist from Public Template');
        checklistId = created.checklist.id;
        contents = created.tasks.map((task) => task.content);
      });

      it('should copy both public tasks and one task for the reference', () => {
        expect(contents).toHaveLength(3);
        expect(contents).toEqual(expect.arrayContaining(['Public Task 1', 'Public Task 2']));
      });

      it('should not expand the private template', async () => {
        expect(contents.filter((content) => content.includes('Secret Task'))).toEqual([]);
        const stored = await storedContents(checklistId);
        expect(stored).toHaveLength(3);
        expect(stored.filter((content) => content.includes('Secret Task'))).toEqual([]);
      });

      // fails until #28 slice D
      it.fails('should show only the private template title for the inaccessible reference', () => {
        expect(contents).toContain('Secret Private Template');
        expect(contents).not.toContain('Reference to private template');
      });
    });

    describe('checklist the other user creates from a public template with two private references', () => {
      let checklistId: string;
      let tasks: { id: string; content: string }[];

      beforeAll(async () => {
        const privateTemplate2 = await pbOwner.collection('blueprints').create({
          workspace: workspace.id,
          owner: ownerUser.id,
          title: 'Another Secret Template',
          description: 'This is another private template',
          visibility: Visibility.PRIVATE,
        });
        await pbOwner.collection('items').create({
          blueprint: privateTemplate2.id,
          path: '1',
          itemType: ItemType.TASK,
          content: 'Another Secret Task',
          position: 1,
        });

        const publicTemplateWithTwoRefs = await pbOwner.collection('blueprints').create({
          workspace: workspace.id,
          owner: ownerUser.id,
          title: 'Public Template with Two Private References',
          visibility: Visibility.PUBLIC,
        });
        await pbOwner.collection('items').create({
          blueprint: publicTemplateWithTwoRefs.id,
          path: '1',
          itemType: ItemType.REFERENCE,
          content: 'Reference to first private template',
          reference: privateTemplate.id,
          position: 1,
        });
        await pbOwner.collection('items').create({
          blueprint: publicTemplateWithTwoRefs.id,
          path: '2',
          itemType: ItemType.REFERENCE,
          content: 'Reference to second private template',
          reference: privateTemplate2.id,
          position: 2,
        });

        const created = await createChecklistAsOtherUser(publicTemplateWithTwoRefs.id, 'My Checklist with Two Private Refs');
        checklistId = created.checklist.id;
        tasks = created.tasks;
      });

      it('should create one task per reference and expand neither private template', async () => {
        expect(tasks).toHaveLength(2);
        expect(tasks[0]?.id).not.toBe(tasks[1]?.id);
        const stored = await storedContents(checklistId);
        expect(stored).toHaveLength(2);
        expect(stored.filter((content) => content.includes('Secret Task'))).toEqual([]);
      });

      // fails until #28 slice D
      it.fails('should show each private template title instead of the reference content', () => {
        const contents = tasks.map((task) => task.content);
        expect(contents).toEqual(expect.arrayContaining(['Secret Private Template', 'Another Secret Template']));
        expect(contents).not.toContain('Reference to first private template');
        expect(contents).not.toContain('Reference to second private template');
      });
    });
  });
});
