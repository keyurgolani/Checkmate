import { AppLayout } from "@/components/layout";
import { getServerAuth } from "@/lib/server-auth";
import { WorkspaceService } from "@/lib/services/workspace";
import { getAuthCookie } from "@/lib/auth-cookies";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, user, pb } = await getServerAuth();

  const layoutUser = isAuthenticated && user
    ? {
        name: user.displayName ?? undefined,
        email: user.email,
        avatarUrl: user.avatarUrl ?? undefined,
      }
    : null;

  // Get auth data for client-side PocketBase hydration
  const authCookie = await getAuthCookie();
  const pbAuth = authCookie ? { token: authCookie.token, model: authCookie.model } : null;

  // Fetch workspaces for authenticated users
  let workspaces: any[] = [];
  if (isAuthenticated) {
    try {
      const workspaceService = new WorkspaceService(pb);
      const result = await workspaceService.getByOwner({ limit: 50 });
      workspaces = result.items.filter((w) => !w.isArchived);
    } catch (error) {
      console.error("Failed to fetch workspaces:", error);
    }
  }

  return <AppLayout user={layoutUser} workspaces={workspaces} pbAuth={pbAuth}>{children}</AppLayout>;
}
