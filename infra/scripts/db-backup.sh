#!/usr/bin/env bash
# 手动 PG 全量备份脚本（CronJob 替代时使用）
# 用法：bash infra/scripts/db-backup.sh

set -euo pipefail
DATE=$(date +%Y%m%d-%H%M)
OUT=${OUT_DIR:-/var/backups/mindlink}/mindlink-$DATE.dump.gz
mkdir -p "$(dirname "$OUT")"

PGPASSWORD="$DB_PASSWORD" pg_dump \
  -h "${DB_HOST:-localhost}" -p "${DB_PORT:-5432}" \
  -U "${DB_USERNAME:-mindlink}" -d "${DB_DATABASE:-mindlink}" \
  -Fc | gzip > "$OUT"

echo "✓ 备份完成 → $OUT ($(du -h "$OUT" | cut -f1))"

# 可选：上传到 OSS
if [ -n "${COS_BUCKET:-}" ]; then
  coscmd upload "$OUT" "/$COS_BUCKET/db-backups/" || echo "⚠️ COS 上传失败（请检查 coscmd 配置）"
fi
