#!/usr/bin/env bash
# Build a portable source bundle of the committed tree for a remote Linux machine (local only; uploads nothing).
# Excludes everything that must not leave this machine: data/raw/ (untracked, location-sensitive field data),
# artifacts/ (untracked), public/audio/ (derived from the user's Epidemic Sound files; not for redistribution) and
# training/. Refuses to build from a dirty tree or when scripts/remote/expected-hashes.json is stale.
set -euo pipefail
cd "$(dirname "$0")/../.."
if [ -n "$(git status --porcelain -- src scripts data tests docs package.json pnpm-lock.yaml | grep -v -E '^\?\? (node_modules|data/raw|artifacts)' || true)" ]; then
  echo "uncommitted changes under src/ scripts/ data/ tests/ docs/: commit first" >&2; exit 2
fi
pnpm exec tsx scripts/remote/verify.ts >/dev/null || { echo "expected hashes are stale: run 'pnpm exec tsx scripts/remote/verify.ts --record', commit, then bundle" >&2; exit 3; }
commit=$(git rev-parse HEAD); short=${commit:0:10}
mkdir -p artifacts/remote
tmp=$(mktemp -d)
git archive --format=tar HEAD -- . ':(exclude)public/audio' ':(exclude)training' ':(exclude)data/raw' | tar -x -C "$tmp"
echo "$commit" > "$tmp/BUNDLE_COMMIT"
out="artifacts/remote/mgogo-$short.tar.gz"
tar -czf "$out" -C "$tmp" .
rm -rf "$tmp"
if tar -tzf "$out" | grep -E -q '^\./(data/raw|public/audio|artifacts)/'; then echo "bundle contains excluded paths" >&2; rm -f "$out"; exit 4; fi
echo "wrote $out ($(du -h "$out" | cut -f1)); commit $commit"
