#!/usr/bin/env bash
# 部署到 staging（K8s namespace=mindlink-staging）
# 用法：bash infra/scripts/deploy-staging.sh <image-tag>

set -euo pipefail
TAG=${1:?"image tag required"}
NAMESPACE=${NAMESPACE:-mindlink-staging}
REGISTRY=${REGISTRY:-registry.example.com}

echo "==> Build & push API image"
docker build -t "$REGISTRY/mindlink/api:$TAG" -f infra/docker/api.Dockerfile .
docker push "$REGISTRY/mindlink/api:$TAG"

echo "==> Build & push Admin Web image"
docker build -t "$REGISTRY/mindlink/admin-web:$TAG" \
  --build-arg VITE_API_BASE=https://api-staging.mindlink.example.com/api/v1 \
  -f infra/docker/admin-web.Dockerfile .
docker push "$REGISTRY/mindlink/admin-web:$TAG"

echo "==> Apply manifests to $NAMESPACE"
for f in namespace configmap secret.template api.deployment admin-web.deployment redis.deployment ingress; do
  sed -e "s/__IMAGE_TAG__/$TAG/g" -e "s/namespace: mindlink/namespace: $NAMESPACE/g" \
    "infra/k8s/${f}.yaml" | kubectl apply -f -
done

echo "==> Wait for rollout"
kubectl -n "$NAMESPACE" rollout status deploy/mindlink-api --timeout=180s
kubectl -n "$NAMESPACE" rollout status deploy/mindlink-admin-web --timeout=120s

echo "==> Smoke test"
SMOKE_HOST=${SMOKE_HOST:-https://api-staging.mindlink.example.com}
curl -fsS "$SMOKE_HOST/api/v1/health" && echo " · health ok"

echo "✓ staging $TAG 部署完成"
