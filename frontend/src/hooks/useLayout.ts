import { useMemo } from 'react';
import { GraphNode, GraphEdge } from '../types';

// Node dimensions for layout calculation
const NODE_W = 200;
const NODE_H = 110;
const H_GAP = 60;
const V_GAP = 80;

type LayoutType = 'force' | 'grid' | 'tree';

export function useLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  layoutType: LayoutType
): GraphNode[] {
  return useMemo(() => {
    if (!nodes.length) return nodes;

    switch (layoutType) {
      case 'grid':
        return gridLayout(nodes);
      case 'tree':
        return treeLayout(nodes, edges);
      case 'force':
      default:
        return forceLayout(nodes, edges);
    }
  }, [nodes, edges, layoutType]);
}

// ── Grid Layout ───────────────────────────────────────────────────────────────
function gridLayout(nodes: GraphNode[]): GraphNode[] {
  const cols = Math.max(1, Math.ceil(Math.sqrt(nodes.length * 1.4)));
  return nodes.map((n, i) => ({
    ...n,
    position: {
      x: (i % cols) * (NODE_W + H_GAP) + 20,
      y: Math.floor(i / cols) * (NODE_H + V_GAP) + 20,
    },
  }));
}

// ── Tree Layout ───────────────────────────────────────────────────────────────
function treeLayout(nodes: GraphNode[], edges: GraphEdge[]): GraphNode[] {
  // Build adjacency
  const children: Map<string, string[]> = new Map();
  const hasParent = new Set<string>();
  const nodeIds = new Set(nodes.map((n) => n.id));

  edges.forEach((e) => {
    if (!nodeIds.has(e.source) || !nodeIds.has(e.target)) return;
    if (!children.has(e.source)) children.set(e.source, []);
    children.get(e.source)!.push(e.target);
    hasParent.add(e.target);
  });

  // Roots = nodes with no parent
  const roots = nodes.filter((n) => !hasParent.has(n.id));
  if (!roots.length) return gridLayout(nodes); // fallback

  const positions: Map<string, { x: number; y: number }> = new Map();
  const visited = new Set<string>();
  let nextX = 0;

  function place(id: string, depth: number): number {
    if (visited.has(id)) return 0;
    visited.add(id);
    const kids = (children.get(id) || []).filter((c) => !visited.has(c));
    if (!kids.length) {
      positions.set(id, { x: nextX * (NODE_W + H_GAP), y: depth * (NODE_H + V_GAP) });
      nextX++;
      return 1;
    }
    const start = nextX;
    kids.forEach((kid) => place(kid, depth + 1));
    const end = nextX;
    const midX = ((start + end - 1) / 2) * (NODE_W + H_GAP);
    positions.set(id, { x: midX, y: depth * (NODE_H + V_GAP) });
    return end - start;
  }

  roots.forEach((r) => place(r.id, 0));

  // Place any unvisited (disconnected) nodes
  nodes.forEach((n) => {
    if (!visited.has(n.id)) {
      positions.set(n.id, { x: nextX * (NODE_W + H_GAP), y: 0 });
      nextX++;
    }
  });

  return nodes.map((n) => ({
    ...n,
    position: positions.get(n.id) || { x: 0, y: 0 },
  }));
}

// ── Simple Force-Directed-ish Layout ─────────────────────────────────────────
// Not a true physics sim — uses a heuristic based on connectivity degree
function forceLayout(nodes: GraphNode[], edges: GraphEdge[]): GraphNode[] {
  const degree: Map<string, number> = new Map();
  nodes.forEach((n) => degree.set(n.id, 0));
  edges.forEach((e) => {
    degree.set(e.source, (degree.get(e.source) || 0) + 1);
    degree.set(e.target, (degree.get(e.target) || 0) + 1);
  });

  // Sort by degree descending — higher-degree nodes near center
  const sorted = [...nodes].sort((a, b) => (degree.get(b.id) || 0) - (degree.get(a.id) || 0));

  const total = sorted.length;
  const rings = Math.ceil(Math.sqrt(total / Math.PI));
  const positions: Map<string, { x: number; y: number }> = new Map();

  let placed = 0;
  for (let ring = 0; ring <= rings && placed < total; ring++) {
    if (ring === 0) {
      positions.set(sorted[0].id, { x: 0, y: 0 });
      placed++;
    } else {
      const circumference = 2 * Math.PI * ring * (NODE_W + H_GAP);
      const slots = Math.max(1, Math.floor(circumference / (NODE_W + H_GAP)));
      for (let s = 0; s < slots && placed < total; s++, placed++) {
        const angle = (2 * Math.PI * s) / slots;
        const r = ring * (NODE_W + H_GAP) * 0.9;
        positions.set(sorted[placed].id, {
          x: Math.cos(angle) * r,
          y: Math.sin(angle) * r,
        });
      }
    }
  }

  // Offset so top-left is near 0,0
  const posArr = Array.from(positions.values());
  const xs = posArr.map((p) => p.x);
  const ys = posArr.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);

  return nodes.map((n) => {
    const pos = positions.get(n.id) || { x: 0, y: 0 };
    return {
      ...n,
      position: {
        x: pos.x - minX + 60,
        y: pos.y - minY + 60,
      },
    };
  });
}
