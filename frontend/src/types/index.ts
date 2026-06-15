// Core types for the Repository Visualizer

export interface FileNodeData {
  label: string;
  path: string;
  full_path: string;
  extension: string;
  lines_of_code: number;
  size_bytes: number;
  complexity: string;
  complexity_color: string;
  raw_dependencies: string[];
  is_entry_point: boolean;
  file_hash: string;
}

export interface GraphNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: FileNodeData;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  animated: boolean;
  style?: Record<string, unknown>;
}

export interface RepoStats {
  total_files: number;
  total_loc: number;
  total_edges: number;
  languages: Record<string, number>;
  repo_name: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats: RepoStats;
}

export interface AISummaryResponse {
  summary: string;
  cached: boolean;
  file_hash: string;
}

export type LayoutType = 'force' | 'grid' | 'tree';
