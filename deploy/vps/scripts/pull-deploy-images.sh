#!/usr/bin/env bash
# Pull all CI-built deploy images (web admin, web client, functions gateway + migrations).
# Usage: bash deploy/vps/scripts/pull-deploy-images.sh dev|prod sha-<gitsha>
set -euo pipefail

ENV_NAME="${1:-}"
IMAGE_TAG="${2:-}"

if [[ "$ENV_NAME" != "dev" && "$ENV_NAME" != "prod" ]]; then
  echo "Usage: $0 dev|prod sha-<gitsha>"
  exit 1
fi
if [[ -z "$IMAGE_TAG" ]]; then
  echo "Usage: $0 dev|prod sha-<gitsha>"
  exit 1
fi

PREFIX="${DOCKER_IMAGE_PREFIX:-coorise}"
ok=0
required=3

for img in ryvo-web-admin ryvo-web-client ryvo-functions; do
  ref="${PREFIX}/${img}:${IMAGE_TAG}"
  echo "==> docker pull $ref"
  if docker pull "$ref"; then
    ok=$((ok + 1))
  else
    echo "  ERROR pull failed: $ref"
  fi
done

if [[ "$ok" -eq "$required" ]]; then
  echo "==> pull-deploy-images: all images ready (tag=$IMAGE_TAG)"
  exit 0
fi

echo "==> pull-deploy-images: expected $required images, got $ok"
exit 1
