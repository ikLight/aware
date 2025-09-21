#!/usr/bin/env bash
set -euo pipefail

echo "[install-tools] start"

# Ensure Git LFS is initialized inside the container
if command -v git-lfs >/dev/null 2>&1; then
  git lfs install --system || true
fi

# Optional: global Node/Yarn/Pnpm (comment out if you don’t need them)
if command -v npm >/dev/null 2>&1; then
  npm install -g yarn pnpm || true
fi

# Optional: Python linters/formatters if not pinned in requirements
# pip install --no-cache-dir ruff black pre-commit || true

echo "[install-tools] done"
