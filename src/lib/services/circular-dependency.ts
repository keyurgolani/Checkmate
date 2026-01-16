/**
 * Circular Dependency Detection Service
 * 
 * Provides graph traversal algorithms to detect circular dependencies
 * in checklist blueprint references. When a blueprint references another
 * blueprint, we must ensure no cycles are created.
 * 
 * Requirements: 3.3, 3.4, 7.4, 7.5
 */

import PocketBase from 'pocketbase';
import { getPocketBaseClient, createPocketBaseClient } from '../pocketbase';
import type { Item, Blueprint } from '../pocketbase-types';
import { Collections, ItemType } from '../pocketbase-types';
import { MAX_REFERENCE_DEPTH } from './item';

// ============================================================================
// Types
// ============================================================================

/**
 * Result of circular dependency detection
 */
export interface CircularDependencyResult {
  /** Whether a circular dependency was detected */
  hasCycle: boolean;
  /** The chain of blueprint IDs forming the cycle (if detected) */
  dependencyChain: string[];
  /** Human-readable error message (if cycle detected) */
  message?: string;
}

/**
 * Node in the reference graph
 */
interface GraphNode {
  blueprintId: string;
  references: string[];
}

/**
 * Options for dependency detection
 */
export interface DetectionOptions {
  /** Maximum depth to traverse (default: MAX_REFERENCE_DEPTH) */
  maxDepth?: number;
}

// ============================================================================
// Error Messages
// ============================================================================

const ErrorMessages = {
  CYCLE_DETECTED: (chain: string[]) => 
    `Circular dependency detected: ${chain.join(' → ')}`,
  MAX_DEPTH_EXCEEDED: (depth: number) =>
    `Maximum reference depth of ${depth} exceeded`,
  SELF_REFERENCE: 'A blueprint cannot reference itself',
};

// ============================================================================
// Circular Dependency Detection Class
// ============================================================================

/**
 * Service for detecting circular dependencies in blueprint references.
 * 
 * Uses depth-first search (DFS) with cycle detection to traverse the
 * reference graph and identify any cycles that would be created by
 * adding a new reference.
 */
export class CircularDependencyDetector {
  private pb: PocketBase;

  constructor(pb?: PocketBase) {
    this.pb = pb ?? getPocketBaseClient();
  }

  /**
   * Detects if adding a reference from sourceBlueprintId to targetBlueprintId
   * would create a circular dependency.
   * 
   * Requirements: 3.3, 3.4, 7.4, 7.5
   * 
   * @param sourceBlueprintId - The blueprint that will contain the reference
   * @param targetBlueprintId - The blueprint being referenced
   * @param options - Detection options
   * @returns CircularDependencyResult indicating if a cycle would be created
   */
  async detectCycle(
    sourceBlueprintId: string,
    targetBlueprintId: string,
    options?: DetectionOptions
  ): Promise<CircularDependencyResult> {
    const maxDepth = options?.maxDepth ?? MAX_REFERENCE_DEPTH;

    // Check for self-reference
    if (sourceBlueprintId === targetBlueprintId) {
      return {
        hasCycle: true,
        dependencyChain: [sourceBlueprintId, targetBlueprintId],
        message: ErrorMessages.SELF_REFERENCE,
      };
    }

    // Build the reference graph starting from the target blueprint
    // We need to check if the target (or any of its references) eventually
    // references back to the source
    const visited = new Set<string>();
    const path: string[] = [sourceBlueprintId, targetBlueprintId];
    
    const result = await this.dfsDetectCycle(
      targetBlueprintId,
      sourceBlueprintId,
      visited,
      path,
      maxDepth,
      1
    );

    return result;
  }

  /**
   * Depth-first search to detect cycles in the reference graph.
   * 
   * @param currentId - Current blueprint being examined
   * @param targetId - The blueprint we're looking for (would complete the cycle)
   * @param visited - Set of already visited blueprints
   * @param path - Current path being traversed
   * @param maxDepth - Maximum depth to traverse
   * @param currentDepth - Current depth in the traversal
   * @returns CircularDependencyResult
   */
  private async dfsDetectCycle(
    currentId: string,
    targetId: string,
    visited: Set<string>,
    path: string[],
    maxDepth: number,
    currentDepth: number
  ): Promise<CircularDependencyResult> {
    // Check max depth
    if (currentDepth > maxDepth) {
      return {
        hasCycle: false,
        dependencyChain: [],
        message: ErrorMessages.MAX_DEPTH_EXCEEDED(maxDepth),
      };
    }

    // Mark as visited
    visited.add(currentId);

    // Get all references from the current blueprint
    const references = await this.getBlueprintReferences(currentId);

    for (const refId of references) {
      // Check if this reference completes a cycle back to the target
      if (refId === targetId) {
        const cyclePath = [...path, refId];
        return {
          hasCycle: true,
          dependencyChain: cyclePath,
          message: ErrorMessages.CYCLE_DETECTED(cyclePath),
        };
      }

      // If not visited, continue DFS
      if (!visited.has(refId)) {
        const newPath = [...path, refId];
        const result = await this.dfsDetectCycle(
          refId,
          targetId,
          visited,
          newPath,
          maxDepth,
          currentDepth + 1
        );

        if (result.hasCycle) {
          return result;
        }
      }
    }

    return {
      hasCycle: false,
      dependencyChain: [],
    };
  }

  /**
   * Gets all blueprint IDs that are referenced by items in the given blueprint.
   * 
   * @param blueprintId - The blueprint to get references from
   * @returns Array of referenced blueprint IDs
   */
  async getBlueprintReferences(blueprintId: string): Promise<string[]> {
    try {
      const items = await this.pb
        .collection(Collections.ITEMS)
        .getFullList<Item>({
          filter: `blueprint = "${blueprintId}" && itemType = "${ItemType.REFERENCE}" && reference != null`,
        });

      // Extract unique reference IDs
      const referenceIds = new Set<string>();
      for (const item of items) {
        if (item.reference) {
          referenceIds.add(item.reference);
        }
      }

      return Array.from(referenceIds);
    } catch (err) {
      console.error('Error fetching blueprint references:', err);
      return [];
    }
  }

  /**
   * Validates that a reference can be added without creating a cycle.
   * This is a convenience method that wraps detectCycle with a boolean result.
   * 
   * @param sourceBlueprintId - The blueprint that will contain the reference
   * @param targetBlueprintId - The blueprint being referenced
   * @returns true if the reference is valid (no cycle), false otherwise
   */
  async validateReference(
    sourceBlueprintId: string,
    targetBlueprintId: string
  ): Promise<boolean> {
    const result = await this.detectCycle(sourceBlueprintId, targetBlueprintId);
    return !result.hasCycle;
  }

  /**
   * Gets the complete reference graph for a blueprint.
   * Useful for visualization and debugging.
   * 
   * @param blueprintId - The root blueprint
   * @param maxDepth - Maximum depth to traverse
   * @returns Map of blueprint IDs to their references
   */
  async buildReferenceGraph(
    blueprintId: string,
    maxDepth: number = MAX_REFERENCE_DEPTH
  ): Promise<Map<string, GraphNode>> {
    const graph = new Map<string, GraphNode>();
    const queue: { id: string; depth: number }[] = [{ id: blueprintId, depth: 0 }];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;

      if (visited.has(id) || depth > maxDepth) {
        continue;
      }

      visited.add(id);
      const references = await this.getBlueprintReferences(id);

      graph.set(id, {
        blueprintId: id,
        references,
      });

      // Add unvisited references to the queue
      for (const refId of references) {
        if (!visited.has(refId)) {
          queue.push({ id: refId, depth: depth + 1 });
        }
      }
    }

    return graph;
  }

  /**
   * Finds all paths from a source blueprint to a target blueprint.
   * Useful for understanding the dependency structure.
   * 
   * @param sourceBlueprintId - Starting blueprint
   * @param targetBlueprintId - Target blueprint to find
   * @param maxDepth - Maximum depth to search
   * @returns Array of paths (each path is an array of blueprint IDs)
   */
  async findAllPaths(
    sourceBlueprintId: string,
    targetBlueprintId: string,
    maxDepth: number = MAX_REFERENCE_DEPTH
  ): Promise<string[][]> {
    const paths: string[][] = [];
    const currentPath: string[] = [sourceBlueprintId];

    await this.dfsFindPaths(
      sourceBlueprintId,
      targetBlueprintId,
      currentPath,
      paths,
      maxDepth,
      0
    );

    return paths;
  }

  /**
   * DFS helper to find all paths between two blueprints.
   */
  private async dfsFindPaths(
    currentId: string,
    targetId: string,
    currentPath: string[],
    allPaths: string[][],
    maxDepth: number,
    currentDepth: number
  ): Promise<void> {
    if (currentDepth > maxDepth) {
      return;
    }

    const references = await this.getBlueprintReferences(currentId);

    for (const refId of references) {
      const newPath = [...currentPath, refId];

      if (refId === targetId) {
        allPaths.push(newPath);
      } else if (!currentPath.includes(refId)) {
        // Avoid cycles in path finding
        await this.dfsFindPaths(
          refId,
          targetId,
          newPath,
          allPaths,
          maxDepth,
          currentDepth + 1
        );
      }
    }
  }

  /**
   * Gets the underlying PocketBase client.
   */
  getPocketBase(): PocketBase {
    return this.pb;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Creates a new CircularDependencyDetector instance with a fresh PocketBase client.
 * Use this for server-side operations.
 */
export function createCircularDependencyDetector(): CircularDependencyDetector {
  return new CircularDependencyDetector(createPocketBaseClient());
}

/**
 * Gets the singleton CircularDependencyDetector instance for client-side usage.
 */
let clientDetector: CircularDependencyDetector | null = null;

export function getCircularDependencyDetector(): CircularDependencyDetector {
  if (typeof window === 'undefined') {
    // Server-side: always create a new instance
    return createCircularDependencyDetector();
  }

  // Client-side: reuse the same instance
  if (!clientDetector) {
    clientDetector = new CircularDependencyDetector();
  }

  return clientDetector;
}

// ============================================================================
// Standalone Functions (for convenience)
// ============================================================================

/**
 * Standalone function to detect circular dependencies.
 * Creates a new detector instance for each call.
 * 
 * @param sourceBlueprintId - The blueprint that will contain the reference
 * @param targetBlueprintId - The blueprint being referenced
 * @param pb - Optional PocketBase client
 * @returns CircularDependencyResult
 */
export async function detectCircularDependency(
  sourceBlueprintId: string,
  targetBlueprintId: string,
  pb?: PocketBase
): Promise<CircularDependencyResult> {
  const detector = new CircularDependencyDetector(pb);
  return detector.detectCycle(sourceBlueprintId, targetBlueprintId);
}

/**
 * Standalone function to validate a reference.
 * 
 * @param sourceBlueprintId - The blueprint that will contain the reference
 * @param targetBlueprintId - The blueprint being referenced
 * @param pb - Optional PocketBase client
 * @returns true if the reference is valid (no cycle), false otherwise
 */
export async function validateReference(
  sourceBlueprintId: string,
  targetBlueprintId: string,
  pb?: PocketBase
): Promise<boolean> {
  const detector = new CircularDependencyDetector(pb);
  return detector.validateReference(sourceBlueprintId, targetBlueprintId);
}
