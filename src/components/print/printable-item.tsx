import type { ResourceLink, ItemCondition, TemplateQuestion } from "@/lib/pocketbase-types";
import { PrintableMarkdown } from "./printable-markdown";
import { PrintableResourceList } from "./printable-resource-list";
import { PrintableCondition } from "./printable-condition";

interface PrintableItemProps {
  content: string;
  description?: string | null;
  resources?: ResourceLink[] | null;
  conditions?: ItemCondition[] | null;
  questions?: TemplateQuestion[];
  depth: number;
  showCheckbox?: boolean;
  isCompleted?: boolean;
}

export function PrintableItem({
  content,
  description,
  resources,
  conditions,
  questions = [],
  depth,
  showCheckbox = false,
  isCompleted = false,
}: PrintableItemProps) {
  // Cap visual indentation at depth 5, but still render deeper items
  const indent = Math.min(depth, 5);

  return (
    <div
      className="py-2 border-b border-gray-200"
      style={{ paddingLeft: `${indent * 1.5}rem`, breakInside: "avoid" }}
    >
      <div className="flex items-start gap-2">
        {showCheckbox && (
          <div
            className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
              isCompleted ? "border-black bg-black" : "border-gray-400 bg-white"
            }`}
          >
            {isCompleted && (
              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className={`text-sm text-black ${isCompleted ? "line-through text-gray-500" : ""}`}>
            {content}
          </p>
          {description && description.trim().length > 0 && (
            <div className="mt-1 pl-2 border-l-2 border-gray-200">
              <PrintableMarkdown content={description} />
            </div>
          )}
          {resources && resources.length > 0 && (
            <PrintableResourceList resources={resources} />
          )}
          {conditions && conditions.length > 0 && (
            <PrintableCondition conditions={conditions} questions={questions} />
          )}
        </div>
      </div>
    </div>
  );
}
