#!/usr/bin/env bash
# Pull admin + client web images built by GitHub Actions (Docker Hub).
# Prefer pull-deploy-images.sh (includes ryvo-functions for migrations).
# Usage: bash deploy/vps/scripts/pull-web-images.sh dev|prod sha-<gitsha>
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

for img in ryvo-web-admin ryvo-web-client; do
  ref="${PREFIX}/${img}:${IMAGE_TAG}"
  echo "==> docker pull $ref"
  if docker pull "$ref"; then
    ok=$((ok + 1))
  else
    echo "  WARN pull failed: $ref"
  fi
done

if [[ "$ok" -eq 2 ]]; then
  echo "==> pull-web-images: both images ready (tag=$IMAGE_TAG)"
  exit 0
fi

echo "==> pull-web-images: expected 2 images, got $ok"
exit 1
