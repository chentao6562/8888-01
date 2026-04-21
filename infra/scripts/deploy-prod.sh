#!/usr/bin/env bash
# 部署到生产（K8s namespace=mindlink）
# 用法：bash infra/scripts/deploy-prod.sh <image-tag>
# ⚠️ 仅在 staging 冒烟通过 + 灰度账号回归后执行

set -euo pipefail
TAG=${1:?"image tag required"}
NAMESPACE=mindlink
REGISTRY=${REGISTRY:-registry.example.com}

echo "==> 当前 prod 版本（回滚备用）"
PREV=$(kubectl -n "$NAMESPACE" get deploy mindlink-api -o jsonpath='{.spec.template.spec.containers[0].image}' || echo "none")
echo "    $PREV"

read -r -p "继续部署 $TAG 到生产？(yes/no): " confirm
[ "$confirm" = "yes" ] || { echo "abort"; exit 1; }

echo "==> Apply manifests"
for f in configmap api.deployment admin-web.deployment ingress cronjobs; do
  sed -e "s/__IMAGE_TAG__/$TAG/g" "infra/k8s/${f}.yaml" | kubectl apply -f -
done

echo "==> Rollout (api)"
kubectl -n "$NAMESPACE" rollout status deploy/mindlink-api --timeout=300s
kubectl -n "$NAMESPACE" rollout status deploy/mindlink-admin-web --timeout=180s

echo "==> Smoke"
curl -fsS "https://api.mindlink.example.com/api/v1/health" && echo " · health ok"

echo "✓ prod $TAG 已上线 · 旧版本可回滚到 $PREV"
