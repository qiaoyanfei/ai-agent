#!/usr/bin/env bash
# 前台启动，能看到拉镜像/构建日志（不要用 -d 以为没反应）
set -e
cd "$(dirname "$0")/.."

echo "==> 检查 Docker 引擎..."
docker info >/dev/null 2>&1 || {
  echo "请先打开 Docker Desktop，等鲸鱼图标显示 Running"
  exit 1
}

echo "==> 启动服务（前台模式，Ctrl+C 可停）..."
echo "    另开终端可看日志: docker compose logs -f"
echo ""

docker compose up --build
