#!/usr/bin/env bash
set -euo pipefail

echo "[post-create] start"

# Make Git happy inside container even if host perms differ
git config --global --add safe.directory /app || true

# Pull down any LFS pointers (models, large assets)
if command -v git-lfs >/dev/null 2>&1; then
  git lfs pull || true
fi

# Install pre-commit hooks if present
if [ -f ".pre-commit-config.yaml" ]; then
  pip install --no-cache-dir pre-commit || true
  pre-commit install || true
fi

# If you keep extra spaCy models or other resources, fetch them here
# python -m spacy download en_core_web_md || true

echo "[post-create] done"
