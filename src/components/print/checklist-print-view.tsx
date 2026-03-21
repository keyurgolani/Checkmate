import type { ResourceLink } from "@/lib/pocketbase-types";
import { buildTree, type TreeNode } from "@/lib/utils/tree";
import { PrintablePhase } from "./printable-phase";
import { PrintableItem } from "./printable-item";
import { PrintableMarkdown } from "./printable-markdown";
import { PrintableResourceList } from "./printable-resource-list";
import { PrintToolbar } from "./print-toolbar";

interface ChecklistTask {
  id: string;
  parentId: string | null;
  position: number;
  content: string;
  description: string | null;
  resources: ResourceLink[] | null;
  isCompleted: boolean;
  itemType?: "task" | "reference" | "phase";
}

interface ChecklistPrintViewProps {
  checklist: {
    id: string;
    name: string;
    blueprintTitle: string;
    completedItems: number;
    totalItems: number;
    createdAt: string;
    description: string | null;
    resources: ResourceLink[] | null;
  };
  tasks: ChecklistTask[];
}

type ChecklistTreeNode = ChecklistTask & TreeNode<ChecklistTask>;

function getPhaseProgress(node: ChecklistTreeNode): { completed: number; total: number } {
  let total = 0;
  let completed = 0;
  const count = (children: ChecklistTreeNode[]) => {
    for (const child of children) {
      if (child.itemType !== "phase") {
        total++;
        if (child.isCompleted) completed++;
      }
      if (child.children.length > 0) count(child.children);
    }
  };
  count(node.children);
  return { total, completed };
}

function RenderTree({ nodes }: { nodes: ChecklistTreeNode[] }) {
  return (
    <>
      {nodes.map((node) => {
        if (node.itemType === "phase") {
          const progress = getPhaseProgress(node);
          return (
            <div key={node.id} className={node.depth > 0 ? "ml-6" : ""}>
              <PrintablePhase title={node.content} progress={progress} />
              {node.children.length > 0 && (
                <div className="ml-4 border-l-2 border-gray-300 pl-2">
                  <RenderTree nodes={node.children} />
                </div>
              )}
            </div>
          );
        }

        return (
          <div key={node.id}>
            <PrintableItem
              content={node.content}
              description={node.description}
              resources={node.resources}
              depth={node.depth}
              showCheckbox={true}
              isCompleted={node.isCompleted}
            />
            {node.children.length > 0 && (
              <RenderTree nodes={node.children} />
            )}
          </div>
        );
      })}
    </>
  );
}

export function ChecklistPrintView({ checklist, tasks }: ChecklistPrintViewProps) {
  const tree = buildTree(tasks);

  return (
    <div className="max-w-4xl mx-auto">
      <style>{`@page { margin: 0.5in; size: auto; }`}</style>
      <PrintToolbar backHref={`/checklists/${checklist.id}`} backLabel="Back to checklist" />

      <div className="px-6 py-8">
        <h1 className="text-2xl font-bold text-black mb-2">{checklist.name}</h1>
        <div className="flex items-center gap-4 text-xs text-gray-500 mb-1">
          <span>From: {checklist.blueprintTitle}</span>
          <span>Created {new Date(checklist.createdAt).toLocaleDateString()}</span>
        </div>
        <p className="text-sm font-medium text-black mb-4">
          {checklist.completedItems} of {checklist.totalItems} completed
        </p>
        {checklist.description && checklist.description.trim().length > 0 && (
          <div className="mb-4">
            <PrintableMarkdown content={checklist.description} />
          </div>
        )}
        {checklist.resources && checklist.resources.length > 0 && (
          <PrintableResourceList resources={checklist.resources} />
        )}

        <hr className="my-6 border-gray-300" />

        <RenderTree nodes={tree} />
      </div>
    </div>
  );
}
