import { AppLayout } from "@/components/layout/app-layout";
import { getServerAuth } from "@/lib/server-auth";
import { WorkspaceService } from "@/lib/services/workspace";
import { getAuthCookie } from "@/lib/auth-cookies";

const DEMO_EMAIL = process.env.NEXT_PUBLIC_DEMO_USER_EMAIL || "demo@checkmate.local";

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

  const authCookie = await getAuthCookie();
  const pbAuth = authCookie ? { token: authCookie.token, model: authCookie.model } : null;

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

  const isDemo = isAuthenticated && user?.email === DEMO_EMAIL;

  return <AppLayout user={layoutUser} workspaces={workspaces} pbAuth={pbAuth} isDemo={isDemo}>{children}</AppLayout>;
}
