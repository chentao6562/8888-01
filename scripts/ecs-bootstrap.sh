#!/usr/bin/env bash
# MindLink 测试服务器一键初始化脚本
#
# 用法（在阿里云 ECS 上执行）：
#   # 方式 1：先 clone 后跑
#   cd /opt && git clone https://github.com/chentao6562/8888-01.git mindlink
#   bash /opt/mindlink/scripts/ecs-bootstrap.sh
#
#   # 方式 2：一行流（需 ECS 能访问 raw.githubusercontent.com）
#   curl -fsSL https://raw.githubusercontent.com/chentao6562/8888-01/main/scripts/ecs-bootstrap.sh | bash
#
# 幂等：已装的跳过，已 clone 的 pull 最新。

set -euo pipefail

REPO_URL=${REPO_URL:-https://github.com/chentao6562/8888-01.git}
DEPLOY_DIR=${DEPLOY_DIR:-/opt/mindlink}
COMPOSE_FILE=docker-compose.test.yml

echo "============================================"
echo "  MindLink ECS Bootstrap"
echo "  Repo:   $REPO_URL"
echo "  Target: $DEPLOY_DIR"
echo "============================================"
echo ""

# --- 1/7 包管理缓存 ---
echo "==> 1/7 dnf makecache"
dnf makecache -y >/dev/null 2>&1 || yum makecache -y >/dev/null 2>&1 || true

# --- 2/7 装基础工具 ---
echo "==> 2/7 安装 git / curl / openssl"
dnf install -y git curl openssl >/dev/null 2>&1 \
  || yum install -y git curl openssl >/dev/null 2>&1

# --- 3/7 装 docker + 配国内镜像加速 ---
echo "==> 3/7 安装 docker"
if ! command -v docker >/dev/null 2>&1; then
  dnf install -y docker >/dev/null 2>&1 \
    || yum install -y docker >/dev/null 2>&1
fi

# 配国内 registry 加速（1Mbps 带宽下首次 build 必要）
mkdir -p /etc/docker
if [ ! -f /etc/docker/daemon.json ]; then
  cat > /etc/docker/daemon.json <<'EOF'
{
  "registry-mirrors": [
    "https://registry.cn-hangzhou.aliyuncs.com",
    "https://docker.mirrors.ustc.edu.cn"
  ],
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "3" }
}
EOF
  systemctl daemon-reload 2>/dev/null || true
fi
systemctl enable docker >/dev/null 2>&1 || true
systemctl restart docker

# --- 4/7 装 docker compose v2 plugin ---
echo "==> 4/7 docker compose plugin"
if ! docker compose version >/dev/null 2>&1; then
  mkdir -p /usr/local/lib/docker/cli-plugins
  curl -fsSL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
    -o /usr/local/lib/docker/cli-plugins/docker-compose
  chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
fi
docker compose version

# --- 5/7 克隆 / 更新仓库 ---
echo "==> 5/7 克隆仓库"
if [ ! -d "$DEPLOY_DIR/.git" ]; then
  mkdir -p "$(dirname "$DEPLOY_DIR")"
  git clone "$REPO_URL" "$DEPLOY_DIR"
else
  echo "    已存在 · 拉最新"
  cd "$DEPLOY_DIR" && git fetch origin main && git reset --hard origin/main
fi
cd "$DEPLOY_DIR"
echo "    当前 commit: $(git rev-parse --short HEAD)"

# --- 6/7 生成 .env（若不存在） ---
echo "==> 6/7 检查 .env"
if [ ! -f .env ]; then
  JWT_SECRET=$(openssl rand -hex 32)
  ENCRYPTION_KEY=$(openssl rand -base64 32)
  DB_PASSWORD=$(openssl rand -hex 16)
  REDIS_PASSWORD=$(openssl rand -hex 16)
  PUBLIC_IP=$(curl -s --max-time 3 ifconfig.me || echo "39.104.101.12")
  cat > .env <<EOF
# MindLink 测试服务器 · 由 ecs-bootstrap.sh 首次生成 · $(date '+%Y-%m-%d %H:%M:%S')
NODE_ENV=production
API_PORT=3000

JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=30d

ENCRYPTION_KEY=$ENCRYPTION_KEY

CORS_ALLOWED_ORIGINS=http://$PUBLIC_IP,http://localhost:5173

DB_DRIVER=postgres
DB_HOST=postgres
DB_PORT=5432
DB_DATABASE=mindlink
DB_USERNAME=mindlink
DB_PASSWORD=$DB_PASSWORD

REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=$REDIS_PASSWORD

# Provider：测试阶段全部走 mock；上真账号时改值
LLM_PROVIDER=mock
WECHAT_PROVIDER=mock
ESIGN_PROVIDER=mock

# 生产关 Swagger · 测试开
SWAGGER_ENABLED=1
EOF
  chmod 600 .env
  echo "    ✓ .env 已生成（随机密钥 · chmod 600）"
else
  echo "    ✓ .env 已存在，跳过"
fi

# --- 7/7 启动容器 ---
echo "==> 7/7 docker compose up -d --build"
docker compose -f "$COMPOSE_FILE" up -d --build

echo ""
echo "==> 等待 API 健康检查（最多 60s）"
for i in $(seq 1 20); do
  if curl -fsS http://localhost:3000/api/v1/health >/dev/null 2>&1; then
    echo "    ✓ API OK"
    API_OK=1
    break
  fi
  printf "    .%.0s" "$i"
  sleep 3
done
echo ""

if [ -z "${API_OK:-}" ]; then
  echo "✗ API 60s 内未响应 · 查日志：docker compose -f $COMPOSE_FILE logs api"
  exit 1
fi

WEB_CODE=$(curl -s -o /dev/null -w '%{http_code}' http://localhost/ || echo "000")
echo "    ✓ Web HTTP $WEB_CODE"

PUBLIC_IP=$(curl -s --max-time 3 ifconfig.me || echo "<ECS公网IP>")
echo ""
echo "============================================"
echo "  ✓ Bootstrap 完成"
echo "============================================"
echo "  API:     http://$PUBLIC_IP:3000/api/v1/health"
echo "  Web:     http://$PUBLIC_IP/"
echo "  Swagger: http://$PUBLIC_IP:3000/api/docs"
echo ""
echo "  下一步："
echo "  1. 回 GitHub Settings → Secrets 添加：ECS_HOST / ECS_USER / ECS_PASSWORD"
echo "  2. 本地 push 任意改动到 main，GitHub Actions 会自动部署到这台 ECS"
echo ""
echo "  首次 seed 数据（可选）："
echo "  docker compose -f $COMPOSE_FILE exec api node apps/api/dist/seeds/phase-1.js"
echo "============================================"
