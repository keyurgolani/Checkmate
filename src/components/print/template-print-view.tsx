import type { ResourceLink, TemplateQuestion, ItemCondition } from "@/lib/pocketbase-types";
import { buildTree, type TreeNode } from "@/lib/utils/tree";
import { PrintablePhase } from "./printable-phase";
import { PrintableItem } from "./printable-item";
import { PrintableMarkdown } from "./printable-markdown";
import { PrintableResourceList } from "./printable-resource-list";
import { PrintToolbar } from "./print-toolbar";

interface TemplateStep {
  id: string;
  parentId: string | null;
  position: number;
  itemType: "task" | "reference" | "phase";
  content: string;
  description?: string | null;
  resources?: ResourceLink[] | null;
  metadata?: { conditions?: ItemCondition[]; [key: string]: unknown } | null;
}

interface TemplatePrintViewProps {
  template: {
    id: string;
    title: string;
    description: string | null;
    resources: ResourceLink[] | null;
    questions: TemplateQuestion[] | null;
    updatedAt: string;
  };
  steps: TemplateStep[];
}

function RenderTree({
  nodes,
  questions,
}: {
  nodes: (TemplateStep & TreeNode<TemplateStep>)[];
  questions: TemplateQuestion[];
}) {
  return (
    <>
      {nodes.map((node) => {
        if (node.itemType === "phase") {
          return (
            <div key={node.id} className={node.depth > 0 ? "ml-6" : ""}>
              <PrintablePhase title={node.content} />
              {node.description && node.description.trim().length > 0 && (
                <div className="pl-4 py-1">
                  <PrintableMarkdown content={node.description} />
                </div>
              )}
              {node.children.length > 0 && (
                <div className="ml-4 border-l-2 border-gray-300 pl-2">
                  <RenderTree nodes={node.children} questions={questions} />
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
              conditions={node.metadata?.conditions}
              questions={questions}
              depth={node.depth}
              showCheckbox={false}
            />
            {node.children.length > 0 && (
              <RenderTree nodes={node.children} questions={questions} />
            )}
          </div>
        );
      })}
    </>
  );
}

export function TemplatePrintView({ template, steps }: TemplatePrintViewProps) {
  const tree = buildTree(steps);
  const questions = template.questions ?? [];

  return (
    <div className="max-w-4xl mx-auto">
      <style>{`@page { margin: 0.5in; size: auto; }`}</style>
      <PrintToolbar backHref={`/templates/${template.id}`} backLabel="Back to template" />

      <div className="px-6 py-8">
        <h1 className="text-2xl font-bold text-black mb-2">{template.title}</h1>
        {template.description && template.description.trim().length > 0 && (
          <div className="mb-4">
            <PrintableMarkdown content={template.description} />
          </div>
        )}
        <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
          <span>{steps.length} steps</span>
          <span>Updated {new Date(template.updatedAt).toLocaleDateString()}</span>
        </div>
        {template.resources && template.resources.length > 0 && (
          <PrintableResourceList resources={template.resources} />
        )}

        <hr className="my-6 border-gray-300" />

        <RenderTree nodes={tree} questions={questions} />
      </div>
    </div>
  );
}
