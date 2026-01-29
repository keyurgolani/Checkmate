import { redirect } from "next/navigation";
import { getServerAuth } from "@/lib/server-auth";
import { PageHeader } from "@/components/ui/page-header";
import { Settings } from "lucide-react";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const { isAuthenticated, user } = await getServerAuth();

  if (!isAuthenticated || !user) {
    redirect("/signin");
  }

  return (
    <div className="w-full space-y-8">
      <PageHeader
        title="Settings"
        description="Manage your account and preferences."
        icon={<Settings className="h-6 w-6" />}
        gradient
      />
      <SettingsForm
        user={{
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          created: user.created,
          preferences: user.preferences,
        }}
      />
    </div>
  );
}
