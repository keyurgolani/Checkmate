/**
 * Condition Service
 * 
 * Provides utilities for evaluating conditional questions and filtering
 * template items based on user answers.
 * 
 * This service enables dynamic template customization where items can be
 * conditionally included or excluded based on user responses to questions.
 */

import type {
  Item,
  ItemCondition,
  TemplateQuestion,
  ConditionAnswers,
} from '../pocketbase-types';

// ============================================================================
// Types
// ============================================================================

/**
 * Result of condition evaluation
 */
interface ConditionEvaluationResult {
  /** Whether all conditions are satisfied */
  satisfied: boolean;
  /** Details about each condition evaluation */
  details: Array<{
    questionId: string;
    operator: string;
    expectedValue: boolean | string;
    actualValue: boolean | string | undefined;
    result: boolean;
  }>;
}

/**
 * Result of filtering items by conditions
 */
interface FilteredItemsResult {
  /** Items that passed all conditions */
  includedItems: Item[];
  /** Items that were excluded due to conditions */
  excludedItems: Item[];
  /** IDs of excluded items (for quick lookup) */
  excludedIds: Set<string>;
}

// ============================================================================
// Condition Evaluation Functions
// ============================================================================

/**
 * Evaluates a single condition against the provided answers
 * 
 * @param condition - The condition to evaluate
 * @param answers - User-provided answers to questions
 * @returns Whether the condition is satisfied
 */
function evaluateCondition(
  condition: ItemCondition,
  answers: ConditionAnswers
): boolean {
  const answer = answers[condition.questionId];
  
  // If no answer provided, condition is considered satisfied (show all items)
  if (answer === undefined) {
    return true;
  }
  
  switch (condition.operator) {
    case 'equals':
      return answer === condition.value;
    case 'notEquals':
      return answer !== condition.value;
    default:
      // Unknown operator - default to satisfied
      return true;
  }
}

/**
 * Evaluates all conditions for an item
 * 
 * @param conditions - Array of conditions to evaluate
 * @param answers - User-provided answers to questions
 * @returns Detailed evaluation result
 */
function evaluateConditions(
  conditions: ItemCondition[] | undefined | null,
  answers: ConditionAnswers
): ConditionEvaluationResult {
  // No conditions means always included
  if (!conditions || conditions.length === 0) {
    return {
      satisfied: true,
      details: [],
    };
  }
  
  const details = conditions.map(condition => {
    const answer = answers[condition.questionId];
    const result = evaluateCondition(condition, answers);
    
    return {
      questionId: condition.questionId,
      operator: condition.operator,
      expectedValue: condition.value,
      actualValue: answer,
      result,
    };
  });
  
  // All conditions must be satisfied (AND logic)
  const satisfied = details.every(d => d.result);
  
  return {
    satisfied,
    details,
  };
}

/**
 * Checks if an item should be included based on its conditions and answers
 * 
 * @param item - The item to check
 * @param answers - User-provided answers to questions
 * @returns Whether the item should be included
 */
function shouldIncludeItem(
  item: Item,
  answers: ConditionAnswers
): boolean {
  const conditions = item.metadata?.conditions;
  
  // No conditions or empty answers means include everything
  if (!conditions || conditions.length === 0) {
    return true;
  }
  
  // If no answers provided at all, include everything
  if (Object.keys(answers).length === 0) {
    return true;
  }
  
  return evaluateConditions(conditions, answers).satisfied;
}

/**
 * Filters items based on conditions and user answers
 * Also handles parent-child relationships - if a parent is excluded,
 * all its children are also excluded.
 * 
 * @param items - All items to filter
 * @param answers - User-provided answers to questions
 * @returns Filtered items result with included and excluded items
 */
export function filterItemsByConditions(
  items: Item[],
  answers: ConditionAnswers
): FilteredItemsResult {
  const excludedIds = new Set<string>();
  const includedItems: Item[] = [];
  const excludedItems: Item[] = [];
  
  // If no answers provided, include all items
  if (Object.keys(answers).length === 0) {
    return {
      includedItems: items,
      excludedItems: [],
      excludedIds: new Set(),
    };
  }
  
  // First pass: evaluate conditions for each item
  for (const item of items) {
    if (!shouldIncludeItem(item, answers)) {
      excludedIds.add(item.id);
    }
  }
  
  // Second pass: exclude children of excluded parents
  let changed = true;
  while (changed) {
    changed = false;
    for (const item of items) {
      if (!excludedIds.has(item.id) && item.parent && excludedIds.has(item.parent)) {
        excludedIds.add(item.id);
        changed = true;
      }
    }
  }
  
  // Final pass: separate included and excluded items
  for (const item of items) {
    if (excludedIds.has(item.id)) {
      excludedItems.push(item);
    } else {
      includedItems.push(item);
    }
  }
  
  return {
    includedItems,
    excludedItems,
    excludedIds,
  };
}

// ============================================================================
// Question Utilities
// ============================================================================

/**
 * Generates a unique question ID
 */
export function generateQuestionId(): string {
  return `q_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

