import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { FileNodeData } from '../types';

const EXT_COLORS: Record<string, string> = {
  '.py': '#3b82f6',
  '.js': '#f59e0b',
  '.ts': '#6366f1',
  '.jsx': '#06b6d4',
  '.tsx': '#8b5cf6',
  '.java': '#ef4444',
  '.c': '#64748b',
  '.cpp': '#64748b',
  '.h': '#94a3b8',
  '.go': '#00ADD8',
  '.rs': '#f97316',
  '.rb': '#dc2626',
  '.php': '#7c3aed',
  '.cs': '#8b5cf6',
  '.html': '#f97316',
  '.css': '#0ea5e9',
  '.scss': '#ec4899',
  '.json': '#84cc16',
  '.md': '#6b7280',
  '.yaml': '#0891b2',
  '.yml': '#0891b2',
  '.toml': '#ca8a04',
};

const getExtColor = (ext: string) => EXT_COLORS[ext] || '#6b7280';

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
};

const FileNode: React.FC<NodeProps<FileNodeData>> = ({ data, selected }) => {
  const extColor = getExtColor(data.extension);
  const ext = data.extension.slice(1).toUpperCase() || '??';

  return (
    <div
      style={{
        background: selected ? '#1e293b' : '#0f172a',
        border: `2px solid ${selected ? '#6366f1' : data.is_entry_point ? '#f59e0b' : '#1e293b'}`,
        borderRadius: 10,
        minWidth: 160,
        maxWidth: 200,
        boxShadow: selected
          ? '0 0 0 3px rgba(99,102,241,0.35), 0 4px 24px rgba(0,0,0,0.6)'
          : '0 2px 12px rgba(0,0,0,0.4)',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top color strip */}
      <div style={{ height: 4, background: extColor, borderRadius: '8px 8px 0 0' }} />

      {/* Entry point badge */}
      {data.is_entry_point && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            background: '#f59e0b',
            color: '#000',
            fontSize: 9,
            fontWeight: 700,
            padding: '1px 5px',
            borderRadius: 4,
            letterSpacing: '0.05em',
          }}
        >
          ENTRY
        </div>
      )}

      <div style={{ padding: '10px 12px' }}>
        {/* Extension badge + filename */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span
            style={{
              background: extColor,
              color: '#fff',
              fontSize: 9,
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: 4,
              letterSpacing: '0.05em',
              flexShrink: 0,
            }}
          >
            {ext}
          </span>
          <span
            style={{
              color: '#e2e8f0',
              fontSize: 12,
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
            }}
            title={data.label}
          >
            {data.label}
          </span>
        </div>

        {/* Metrics row */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <MetricBadge
            label="LoC"
            value={data.lines_of_code.toString()}
            color="#94a3b8"
          />
          <MetricBadge
            label="Size"
            value={formatSize(data.size_bytes)}
            color="#94a3b8"
          />
          <MetricBadge
            label="Complexity"
            value={data.complexity}
            color={data.complexity_color}
          />
        </div>

        {/* Path */}
        <div
          style={{
            color: '#475569',
            fontSize: 9,
            marginTop: 6,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={data.path}
        >
          {data.path}
        </div>
      </div>

      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#6366f1', width: 8, height: 8, border: '2px solid #1e293b' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#6366f1', width: 8, height: 8, border: '2px solid #1e293b' }}
      />
    </div>
  );
};

const MetricBadge: React.FC<{ label: string; value: string; color: string }> = ({
  label,
  value,
  color,
}) => (
  <div
    style={{
      background: '#1e293b',
      borderRadius: 4,
      padding: '2px 6px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}
  >
    <span style={{ color: '#475569', fontSize: 8, fontWeight: 600, letterSpacing: '0.04em' }}>
      {label}
    </span>
    <span style={{ color, fontSize: 10, fontWeight: 700 }}>{value}</span>
  </div>
);

export default memo(FileNode);
