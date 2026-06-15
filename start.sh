#!/usr/bin/env bash
# start.sh — Starts the RepoGraph backend + frontend

set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║        RepoGraph — Codebase Visualizer   ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ── Backend ──────────────────────────────────────────────────────────────────
echo "→ Installing Python dependencies..."
cd "$ROOT/backend"
pip install -r requirements.txt --break-system-packages -q 2>/dev/null || \
  pip install -r requirements.txt -q

echo "→ Starting FastAPI backend on http://localhost:8000 ..."
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
echo "  Backend PID: $BACKEND_PID"

# ── Frontend ─────────────────────────────────────────────────────────────────
echo ""
echo "→ Installing Node dependencies..."
cd "$ROOT/frontend"
npm install -q

echo "→ Starting React frontend on http://localhost:3000 ..."
npm start &
FRONTEND_PID=$!
echo "  Frontend PID: $FRONTEND_PID"

echo ""
echo "✓ Both servers started."
echo "  Backend  → http://localhost:8000"
echo "  Frontend → http://localhost:3000"
echo ""
echo "  Press Ctrl+C to stop both."

# Wait for Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo '\nStopped.'" INT
wait
