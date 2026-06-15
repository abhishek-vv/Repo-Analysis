import React, { useState, useCallback, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  NodeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';
import './App.css';

import FileNode from './components/FileNode';
import SidePanel from './components/SidePanel';
import Toolbar from './components/Toolbar';
import { useLayout } from './hooks/useLayout';
import { GraphData, FileNodeData, RepoStats } from './types';

const API_BASE = 'http://localhost:8000';

const nodeTypes: NodeTypes = { fileNode: FileNode };

function App() {
  const [repoPath, setRepoPath] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<RepoStats | null>(null);
  const [selectedNode, setSelectedNode] = useState<FileNodeData | null>(null);
  const [filterExt, setFilterExt] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [layoutType, setLayoutType] = useState<'force' | 'grid' | 'tree'>('force');

  const [rawNodes, setRawNodes] = useState<Node[]>([]);
  const [rawEdges, setRawEdges] = useState<Edge[]>([]);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const filteredNodes = useMemo(() => {
    return rawNodes.filter((n) => {
      const data = n.data as FileNodeData;
      const matchExt = !filterExt || data.extension === filterExt;
      const matchSearch =
        !searchTerm ||
        data.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        data.path.toLowerCase().includes(searchTerm.toLowerCase());
      return matchExt && matchSearch;
    });
  }, [rawNodes, filterExt, searchTerm]);

  const filteredEdges = useMemo(() => {
    const nodeIds = new Set(filteredNodes.map((n) => n.id));
    return rawEdges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target));
  }, [rawEdges, filteredNodes]);

  const layoutedNodes = useLayout(
    filteredNodes as any,
    filteredEdges as any,
    layoutType
  );

  React.useEffect(() => {
    const highlighted = layoutedNodes.map((n: any) => ({
      ...n,
      style:
        searchTerm && (n.data as FileNodeData).label.toLowerCase().includes(searchTerm.toLowerCase())
          ? { filter: 'drop-shadow(0 0 8px #6366f1)' }
          : {},
    }));
    setNodes(highlighted as Node[]);
    setEdges(filteredEdges);
  }, [layoutedNodes, filteredEdges, searchTerm]); // eslint-disable-line

  const handleAnalyze = useCallback(async () => {
    if (!repoPath) return;
    setLoading(true);
    setError('');
    setSelectedNode(null);
    setRawNodes([]);
    setRawEdges([]);
    setStats(null);

    try {
      const resp = await fetch(
        `${API_BASE}/api/analyze?repo_path=${encodeURIComponent(repoPath)}`
      );
      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.detail || 'Analysis failed');
      }
      const data: GraphData = await resp.json();
      setStats(data.stats);
      setRawNodes(data.nodes as Node[]);
      setRawEdges(data.edges as Edge[]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [repoPath]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node.data as FileNodeData);
  }, []);

  const toolbarHeight = stats ? 96 : 57;

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#060d1a' }}>
      <Toolbar
        repoPath={repoPath}
        setRepoPath={setRepoPath}
        geminiKey={geminiKey}
        setGeminiKey={setGeminiKey}
        openaiKey={openaiKey}
        setOpenaiKey={setOpenaiKey}
        onAnalyze={handleAnalyze}
        loading={loading}
        stats={stats}
        filterExt={filterExt}
        setFilterExt={setFilterExt}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        layoutType={layoutType}
        setLayoutType={setLayoutType}
      />

      <div
        style={{
          paddingTop: toolbarHeight,
          height: '100vh',
          width: selectedNode ? 'calc(100vw - 380px)' : '100vw',
          transition: 'width 0.2s ease',
        }}
      >
        {!loading && rawNodes.length === 0 && (
          <EmptyState error={error} />
        )}

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.05}
          maxZoom={3}
          defaultEdgeOptions={{
            style: { stroke: '#334155', strokeWidth: 1.5 },
            animated: false,
          }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            color="#1e293b"
            gap={24}
            size={1}
          />
          <Controls
            style={{
              background: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: 8,
            }}
          />
          <MiniMap
            style={{
              background: '#0b1120',
              border: '1px solid #1e293b',
              borderRadius: 8,
            }}
            nodeColor={(n) => {
              const data = n.data as FileNodeData;
              return data?.complexity_color || '#6366f1';
            }}
            maskColor="rgba(6,13,26,0.75)"
          />
        </ReactFlow>
      </div>

      <SidePanel
        node={selectedNode}
        geminiKey={geminiKey}
        openaiKey={openaiKey}
        onClose={() => setSelectedNode(null)}
      />
    </div>
  );
}

const EmptyState: React.FC<{ error: string }> = ({ error }) => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      pointerEvents: 'none',
      zIndex: 10,
    }}
  >
    <div style={{ fontSize: 48, opacity: 0.2 }}>⬡</div>
    {error ? (
      <>
        <div style={{ color: '#ef4444', fontSize: 14, fontWeight: 600 }}>
          Analysis Failed
        </div>
        <div
          style={{
            color: '#94a3b8',
            fontSize: 12,
            maxWidth: 380,
            textAlign: 'center',
            background: '#0f172a',
            padding: '10px 16px',
            borderRadius: 8,
            border: '1px solid #ef444430',
            fontFamily: 'monospace',
          }}
        >
          {error}
        </div>
      </>
    ) : (
      <>
        <div
          style={{
            color: '#475569',
            fontSize: 16,
            fontWeight: 600,
            fontFamily: "'Inter','Segoe UI',sans-serif",
          }}
        >
          Enter a repository path to begin
        </div>
        <div style={{ color: '#334155', fontSize: 12, fontFamily: 'monospace' }}>
          e.g. /home/user/my-project or C:\Users\user\project
        </div>
      </>
    )}
  </div>
);

export default App;
