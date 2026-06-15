# RepoGraph — Repository Structure Analysis & Visualisation System

> **Visually map folder structures, inter-file dependencies, and code complexity metrics for any local codebase.**

---

## Features

| Feature | Detail |
|---|---|
| 🔍 **Dependency Analysis** | Extracts `import`/`#include`/`require` statements for Python, JS/TS, C/C++, Java, Go, Rust, Ruby |
| 🗺️ **Interactive Graph** | React Flow canvas — drag nodes, zoom, pan, mini-map |
| 📊 **Code Metrics** | Lines of Code (LoC), file size, complexity (Low/Medium/High/Very High) per node |
| 🤖 **AI Summaries** | Click any file → side panel → Gemini / OpenAI explains it in 3 sentences |
| 💾 **Smart Cache** | AI summaries cached by file content hash — never re-analyzed unless content changes |
| 🔎 **Search & Filter** | Full-text search + filter by extension in real time |
| 🏗️ **3 Layout Modes** | Force (circular), Grid, Tree |
| 🎨 **Entry Point Detection** | `main.py`, `index.ts`, `if __name__ == "__main__"` etc. highlighted in gold |

---

## Project Structure

```
repo-visualizer/
├── backend/
│   ├── main.py              # FastAPI server (analysis + AI proxy + cache)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.tsx           # Root component, state management
│   │   ├── components/
│   │   │   ├── FileNode.tsx  # Custom React Flow node
│   │   │   ├── SidePanel.tsx # AI summary + file details drawer
│   │   │   └── Toolbar.tsx   # Top bar: path input, search, filters, settings
│   │   ├── hooks/
│   │   │   └── useLayout.ts  # Force / Grid / Tree layout algorithms
│   │   └── types/
│   │       └── index.ts      # Shared TypeScript interfaces
│   └── package.json
├── start.sh                 # One-command startup script
└── README.md
```

---

## Quick Start

### Prerequisites
- Python 3.9+
- Node.js 18+
- npm

### 1 — Clone / download this project

### 2 — Start everything

**Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm start
```

### 3 — Open the app

Navigate to **http://localhost:3000**

---

## Usage

1. **Enter a path** — Type the absolute path to any local repository in the top input bar.
   Example: `/home/user/my-django-project` or `C:\Users\user\my-project`

2. **Click Analyze** — The backend traverses the directory, parses imports, calculates LoC and complexity, then returns a graph.

3. **Explore the graph** — Drag nodes freely, zoom with scroll, use the mini-map. Color-coded by complexity:
   - 🟢 Green = Low
   - 🟡 Amber = Medium
   - 🟠 Orange = High
   - 🔴 Red = Very High

4. **Click a node** — Opens the side panel with:
   - File metrics (LoC, size, complexity, dependency count)
   - Raw import list
   - AI-generated 3-sentence summary
   - Source code viewer

5. **AI Summaries** — Go to ⚙️ Settings and enter your Gemini or OpenAI API key. Keys are kept in-memory only (never sent anywhere except the AI provider).

6. **Filter & Search** — Use the search box to highlight/filter files. Click an extension pill to show only files of that type.

7. **Change Layout** — Switch between `FORCE`, `GRID`, and `TREE` layouts in the toolbar.

---

## REST API

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/analyze?repo_path=<path>` | Analyze a repo, returns `{nodes, edges, stats}` |
| `POST` | `/api/ai-summary` | Get AI summary for a file |
| `GET` | `/api/file-content?file_path=<path>` | Read raw file content |
| `GET` | `/api/cache-stats` | View cache state |
| `DELETE` | `/api/cache` | Clear AI summary cache |

### Sample Response (`/api/analyze`)

```json
{
  "nodes": [
    {
      "id": "src/app.py",
      "type": "fileNode",
      "position": {"x": 0, "y": 0},
      "data": {
        "label": "app.py",
        "path": "src/app.py",
        "extension": ".py",
        "lines_of_code": 142,
        "size_bytes": 4120,
        "complexity": "Medium",
        "complexity_color": "#f59e0b",
        "raw_dependencies": ["fastapi", "sqlalchemy", ".models"],
        "is_entry_point": true,
        "file_hash": "d41d8cd98f00b204e9800998ecf8427e"
      }
    }
  ],
  "edges": [
    {
      "id": "e-src/app.py->src/models.py",
      "source": "src/app.py",
      "target": "src/models.py",
      "animated": false
    }
  ],
  "stats": {
    "total_files": 24,
    "total_loc": 3841,
    "total_edges": 18,
    "languages": {".py": 20, ".md": 3, ".toml": 1},
    "repo_name": "my-project"
  }
}
```

---

## Supported Languages

| Language | Import Detection |
|---|---|
| Python | `import x`, `from x import` |
| JavaScript / TypeScript / JSX / TSX | `import '...'`, `require('...')` |
| C / C++ / H | `#include <...>`, `#include "..."` |
| Java | `import x.y.z;` |
| Go | `"package/path"` |
| Rust | `use x::y`, `extern crate x` |
| Ruby | `require '...'` |

---

## AI Integration

Clicking a file node triggers `POST /api/ai-summary` with:
```json
{
  "file_path": "/abs/path/to/file.py",
  "repo_root": "",
  "gemini_api_key": "AIza...",
  "openai_api_key": null
}
```

**Priority order:**
1. Return cached result if file hash matches
2. Call Gemini 1.5 Flash if key provided
3. Fall back to OpenAI GPT-4o-mini if key provided
4. Return static analysis summary if no keys

**Prompt used:**
> "You are a senior software engineer. Analyze the following source file and explain what it does in exactly 3 simple sentences. Be concise and clear. Focus on purpose, not line-by-line detail."

---

## Configuration

Skipped directories (never traversed):
```
node_modules  __pycache__  .git  .venv  venv  dist  build
.next  .nuxt  coverage  target  vendor  .idea  .vscode
```

Supported file extensions:
```
.py .js .ts .jsx .tsx .java .c .cpp .h .go .rs .rb .php .cs
.swift .kt .scala .html .css .scss .json .yaml .yml .toml .md
```

---

## Team

Built for a 2-member team submission. Each team member can own one vertical:
- **Member 1** — Backend (`main.py`): traversal, parsing, dependency extraction, metrics, AI proxy, cache
- **Member 2** — Frontend (`App.tsx`, `FileNode.tsx`, `SidePanel.tsx`, `Toolbar.tsx`, `useLayout.ts`): React Flow, UI, API integration

---

## Tech Stack

- **Backend:** Python 3.9+, FastAPI, uvicorn, httpx, pydantic
- **Frontend:** React 18, TypeScript, React Flow, lucide-react
- **AI:** Google Gemini 1.5 Flash (primary) / OpenAI GPT-4o-mini (fallback)
