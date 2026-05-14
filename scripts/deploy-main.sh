#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: ./scripts/deploy-main.sh \"commit message\""
  exit 1
fi

msg="$*"
branch="$(git rev-parse --abbrev-ref HEAD)"

if [[ "$branch" != "main" ]]; then
  echo "You are on '$branch'. Switch to 'main' first."
  echo "Run: git checkout main"
  exit 1
fi

git fetch origin main

local_main="$(git rev-parse main)"
remote_main="$(git rev-parse origin/main)"

if [[ "$local_main" != "$remote_main" ]]; then
  echo "Local main is behind/ahead of origin/main."
  echo "Run: git rebase origin/main"
  exit 1
fi

if [[ -z "$(git status --porcelain)" ]]; then
  echo "No local changes to deploy."
  echo "Nothing to commit."
  exit 0
fi

git add -A
git commit -m "$msg"
git push origin main

echo "Deploy flow complete: changes pushed to main."
echo "Vercel will auto-deploy from GitHub main."
