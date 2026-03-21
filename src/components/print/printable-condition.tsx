import type { ItemCondition, TemplateQuestion } from "@/lib/pocketbase-types";

interface PrintableConditionProps {
  conditions: ItemCondition[];
  questions: TemplateQuestion[];
}

export function PrintableCondition({ conditions, questions }: PrintableConditionProps) {
  if (conditions.length === 0) return null;

  return (
    <div className="mt-1.5 border-l-2 border-gray-300 pl-2 text-xs italic text-gray-600">
      {conditions.map((condition, i) => {
        const question = questions.find((q) => q.id === condition.questionId);
        const operatorText = condition.operator === "equals" ? "is" : "is not";
        const valueText =
          typeof condition.value === "boolean"
            ? condition.value ? "Yes" : "No"
            : String(condition.value);
        return (
          <span key={i}>
            {i > 0 && " and "}
            {i === 0 ? "Show when " : ""}
            <span className="font-medium not-italic">{question?.question ?? "Unknown question"}</span>
            {" "}{operatorText}{" "}
            <span className="font-semibold not-italic">{valueText}</span>
          </span>
        );
      })}
    </div>
  );
}
