#!/usr/bin/env bash
#
# Publish the current tree to the public mirror.
#
# The working repository's history contains business papers that were only
# removed from the index, not from past commits, so its history can never be
# pushed. What is safe to publish is the tracked tree at HEAD, which .gitignore
# already keeps clean. This exports that tree into a separate repository and
# replaces the public branch with it.
#
# Usage: bash scripts/publish-public-mirror.sh "commit message"

set -euo pipefail

SOURCE_REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIRROR_DIR="${FIN_MIRROR_DIR:-$SOURCE_REPO/../fin-public-mirror}"
REMOTE="${FIN_PUBLIC_REMOTE:-https://github.com/joel-1212/fin-app.git}"
MESSAGE="${1:-Update the published tree}"

# Refuse to publish a dirty tree: git archive reads HEAD, so uncommitted work
# would silently not be published and the mirror would claim to be current.
if [ -n "$(git -C "$SOURCE_REPO" status --porcelain)" ]; then
  echo "working tree has uncommitted changes; commit them first" >&2
  git -C "$SOURCE_REPO" status --short >&2
  exit 1
fi

mkdir -p "$MIRROR_DIR"
# Keep .git, replace everything else, so deletions in the source propagate.
find "$MIRROR_DIR" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
git -C "$SOURCE_REPO" archive HEAD | tar -x -C "$MIRROR_DIR"

cd "$MIRROR_DIR"
if [ ! -d .git ]; then
  git init -q -b main
  git remote add origin "$REMOTE"
fi
git config user.name "joel"
git config user.email "291078006+hidakasota1212-dotcom@users.noreply.github.com"

# On a freshly created mirror, adopt the published history rather than starting
# a rival one, so the next push is an ordinary fast-forward.
if ! git rev-parse --verify -q HEAD >/dev/null && git fetch -q origin main 2>/dev/null; then
  git update-ref refs/heads/main FETCH_HEAD
  git symbolic-ref HEAD refs/heads/main
  git reset -q --mixed
fi

# A last guard: nothing here should carry the internal papers.
if git status --porcelain --ignored=no >/dev/null && ls .company .harness >/dev/null 2>&1; then
  echo "internal directories reached the mirror; aborting" >&2
  exit 1
fi

git add -A
if git diff --cached --quiet; then
  echo "mirror already matches HEAD; nothing to publish"
  exit 0
fi
git commit -q -m "$MESSAGE"
git push -q origin main
echo "published $(git rev-parse --short HEAD) to $REMOTE"
