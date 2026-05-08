#!/usr/bin/env bash
set -euo pipefail

branch="$(git rev-parse --abbrev-ref HEAD)"

if [[ "$branch" != "main" ]]; then
  echo "You are on '$branch'. Switch to 'main' first."
  exit 1
fi

git fetch origin main

local_main="$(git rev-parse main)"
remote_main="$(git rev-parse origin/main)"

if [[ "$local_main" != "$remote_main" ]]; then
  echo "Local main is behind/ahead of origin/main."
  echo "Run: git rebase origin/main"
  echo "If rebase is blocked by untracked files, commit to a feature branch and open a PR."
  exit 1
fi

git push origin main
echo "Push to main completed."
