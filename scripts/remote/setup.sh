#!/usr/bin/env bash
# One-time setup on a fresh Ubuntu 22.04/24.04 machine (run inside the unpacked bundle).
set -euo pipefail
if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 22 ]; then
  echo "Install Node 22 or newer first, e.g.: curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt-get install -y nodejs" >&2; exit 2
fi
command -v pnpm >/dev/null || sudo npm install -g pnpm@9
pnpm install --frozen-lockfile
pnpm exec tsx scripts/remote/verify.ts
echo "setup done: hashes match the local machine; next: scripts/remote/run-all.sh"
