#!/bin/sh
set -eu

cd /home/deno/functions
bun install --cwd /home/deno/functions

echo "[ryvo] Starting API gateway (bun $(bun --version))..."
export BUN_JSC_forceRAMSize=512MB
exec bun /home/deno/functions/ryvo-gateway/index.ts
