#!/bin/sh
set -eu

cd /home/deno/functions
bun install --cwd /home/deno/functions

echo "[ryvo] Starting API gateway..."
exec bun /home/deno/functions/ryvo-gateway/index.ts
