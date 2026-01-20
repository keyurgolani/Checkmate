/**
 * Template Detail Page (Public View)
 *
 * Displays a public template's information and items.
 * Allows authenticated users to create a checklist from the template.
 * Anonymous users can view but must sign in to create checklists.
 *
 * Requirements: 2.1, 2.3, 8.5
 * - 2.1: Display public templates without requiring authentication
 * - 2.3: Display all items and nested references in read-only mode
 * - 8.5: Display creator information and usage statistics
 */

import { getServerAuth } from "@/lib/server-auth";
import { TemplateService } from "@/lib/services/template";
import { ItemService } from "@/lib/services/item";
import { Item, Collections } from "@/lib/pocketbase-types";
import { createAdminClient } from "@/lib/pocketbase";
import { notFound } from "next/navigation";
import { TemplateDetailClient } from "./template-detail-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TemplateDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { isAuthenticated, user, pb } = await getServerAuth();

  // Initialize services
  const templateService = new TemplateService(pb);

  let template = null;
  let accessLevel: 'full' | 'limited' = 'full';
  let items: Item[] = [];

  // 1. Try to get full template access
  const result = await templateService.getById(id, "owner");

  if (result.success && result.template) {
    template = result.template;
    
    // Check if public (or user has access)
    // Note: getById already checks RLS, but if it's not public we might want to double check logic
    // However, if we got it via RLS, we have access.
    // BUT, the original code had an explicit check for visibility === PUBLIC.
    // We want to allow shared/private if the user actually has access (which getById ensures via RLS).
    // So if getById succeeds, we have full access.
  } else {
    // 2. If full access failed, try to get basic info for "Request Access" view
    // This allows showing private templates metadata to everyone (as per requirements)
    const basicInfo = await templateService.getBasicInfoById(id);
    
    if (basicInfo) {
      template = basicInfo;
      accessLevel = 'limited';
    } else {
      // 3. If neither works, it really doesn't exist
      notFound();
    }
  }

  // 4. Fetch items only if we have full access
  if (accessLevel === 'full' && template) {
    // For public templates, anonymous users need to see items too.
    // Since PocketBase items collection requires auth, we use admin client
    // when the user is not authenticated to fetch items for public templates.
    let itemsPb = pb;
    if (!isAuthenticated) {
      itemsPb = await createAdminClient();
    }
    const itemService = new ItemService(itemsPb);
    items = await itemService.getByBlueprint(id);
  }

  if (!template) {
    notFound();
  }

  // Fetch user's workspaces for the copy functionality (only if authenticated)
  let workspaces: Array<{ id: string; name: string }> = [];
  if (isAuthenticated && user) {
    try {
      const workspaceResults = await pb.collection(Collections.WORKSPACES).getFullList({
        filter: `owner = "${user.id}"`,
        sort: 'name',
      });
      workspaces = workspaceResults.map((ws) => ({
        id: ws.id,
        name: ws.name,
      }));
    } catch (err) {
      console.error('Failed to fetch workspaces:', err);
    }
  }

  // Format items for display
  const formattedItems = items.map((item) => ({
    id: item.id,
    templateId: item.blueprint, // Mapping blueprint to templateId
    parentId: item.parent,
    path: item.path,
    itemType: item.itemType as "task" | "reference",
    content: item.content,
    description: item.description,
    resources: item.resources,
    referenceId: item.reference,
    position: item.position,
    metadata: item.metadata,
    createdAt: item.created,
    updatedAt: item.updated,
  }));

  // Format template data for client component
  const templateData = {
    id: template.id,
    title: template.title,
    description: template.description,
    visibility: template.visibility,
    category: template.category,
    tags: template.tags,
    version: template.version,
    instanceCount: template.instanceCount,
    ratingSum: template.ratingSum,
    ratingCount: template.ratingCount,
    createdAt: template.created,
    updatedAt: template.updated,
    owner: template.expand?.owner
      ? {
          id: template.expand.owner.id,
          displayName: template.expand.owner.displayName,
          avatarUrl: template.expand.owner.avatarUrl,
        }
      : null,
  };

  return (
    <TemplateDetailClient
      template={templateData}
      items={formattedItems}
      isAuthenticated={isAuthenticated}
      accessLevel={accessLevel}
      workspaces={workspaces}
      currentUserId={user?.id}
    />
  );
}
