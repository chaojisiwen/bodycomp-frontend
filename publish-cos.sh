#!/bin/bash
# ============================================================
# bodycomp-frontend 一键发布脚本
#
# 用法：
#   ./publish-cos.sh              # 构建并上传，不刷新 CDN
#   ./publish-cos.sh --refresh    # 构建、上传、刷新 CDN 缓存
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "========================================"
echo " bodycomp-frontend 一键发布"
echo "========================================"
echo ""

# Step 1: 构建（跳过 tsc 类型检查，直接 vite build）
echo "[1/2] 构建前端..."
cd "$SCRIPT_DIR"
npx vite build
echo "✅ 构建完成"
echo ""

# Step 2: 上传到 COS（Python SDK，无需 coscli）
echo "[2/2] 上传到 COS..."
python3 "$SCRIPT_DIR/publish-cos.py" "$@"

if [ $? -ne 0 ]; then
  echo "❌ 上传失败"
  exit 1
fi
