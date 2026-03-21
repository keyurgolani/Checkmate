import { getServerAuth } from "@/lib/server-auth";
import { ChecklistService } from "@/lib/services/checklist";
import { TemplateService } from "@/lib/services/template";
import { WorkspaceService } from "@/lib/services/workspace";
import { notFound } from "next/navigation";
import { Collections } from "@/lib/pocketbase-types";
import type { Checklist } from "@/lib/pocketbase-types";
import { PrintToolbar } from "@/components/print/print-toolbar";
import PocketBase from "pocketbase";

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function ReportsPrintPage({ searchParams }: PageProps) {
  const { tab } = await searchParams;
  const { isAuthenticated, user, pb } = await getServerAuth();

  if (!isAuthenticated || !user) {
    notFound();
  }

  const activeTab = tab === "templates" || tab === "workspaces" ? tab : "personal";

  // Fetch minimal data for print based on active tab
  const checklistService = new ChecklistService(pb);
  const templateService = new TemplateService(pb);
  const workspaceService = new WorkspaceService(pb);

  return (
    <div className="max-w-4xl mx-auto">
      <style>{`@page { margin: 0.5in; size: auto; }`}</style>

      <PrintToolbar backHref="/reports" backLabel="Back to Reports" />

      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-sm text-gray-500">
            Generated {new Date().toLocaleDateString()} — {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
          </p>
        </div>

        {activeTab === "personal" && <PersonalPrint pb={pb} userId={user.id} checklistService={checklistService} />}
        {activeTab === "templates" && <TemplatesPrint pb={pb} userId={user.id} templateService={templateService} />}
        {activeTab === "workspaces" && <WorkspacesPrint pb={pb} userId={user.id} workspaceService={workspaceService} />}
      </div>
    </div>
  );
}

async function PersonalPrint({
  pb,
  userId,
  checklistService,
}: {
  pb: PocketBase;
  userId: string;
  checklistService: ChecklistService;
}) {
  const checklists = await checklistService.getByUser({ sort: "-updated" });
  const active = checklists.filter((c) => (c.progress ?? 0) < 100);
  const completed = checklists.filter((c) => (c.progress ?? 0) >= 100);
  const avgProgress = active.length > 0
    ? Math.round(active.reduce((s, c) => s + (c.progress ?? 0), 0) / active.length)
    : 0;

  return (
    <div>
      <h2 className="text-lg font-bold mb-4 border-b pb-2">Personal Summary</h2>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="border rounded-lg p-4">
          <div className="text-2xl font-bold">{active.length}</div>
          <div className="text-sm text-gray-500">Active Checklists</div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-2xl font-bold">{completed.length}</div>
          <div className="text-sm text-gray-500">Completed</div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-2xl font-bold">{avgProgress}%</div>
          <div className="text-sm text-gray-500">Avg. Progress</div>
        </div>
      </div>

      <h3 className="font-bold mb-2">Active Checklists</h3>
      <table className="w-full text-sm mb-6">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2">Name</th>
            <th className="text-right py-2">Progress</th>
            <th className="text-right py-2">Updated</th>
          </tr>
        </thead>
        <tbody>
          {active.map((c) => (
            <tr key={c.id} className="border-b border-gray-100">
              <td className="py-2">{c.name}</td>
              <td className="text-right py-2">{Math.round(c.progress ?? 0)}%</td>
              <td className="text-right py-2 text-gray-500">
                {new Date(c.updated).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

async function TemplatesPrint({
  pb,
  userId,
  templateService,
}: {
  pb: PocketBase;
  userId: string;
  templateService: TemplateService;
}) {
  const result = await templateService.getByOwner({ limit: 100 });
  const templates = result.items;

  return (
    <div>
      <h2 className="text-lg font-bold mb-4 border-b pb-2">Templates Summary</h2>
      <p className="text-sm text-gray-500 mb-4">{templates.length} templates total</p>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2">Template</th>
            <th className="text-center py-2">Visibility</th>
            <th className="text-right py-2">Uses</th>
            <th className="text-right py-2">Rating</th>
          </tr>
        </thead>
        <tbody>
          {templates.map((t) => {
            const rating = (t.ratingCount ?? 0) > 0
              ? ((t.ratingSum ?? 0) / (t.ratingCount ?? 0)).toFixed(1)
              : "—";
            return (
              <tr key={t.id} className="border-b border-gray-100">
                <td className="py-2">{t.title}</td>
                <td className="text-center py-2 capitalize">{t.visibility}</td>
                <td className="text-right py-2">{t.instanceCount ?? 0}</td>
                <td className="text-right py-2">{rating}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

async function WorkspacesPrint({
  pb,
  userId,
  workspaceService,
}: {
  pb: PocketBase;
  userId: string;
  workspaceService: WorkspaceService;
}) {
  const result = await workspaceService.getByOwner({ limit: 100 });
  const allWorkspaces = result.items;

  const wsData = await Promise.all(
    allWorkspaces.map(async (ws) => {
      const checklists = await pb
        .collection(Collections.CHECKLISTS)
        .getFullList<Checklist>({
          filter: `user = "${userId}" && workspace = "${ws.id}"`,
          fields: "id,progress,name",
        });

      const avgProgress = checklists.length > 0
        ? Math.round(checklists.reduce((s: number, c: Checklist) => s + (c.progress ?? 0), 0) / checklists.length)
        : 0;

      return { ...ws, checklistCount: checklists.length, avgProgress };
    })
  );

  return (
    <div>
      <h2 className="text-lg font-bold mb-4 border-b pb-2">Workspaces Summary</h2>
      <p className="text-sm text-gray-500 mb-4">{allWorkspaces.length} workspaces total</p>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2">Workspace</th>
            <th className="text-right py-2">Checklists</th>
            <th className="text-right py-2">Avg. Progress</th>
          </tr>
        </thead>
        <tbody>
          {wsData.map((ws) => (
            <tr key={ws.id} className="border-b border-gray-100">
              <td className="py-2">{ws.name}</td>
              <td className="text-right py-2">{ws.checklistCount}</td>
              <td className="text-right py-2">{ws.avgProgress}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
