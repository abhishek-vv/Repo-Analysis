import React, { useState } from 'react';
import {
  Search,
  Settings,
  GitBranch,
  LayoutGrid,
  Cpu,
  ChevronDown,
  ChevronUp,
  FolderOpen,
  X,
} from 'lucide-react';
import { RepoStats } from '../types';

interface ToolbarProps {
  repoPath: string;
  setRepoPath: (p: string) => void;
  geminiKey: string;
  setGeminiKey: (k: string) => void;
  openaiKey: string;
  setOpenaiKey: (k: string) => void;
  onAnalyze: () => void;
  loading: boolean;
  stats: RepoStats | null;
  filterExt: string;
  setFilterExt: (e: string) => void;
  searchTerm: string;
  setSearchTerm: (s: string) => void;
  layoutType: 'force' | 'grid' | 'tree';
  setLayoutType: (l: 'force' | 'grid' | 'tree') => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
  repoPath,
  setRepoPath,
  geminiKey,
  setGeminiKey,
  openaiKey,
  setOpenaiKey,
  onAnalyze,
  loading,
  stats,
  filterExt,
  setFilterExt,
  searchTerm,
  setSearchTerm,
  layoutType,
  setLayoutType,
}) => {
  const [showSettings, setShowSettings] = useState(false);

  const langs = stats ? Object.entries(stats.languages).sort((a, b) => b[1] - a[1]) : [];

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 500,
        background: '#0b1120',
        borderBottom: '1px solid #1e293b',
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
      }}
    >
      {/* Main bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 20px',
          flexWrap: 'wrap',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 4 }}>
          <GitBranch size={18} color="#6366f1" />
          <span
            style={{ color: '#e2e8f0', fontWeight: 800, fontSize: 15, letterSpacing: '-0.02em' }}
          >
            RepoGraph
          </span>
        </div>

        {/* Path input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 260 }}>
          <FolderOpen size={14} color="#475569" />
          <input
            type="text"
            value={repoPath}
            onChange={(e) => setRepoPath(e.target.value)}
            placeholder="Enter absolute path to repository..."
            onKeyDown={(e) => e.key === 'Enter' && onAnalyze()}
            style={{
              flex: 1,
              background: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: 7,
              padding: '7px 12px',
              color: '#e2e8f0',
              fontSize: 12,
              fontFamily: 'monospace',
              outline: 'none',
            }}
          />
        </div>

        {/* Analyze button */}
        <button
          onClick={onAnalyze}
          disabled={loading || !repoPath}
          style={{
            background: loading ? '#312e81' : '#6366f1',
            color: '#fff',
            border: 'none',
            borderRadius: 7,
            padding: '7px 18px',
            fontSize: 12,
            fontWeight: 700,
            cursor: loading || !repoPath ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            opacity: !repoPath ? 0.5 : 1,
            transition: 'background 0.15s',
            whiteSpace: 'nowrap',
          }}
        >
          {loading ? (
            <>
              <span className="spin-icon">⟳</span> Analyzing...
            </>
          ) : (
            <>
              <Cpu size={13} /> Analyze
            </>
          )}
        </button>

        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Search size={13} color="#475569" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search files..."
            style={{
              width: 150,
              background: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: 7,
              padding: '7px 12px',
              color: '#e2e8f0',
              fontSize: 12,
              outline: 'none',
            }}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: 0 }}
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Layout switcher */}
        <div style={{ display: 'flex', gap: 4 }}>
          {(['force', 'grid', 'tree'] as ('force' | 'grid' | 'tree')[]).map((l) => (
            <button
              key={l}
              onClick={() => setLayoutType(l)}
              style={{
                background: layoutType === l ? '#6366f1' : '#1e293b',
                color: layoutType === l ? '#fff' : '#94a3b8',
                border: 'none',
                borderRadius: 6,
                padding: '5px 10px',
                fontSize: 10,
                fontWeight: 700,
                cursor: 'pointer',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Settings toggle */}
        <button
          onClick={() => setShowSettings((v) => !v)}
          style={{
            background: showSettings ? '#1e293b' : 'transparent',
            border: '1px solid #1e293b',
            borderRadius: 7,
            padding: '6px 10px',
            color: '#94a3b8',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <Settings size={13} />
          {showSettings ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        </button>
      </div>

      {/* Stats bar */}
      {stats && (
        <div
          style={{
            padding: '6px 20px',
            borderTop: '1px solid #1e293b',
            display: 'flex',
            gap: 20,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <StatChip label="Repo" value={stats.repo_name} />
          <StatChip label="Files" value={stats.total_files.toLocaleString()} />
          <StatChip label="Lines" value={stats.total_loc.toLocaleString()} />
          <StatChip label="Edges" value={stats.total_edges.toLocaleString()} />

          {/* Language filter pills */}
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            <FilterPill
              label="All"
              active={filterExt === ''}
              onClick={() => setFilterExt('')}
            />
            {langs.map(([ext, count]) => (
              <FilterPill
                key={ext}
                label={`${ext} (${count})`}
                active={filterExt === ext}
                onClick={() => setFilterExt(filterExt === ext ? '' : ext)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Settings panel */}
      {showSettings && (
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid #1e293b',
            background: '#070e1a',
            display: 'flex',
            gap: 20,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <ApiKeyInput
            label="Gemini API Key"
            value={geminiKey}
            onChange={setGeminiKey}
            placeholder="AIza..."
          />
          <ApiKeyInput
            label="OpenAI API Key (fallback)"
            value={openaiKey}
            onChange={setOpenaiKey}
            placeholder="sk-..."
          />
          <div style={{ color: '#475569', fontSize: 10, maxWidth: 320 }}>
            API keys are stored in-memory only. Gemini is used first; OpenAI is the fallback.
            If neither is provided, a static analysis summary is generated.
          </div>
        </div>
      )}
    </div>
  );
};

const StatChip: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
    <span style={{ color: '#475569', fontSize: 10, fontWeight: 600 }}>{label}:</span>
    <span style={{ color: '#e2e8f0', fontSize: 11, fontWeight: 700 }}>{value}</span>
  </div>
);

const FilterPill: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({
  label,
  active,
  onClick,
}) => (
  <button
    onClick={onClick}
    style={{
      background: active ? '#6366f1' : '#1e293b',
      color: active ? '#fff' : '#94a3b8',
      border: 'none',
      borderRadius: 12,
      padding: '3px 10px',
      fontSize: 10,
      fontWeight: 600,
      cursor: 'pointer',
      fontFamily: 'monospace',
    }}
  >
    {label}
  </button>
);

const ApiKeyInput: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}> = ({ label, value, onChange, placeholder }) => (
  <div>
    <div style={{ color: '#94a3b8', fontSize: 10, marginBottom: 4, fontWeight: 600 }}>{label}</div>
    <input
      type="password"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: 220,
        background: '#0f172a',
        border: '1px solid #1e293b',
        borderRadius: 6,
        padding: '6px 10px',
        color: '#e2e8f0',
        fontSize: 12,
        fontFamily: 'monospace',
        outline: 'none',
      }}
    />
  </div>
);

export default Toolbar;
