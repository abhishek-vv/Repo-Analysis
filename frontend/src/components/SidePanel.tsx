import React, { useState, useEffect, useCallback } from 'react';
import { X, Sparkles, Copy, Check, RefreshCw, ChevronDown, ChevronUp, Database } from 'lucide-react';
import { FileNodeData, AISummaryResponse } from '../types';

const API_BASE = 'http://localhost:8000';

interface SidePanelProps {
  node: FileNodeData | null;
  geminiKey: string;
  openaiKey: string;
  onClose: () => void;
}

const EXT_LANG: Record<string, string> = {
  '.py': 'python', '.js': 'javascript', '.ts': 'typescript',
  '.jsx': 'jsx', '.tsx': 'tsx', '.java': 'java', '.c': 'c',
  '.cpp': 'cpp', '.go': 'go', '.rs': 'rust', '.rb': 'ruby',
  '.html': 'html', '.css': 'css', '.json': 'json',
};

const SidePanel: React.FC<SidePanelProps> = ({ node, geminiKey, openaiKey, onClose }) => {
  const [summary, setSummary] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [cached, setCached] = useState(false);
  const [error, setError] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [fileContent, setFileContent] = useState<string>('');
  const [showCode, setShowCode] = useState(false);
  const [loadingCode, setLoadingCode] = useState(false);

  const fetchSummary = useCallback(
    async (force = false) => {
      if (!node) return;
      setLoading(true);
      setError('');
      setSummary('');

      try {
        const resp = await fetch(`${API_BASE}/api/ai-summary`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file_path: node.full_path,
            repo_root: '',
            gemini_api_key: geminiKey || undefined,
            openai_api_key: openaiKey || undefined,
          }),
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data: AISummaryResponse = await resp.json();
        setSummary(data.summary);
        setCached(data.cached);
      } catch (e: any) {
        setError(e.message || 'Failed to fetch summary');
      } finally {
        setLoading(false);
      }
    },
    [node, geminiKey, openaiKey]
  );

  const fetchCode = useCallback(async () => {
    if (!node) return;
    setLoadingCode(true);
    try {
      const resp = await fetch(
        `${API_BASE}/api/file-content?file_path=${encodeURIComponent(node.full_path)}`
      );
      const data = await resp.json();
      setFileContent(data.content || '');
    } catch {
      setFileContent('// Could not load file content');
    } finally {
      setLoadingCode(false);
    }
  }, [node]);

  // Auto-fetch summary on node change
  useEffect(() => {
    if (node) {
      setSummary('');
      setError('');
      setCached(false);
      setShowCode(false);
      setFileContent('');
      fetchSummary();
    }
  }, [node]); // eslint-disable-line

  const handleCopy = () => {
    if (summary) {
      navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const toggleCode = () => {
    if (!showCode && !fileContent) fetchCode();
    setShowCode((v) => !v);
  };

  if (!node) return null;

  const lang = EXT_LANG[node.extension] || 'text';

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: 380,
        height: '100vh',
        background: '#0b1120',
        borderLeft: '1px solid #1e293b',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1000,
        boxShadow: '-8px 0 32px rgba(0,0,0,0.5)',
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid #1e293b',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          position: 'sticky',
          top: 0,
          background: '#0b1120',
          zIndex: 10,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 14, wordBreak: 'break-all' }}
          >
            {node.label}
          </div>
          <div
            style={{
              color: '#475569',
              fontSize: 11,
              marginTop: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={node.path}
          >
            {node.path}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#475569',
            cursor: 'pointer',
            padding: 4,
            marginLeft: 12,
            flexShrink: 0,
          }}
          title="Close panel"
        >
          <X size={18} />
        </button>
      </div>

      <div style={{ padding: 20, flex: 1 }}>
        {/* Metrics grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 10,
            marginBottom: 20,
          }}
        >
          {[
            { label: 'Lines of Code', value: node.lines_of_code.toLocaleString() },
            { label: 'File Size', value: formatSize(node.size_bytes) },
            { label: 'Complexity', value: node.complexity, color: node.complexity_color },
            { label: 'Extension', value: node.extension.toUpperCase() },
            { label: 'Dependencies', value: node.raw_dependencies.length.toString() },
            { label: 'Entry Point', value: node.is_entry_point ? 'Yes' : 'No', color: node.is_entry_point ? '#f59e0b' : '#94a3b8' },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              style={{
                background: '#0f172a',
                borderRadius: 8,
                padding: '10px 12px',
                border: '1px solid #1e293b',
              }}
            >
              <div style={{ color: '#475569', fontSize: 10, marginBottom: 3, fontWeight: 600 }}>
                {label.toUpperCase()}
              </div>
              <div style={{ color: color || '#e2e8f0', fontSize: 14, fontWeight: 700 }}>
                {value}
              </div>
            </div>
          ))}
        </div>

        {/* Dependencies */}
        {node.raw_dependencies.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                color: '#94a3b8',
                fontSize: 11,
                fontWeight: 700,
                marginBottom: 8,
                letterSpacing: '0.08em',
              }}
            >
              IMPORTS / DEPENDENCIES
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {node.raw_dependencies.slice(0, 20).map((dep) => (
                <span
                  key={dep}
                  style={{
                    background: '#1e293b',
                    color: '#94a3b8',
                    fontSize: 10,
                    padding: '3px 8px',
                    borderRadius: 4,
                    fontFamily: 'monospace',
                  }}
                >
                  {dep}
                </span>
              ))}
              {node.raw_dependencies.length > 20 && (
                <span style={{ color: '#475569', fontSize: 10, padding: '3px 4px' }}>
                  +{node.raw_dependencies.length - 20} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* AI Summary */}
        <div
          style={{
            background: '#0f172a',
            borderRadius: 10,
            border: '1px solid #1e293b',
            padding: 16,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Sparkles size={14} color="#6366f1" />
              <span style={{ color: '#e2e8f0', fontSize: 12, fontWeight: 700 }}>
                AI Summary
              </span>
              {cached && (
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                    background: '#1e3a1e',
                    color: '#22c55e',
                    fontSize: 9,
                    padding: '2px 6px',
                    borderRadius: 4,
                  }}
                >
                  <Database size={8} />
                  cached
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <IconBtn onClick={() => fetchSummary(true)} title="Regenerate">
                <RefreshCw size={13} />
              </IconBtn>
              <IconBtn onClick={handleCopy} title="Copy">
                {copied ? <Check size={13} color="#22c55e" /> : <Copy size={13} />}
              </IconBtn>
            </div>
          </div>

          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#475569' }}>
              <div className="spinner" />
              <span style={{ fontSize: 12 }}>Analyzing with AI...</span>
            </div>
          )}

          {error && (
            <div
              style={{
                color: '#ef4444',
                fontSize: 12,
                background: '#1a0a0a',
                padding: '8px 12px',
                borderRadius: 6,
              }}
            >
              {error}
            </div>
          )}

          {summary && !loading && (
            <p
              style={{
                color: '#cbd5e1',
                fontSize: 13,
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              {summary}
            </p>
          )}
        </div>

        {/* View Code toggle */}
        <button
          onClick={toggleCode}
          style={{
            width: '100%',
            background: '#1e293b',
            border: 'none',
            borderRadius: 8,
            padding: '10px 14px',
            color: '#94a3b8',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>View Source Code</span>
          {showCode ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {showCode && (
          <div
            style={{
              marginTop: 8,
              background: '#020817',
              borderRadius: 8,
              border: '1px solid #1e293b',
              overflow: 'auto',
              maxHeight: 360,
            }}
          >
            {loadingCode ? (
              <div style={{ padding: 16, color: '#475569', fontSize: 12 }}>Loading...</div>
            ) : (
              <pre
                style={{
                  margin: 0,
                  padding: 16,
                  fontSize: 11,
                  lineHeight: 1.6,
                  color: '#94a3b8',
                  fontFamily: "'Fira Code', 'Cascadia Code', monospace",
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {fileContent}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const IconBtn: React.FC<{ onClick: () => void; title: string; children: React.ReactNode }> = ({
  onClick,
  title,
  children,
}) => (
  <button
    onClick={onClick}
    title={title}
    style={{
      background: '#1e293b',
      border: 'none',
      borderRadius: 6,
      padding: 5,
      cursor: 'pointer',
      color: '#94a3b8',
      display: 'flex',
      alignItems: 'center',
    }}
  >
    {children}
  </button>
);

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default SidePanel;
