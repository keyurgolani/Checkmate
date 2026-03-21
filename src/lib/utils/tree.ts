export interface TreeNode<T> {
  children: (T & TreeNode<T>)[];
  depth: number;
}

type TreeInput = { id: string; parentId: string | null; position: number };

/**
 * Builds a tree structure from a flat array of items with parentId relationships.
 * Items are sorted by position at each level.
 */
export function buildTree<T extends TreeInput>(items: T[]): (T & TreeNode<T>)[] {
  const itemMap = new Map<string, T & TreeNode<T>>();
  const rootNodes: (T & TreeNode<T>)[] = [];

  // First pass: create tree nodes
  for (const item of items) {
    itemMap.set(item.id, {
      ...item,
      children: [],
      depth: 0,
    });
  }

  // Second pass: build parent-child relationships
  for (const item of items) {
    const node = itemMap.get(item.id);
    if (!node) continue;

    if (item.parentId && itemMap.has(item.parentId)) {
      const parent = itemMap.get(item.parentId)!;
      node.depth = parent.depth + 1;
      parent.children.push(node);
    } else {
      rootNodes.push(node);
    }
  }

  // Sort children by position at each level
  const sortChildren = (nodes: (T & TreeNode<T>)[]) => {
    nodes.sort((a, b) => a.position - b.position);
    for (const node of nodes) {
      if (node.children.length > 0) {
        sortChildren(node.children);
      }
    }
  };

  sortChildren(rootNodes);
  return rootNodes;
}
