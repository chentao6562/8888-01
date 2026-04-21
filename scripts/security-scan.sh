#!/usr/bin/env bash
# MindLink · 上线前静态安全扫描
# 7 项检查 · 任一失败 → 退出码非 0
#
# 用法：bash scripts/security-scan.sh

set -u
PASS=0
FAIL=0

REPO_ROOT="c:/Users/Administrator/Desktop/代运营协同系统"
SRC="$REPO_ROOT/apps/api/src"

ok() { PASS=$((PASS+1)); echo "  ✓ $1"; }
bad() { FAIL=$((FAIL+1)); echo "  ✗ $1"; }

echo "=== MindLink Pre-Launch Security Scan ==="
echo ""

# G.1 TODO/FIXME/XXX 数量阈值
COUNT=$(grep -rE 'TODO|FIXME|XXX' "$SRC" --include='*.ts' 2>/dev/null | wc -l)
if [ "$COUNT" -le 30 ]; then
  ok "G.1 TODO/FIXME/XXX 数量 = $COUNT (≤30)"
else
  bad "G.1 TODO/FIXME/XXX 过多 = $COUNT (>30) · 上线前清理"
fi

# G.2 console.log/error/info 出现在 src/ · 应全用 NestJS Logger
# 例外白名单：main.ts（启动日志）· seeds/（种子打印）· staff.controller invite log（已脱敏）· wechat.service mock log
ALLOW_GREP='main\.ts|seeds/|staff\.controller\.ts|wechat\.service\.ts|client\.service\.ts|llm/.*\.service'
RAW=$(grep -rEn 'console\.(log|info|error|warn)' "$SRC" --include='*.ts' 2>/dev/null | grep -vE "$ALLOW_GREP" || true)
if [ -z "$RAW" ]; then
  ok "G.2 console.* 调用全部在白名单内"
else
  COUNT=$(echo "$RAW" | wc -l)
  bad "G.2 console.* 调用越权 ($COUNT 处)"
  echo "$RAW" | head -10 | sed 's/^/      /'
fi

# G.3 硬编码弱口令 / 默认密钥（白名单：encryption / configuration / data-source / main / seeds）
LEAKS=$(grep -rEn "mindlink-dev|Passw0rd!|mindlink_dev" "$SRC" --include='*.ts' 2>/dev/null \
  | grep -vE 'encryption\.service\.ts|configuration\.ts|data-source\.ts|main\.ts|/seeds/' || true)
if [ -z "$LEAKS" ]; then
  ok "G.3 硬编码弱口令仅在 dev fallback 路径"
else
  COUNT=$(echo "$LEAKS" | wc -l)
  bad "G.3 弱口令泄漏 ($COUNT 处) · 仅允许出现在 encryption.service / configuration"
  echo "$LEAKS" | head -10 | sed 's/^/      /'
fi

# G.4 .env / secret 不在 git 跟踪范围
if [ -f "$REPO_ROOT/.gitignore" ]; then
  if grep -qE '^\.env|^\*\.env' "$REPO_ROOT/.gitignore"; then
    ok "G.4 .env 已在 .gitignore"
  else
    bad "G.4 .env 未在 .gitignore"
  fi
else
  bad "G.4 .gitignore 不存在"
fi

# G.5 @Public() 端点白名单一致
EXPECTED_PUBLIC="$REPO_ROOT/docs/security/public-endpoints.md"
ACTUAL=$(grep -rEn '^\s*@Public\(\)' "$SRC" --include='*.ts' 2>/dev/null | wc -l)
if [ -f "$EXPECTED_PUBLIC" ]; then
  EXPECTED=$(grep -cE '^- ' "$EXPECTED_PUBLIC" 2>/dev/null || echo 0)
  if [ "$ACTUAL" -eq "$EXPECTED" ]; then
    ok "G.5 @Public() 端点数 = $ACTUAL · 与白名单一致"
  else
    bad "G.5 @Public() 数量 ($ACTUAL) ≠ 白名单 ($EXPECTED)"
  fi
else
  bad "G.5 白名单文件 docs/security/public-endpoints.md 不存在"
fi

# G.6 Dockerfile / K8s yaml 不含真实凭据模式
SECRETS=$(grep -rEn '(SECRET|PASSWORD|API_KEY|APP_SECRET)\s*[:=]\s*[A-Za-z0-9]{12,}' \
  "$REPO_ROOT/infra" "$REPO_ROOT/.github" 2>/dev/null \
  | grep -vE 'change-me|<.*>|placeholder|example|secretKeyRef|configMapRef' || true)
if [ -z "$SECRETS" ]; then
  ok "G.6 Dockerfile/K8s yaml 无真实凭据"
else
  bad "G.6 疑似硬编码凭据"
  echo "$SECRETS" | head -5 | sed 's/^/      /'
fi

# G.7 JWT_SECRET / dev fallback 仅在 configuration.ts
WEAK_JWT=$(grep -rEn "JWT_SECRET.*['\"]dev['\"]|JWT_SECRET.*''" "$SRC" --include='*.ts' 2>/dev/null \
  | grep -vE 'configuration\.ts' || true)
if [ -z "$WEAK_JWT" ]; then
  ok "G.7 JWT_SECRET dev fallback 仅在 configuration.ts"
else
  bad "G.7 JWT_SECRET dev fallback 出现在多处"
  echo "$WEAK_JWT" | head -5 | sed 's/^/      /'
fi

echo ""
echo "================================================"
echo "通过 $PASS · 失败 $FAIL"
echo "================================================"

if [ "$FAIL" -gt 0 ]; then exit 1; fi
exit 0
