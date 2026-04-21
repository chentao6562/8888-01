#!/usr/bin/env bash
# MindLink 服务器自动拉取脚本
# 由 systemd timer (mindlink-deploy.timer) 每 2 分钟调用一次
#
# 工作原理：
#   1. 用 flock 锁防止并发
#   2. git fetch 远程最新 commit
#   3. 与本地 HEAD 比对 · 相同则静默退出
#   4. 不同则：硬重置 → docker compose up -d --build → smoke test
#   5. 全程追加到 /var/log/mindlink-deploy.log

set -euo pipefail

DEPLOY_DIR=${DEPLOY_DIR:-/opt/mindlink}
BRANCH=${BRANCH:-main}
COMPOSE_FILE=${COMPOSE_FILE:-docker-compose.test.yml}
LOG_FILE=${LOG_FILE:-/var/log/mindlink-deploy.log}
LOCK_FILE=${LOCK_FILE:-/var/run/mindlink-deploy.lock}

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

# 锁：同一时刻只跑一个实例（否则 2 分钟间隔下 build 可能叠加）
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  # 另一个实例正在跑 · 静默退出
  exit 0
fi

cd "$DEPLOY_DIR"

# 抓远程最新
git fetch --quiet origin "$BRANCH"

LOCAL_SHA=$(git rev-parse HEAD)
REMOTE_SHA=$(git rev-parse "origin/$BRANCH")

if [ "$LOCAL_SHA" = "$REMOTE_SHA" ]; then
  # 已是最新 · 静默退出不写日志（否则 log 会很吵）
  exit 0
fi

log "=========================================="
log "检测到新 commit：${LOCAL_SHA:0:7} → ${REMOTE_SHA:0:7}"
log "=========================================="

# 记录将要应用的提交信息
log "新 commit 摘要："
git log --oneline "${LOCAL_SHA}..${REMOTE_SHA}" | tee -a "$LOG_FILE"

# 硬重置到远程
log "git reset --hard origin/$BRANCH"
git reset --hard "origin/$BRANCH"

# 重建 + 启动
log "docker compose -f $COMPOSE_FILE up -d --build"
docker compose -f "$COMPOSE_FILE" up -d --build 2>&1 | tee -a "$LOG_FILE"

# 清理悬空镜像
docker image prune -f 2>&1 | tail -2 | tee -a "$LOG_FILE"

# 等 API 起来
log "等 API 健康检查（最多 60s）"
OK=0
for i in $(seq 1 20); do
  if curl -fsS http://localhost:3000/api/v1/health >/dev/null 2>&1; then
    OK=1
    break
  fi
  sleep 3
done

if [ "$OK" = "1" ]; then
  log "✓ 部署成功 · HEAD=${REMOTE_SHA:0:7}"
else
  log "✗ API 60s 内未响应 · 最近 30 行 api 日志："
  docker compose -f "$COMPOSE_FILE" logs --tail 30 api 2>&1 | tee -a "$LOG_FILE"
  exit 1
fi
