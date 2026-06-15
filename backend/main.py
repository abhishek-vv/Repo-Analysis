"""
Repository Structure Analysis and Visualisation System - Backend
FastAPI server that parses local Git repositories and exposes REST API endpoints.
"""

import os
import re
import ast
import json
import hashlib
import subprocess
from pathlib import Path
from typing import Optional
from collections import defaultdict

import httpx
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Repo Visualizer API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── In-memory AI summary cache {file_hash: summary} ─────────────────────────
AI_CACHE: dict[str, str] = {}

# ─── File extension groups ────────────────────────────────────────────────────
PARSEABLE_EXTENSIONS = {
    ".py", ".js", ".ts", ".jsx", ".tsx", ".java", ".c", ".cpp", ".h",
    ".go", ".rs", ".rb", ".php", ".cs", ".swift", ".kt", ".scala",
    ".html", ".css", ".scss", ".json", ".yaml", ".yml", ".toml", ".md",
}

SKIP_DIRS = {
    "node_modules", "__pycache__", ".git", ".venv", "venv", "env",
    "dist", "build", ".next", ".nuxt", "coverage", ".pytest_cache",
    ".mypy_cache", ".tox", "eggs", ".eggs", "target", "vendor",
    ".idea", ".vscode", "*.egg-info",
}

# ─── Dependency extraction regexes ────────────────────────────────────────────
IMPORT_PATTERNS = {
    ".py": [
        re.compile(r"^\s*import\s+([\w\.]+)", re.MULTILINE),
        re.compile(r"^\s*from\s+([\w\.]+)\s+import", re.MULTILINE),
    ],
    ".js": [
        re.compile(r'(?:import|require)\s*[(\s]*[\'"]([^\'"\)]+)[\'"]', re.MULTILINE),
    ],
    ".ts": [
        re.compile(r'(?:import|require)\s*[(\s]*[\'"]([^\'"\)]+)[\'"]', re.MULTILINE),
    ],
    ".jsx": [
        re.compile(r'(?:import|require)\s*[(\s]*[\'"]([^\'"\)]+)[\'"]', re.MULTILINE),
    ],
    ".tsx": [
        re.compile(r'(?:import|require)\s*[(\s]*[\'"]([^\'"\)]+)[\'"]', re.MULTILINE),
    ],
    ".c": [
        re.compile(r'#\s*include\s*[<"]([^>"]+)[>"]', re.MULTILINE),
    ],
    ".cpp": [
        re.compile(r'#\s*include\s*[<"]([^>"]+)[>"]', re.MULTILINE),
    ],
    ".h": [
        re.compile(r'#\s*include\s*[<"]([^>"]+)[>"]', re.MULTILINE),
    ],
    ".go": [
        re.compile(r'"([^"]+)"', re.MULTILINE),
    ],
    ".java": [
        re.compile(r'^\s*import\s+([\w\.]+);', re.MULTILINE),
    ],
    ".rs": [
        re.compile(r'^\s*use\s+([\w:]+)', re.MULTILINE),
        re.compile(r'extern crate\s+(\w+)', re.MULTILINE),
    ],
    ".rb": [
        re.compile(r'^\s*require\s+[\'"]([^\'"]+)[\'"]', re.MULTILINE),
    ],
}


# ─── Models ───────────────────────────────────────────────────────────────────
class FileNode(BaseModel):
    id: str
    label: str
    path: str
    extension: str
    lines_of_code: int
    size_bytes: int
    complexity: str
    dependencies: list[str]
    is_entry_point: bool


class GraphData(BaseModel):
    nodes: list[dict]
    edges: list[dict]
    stats: dict


class AISummaryRequest(BaseModel):
    file_path: str
    repo_root: str
    gemini_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None


class AISummaryResponse(BaseModel):
    summary: str
    cached: bool
    file_hash: str


# ─── Utility functions ────────────────────────────────────────────────────────

def should_skip_dir(dirname: str) -> bool:
    return dirname in SKIP_DIRS or dirname.startswith(".")


def get_file_hash(content: str) -> str:
    return hashlib.md5(content.encode()).hexdigest()


def count_lines(content: str) -> int:
    lines = content.splitlines()
    non_blank = [l for l in lines if l.strip()]
    return len(non_blank)


def estimate_complexity(content: str, ext: str) -> str:
    """
    Simple heuristic complexity: count branching keywords.
    Returns Low / Medium / High / Very High.
    """
    keywords = ["if ", "elif ", "else:", "for ", "while ", "try:", "except",
                 "switch", "case ", "catch", "&&", "||", "?"]
    score = sum(content.count(k) for k in keywords)
    if score < 10:
        return "Low"
    elif score < 30:
        return "Medium"
    elif score < 70:
        return "High"
    return "Very High"


def extract_dependencies(content: str, ext: str) -> list[str]:
    patterns = IMPORT_PATTERNS.get(ext, [])
    deps = set()
    for pattern in patterns:
        for match in pattern.finditer(content):
            dep = match.group(1).strip()
            if dep:
                deps.add(dep)
    return sorted(deps)


def is_entry_point(filename: str, content: str, ext: str) -> bool:
    name = filename.lower()
    if name in ("main.py", "app.py", "server.py", "index.js", "index.ts",
                "index.jsx", "index.tsx", "main.go", "main.rs", "main.c",
                "main.cpp", "manage.py", "wsgi.py", "asgi.py"):
        return True
    if ext == ".py" and 'if __name__ == "__main__"' in content:
        return True
    return False


def resolve_local_deps(dep: str, current_file: Path, all_files: set, repo_root: Path) -> list[str]:
    """Try to resolve a dependency string to an actual file in the repo."""
    resolved = []

    # Relative imports (JS/TS style)
    if dep.startswith("."):
        base = (current_file.parent / dep).resolve()
        candidates = [
            base,
            base.with_suffix(".js"),
            base.with_suffix(".ts"),
            base.with_suffix(".jsx"),
            base.with_suffix(".tsx"),
            base.with_suffix(".py"),
            base / "index.js",
            base / "index.ts",
        ]
        for c in candidates:
            if c in all_files:
                resolved.append(str(c.relative_to(repo_root)))
        return resolved

    # Python relative (convert dots to path)
    dot_path = dep.replace(".", "/")
    for f in all_files:
        rel = str(f.relative_to(repo_root))
        if rel.replace("/", ".").replace("\\", ".").startswith(dep.split(".")[0]):
            if dot_path in str(f):
                resolved.append(str(f.relative_to(repo_root)))

    return resolved


# ─── Core analysis function ───────────────────────────────────────────────────

def analyze_repository(repo_path: str) -> GraphData:
    root = Path(repo_path).resolve()
    if not root.exists():
        raise FileNotFoundError(f"Path not found: {repo_path}")

    all_files: set[Path] = set()

    # Collect all files
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if not should_skip_dir(d)]
        for fn in filenames:
            fp = Path(dirpath) / fn
            if fp.suffix in PARSEABLE_EXTENSIONS:
                all_files.add(fp.resolve())

    nodes = []
    edges = []
    edge_set = set()
    file_id_map: dict[Path, str] = {}

    total_loc = 0
    total_files = len(all_files)
    lang_counts: dict[str, int] = defaultdict(int)

    # First pass: build nodes
    for fp in sorted(all_files):
        rel = fp.relative_to(root)
        node_id = str(rel).replace(os.sep, "/")
        file_id_map[fp] = node_id

        try:
            content = fp.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            content = ""

        ext = fp.suffix
        loc = count_lines(content)
        size = fp.stat().st_size
        deps = extract_dependencies(content, ext)
        complexity = estimate_complexity(content, ext)
        entry = is_entry_point(fp.name, content, ext)

        total_loc += loc
        lang_counts[ext] += 1

        # Complexity → visual color hint
        complexity_color = {
            "Low": "#22c55e",
            "Medium": "#f59e0b",
            "High": "#f97316",
            "Very High": "#ef4444",
        }.get(complexity, "#6b7280")

        nodes.append({
            "id": node_id,
            "type": "fileNode",
            "position": {"x": 0, "y": 0},   # frontend will layout
            "data": {
                "label": fp.name,
                "path": node_id,
                "full_path": str(fp),
                "extension": ext,
                "lines_of_code": loc,
                "size_bytes": size,
                "complexity": complexity,
                "complexity_color": complexity_color,
                "raw_dependencies": deps,
                "is_entry_point": entry,
                "file_hash": get_file_hash(content),
            },
        })

    # Second pass: build edges from resolved deps
    node_ids = {n["id"] for n in nodes}

    for fp in sorted(all_files):
        node_id = file_id_map[fp]
        try:
            content = fp.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            content = ""
        deps = extract_dependencies(content, fp.suffix)

        for dep in deps:
            resolved = resolve_local_deps(dep, fp, all_files, root)
            for r in resolved:
                r_norm = r.replace(os.sep, "/")
                if r_norm in node_ids and r_norm != node_id:
                    edge_key = (node_id, r_norm)
                    if edge_key not in edge_set:
                        edge_set.add(edge_key)
                        edges.append({
                            "id": f"e-{node_id}->{r_norm}",
                            "source": node_id,
                            "target": r_norm,
                            "animated": False,
                            "style": {"stroke": "#6366f1", "strokeWidth": 1.5},
                        })

    stats = {
        "total_files": total_files,
        "total_loc": total_loc,
        "total_edges": len(edges),
        "languages": {k: v for k, v in sorted(lang_counts.items(), key=lambda x: -x[1])},
        "repo_name": root.name,
    }

    return GraphData(nodes=nodes, edges=edges, stats=stats)


# ─── API Endpoints ────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "Repo Visualizer API running", "version": "1.0.0"}


@app.get("/api/analyze", response_model=GraphData)
def analyze(repo_path: str = Query(..., description="Absolute path to the local repository")):
    try:
        data = analyze_repository(repo_path)
        return data
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@app.post("/api/ai-summary", response_model=AISummaryResponse)
async def ai_summary(req: AISummaryRequest):
    """
    Reads a file, checks cache by content hash,
    calls Gemini or OpenAI if not cached.
    """
    fp = Path(req.file_path)
    if not fp.exists():
        raise HTTPException(status_code=404, detail="File not found")

    try:
        content = fp.read_text(encoding="utf-8", errors="ignore")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cannot read file: {e}")

    file_hash = get_file_hash(content)

    # Cache hit
    if file_hash in AI_CACHE:
        return AISummaryResponse(summary=AI_CACHE[file_hash], cached=True, file_hash=file_hash)

    prompt = (
        f"You are a senior software engineer. Analyze the following source file "
        f"(path: {req.file_path}) and explain what it does in exactly 3 simple "
        f"sentences. Be concise and clear. Focus on purpose, not line-by-line detail.\n\n"
        f"```\n{content[:4000]}\n```"
    )

    summary = ""

    # Try Gemini first
    if req.gemini_api_key:
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={req.gemini_api_key}",
                    json={
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {"maxOutputTokens": 200, "temperature": 0.3},
                    },
                )
                data = resp.json()
                summary = data["candidates"][0]["content"]["parts"][0]["text"].strip()
        except Exception as e:
            summary = f"[Gemini error: {e}]"

    # Fallback to OpenAI
    elif req.openai_api_key:
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {req.openai_api_key}"},
                    json={
                        "model": "gpt-4o-mini",
                        "messages": [{"role": "user", "content": prompt}],
                        "max_tokens": 200,
                        "temperature": 0.3,
                    },
                )
                data = resp.json()
                summary = data["choices"][0]["message"]["content"].strip()
        except Exception as e:
            summary = f"[OpenAI error: {e}]"

    else:
        # Fallback: static analysis summary
        ext = fp.suffix
        loc = count_lines(content)
        deps = extract_dependencies(content, ext)
        summary = (
            f"This {ext} file contains {loc} lines of code. "
            f"It imports {len(deps)} dependencies: {', '.join(deps[:5]) if deps else 'none'}. "
            f"No AI API key provided — connect Gemini or OpenAI for intelligent summaries."
        )

    AI_CACHE[file_hash] = summary
    return AISummaryResponse(summary=summary, cached=False, file_hash=file_hash)


@app.get("/api/file-content")
def file_content(file_path: str = Query(...)):
    fp = Path(file_path)
    if not fp.exists():
        raise HTTPException(status_code=404, detail="File not found")
    try:
        content = fp.read_text(encoding="utf-8", errors="ignore")
        return {"content": content[:8000], "truncated": len(content) > 8000}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/cache-stats")
def cache_stats():
    return {"cached_files": len(AI_CACHE), "hashes": list(AI_CACHE.keys())}


@app.delete("/api/cache")
def clear_cache():
    AI_CACHE.clear()
    return {"message": "Cache cleared"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
