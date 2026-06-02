#!/usr/bin/env bash
# 知库 iOS 真机：检查环境并尝试安装（需先在 Xcode 配置 Signing Team）
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MOBILE="$ROOT/mobile"
FLUTTER="${FLUTTER:-$HOME/development/flutter/bin/flutter}"
API_HOST="${API_HOST:-$(ipconfig getifaddr en0 2>/dev/null || echo 192.168.1.8)}"

unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY ALL_PROXY all_proxy 2>/dev/null || true

export PATH="$HOME/development/flutter/bin:/Applications/Xcode.app/Contents/Developer/usr/bin:$PATH"

echo "=== 1. 后端 health (局域网) ==="
curl --noproxy '*' -sf "http://${API_HOST}:8000/health" && echo " OK (${API_HOST})" || echo " 失败：请先 docker compose up -d"

echo ""
echo "=== 2. Flutter 设备 ==="
"$FLUTTER" devices --device-timeout 15

IOS_ID=$("$FLUTTER" devices --device-timeout 15 2>/dev/null | grep -E 'ios|iPhone|iPad' | grep -v Simulator | head -1 | awk '{print $NF}' || true)

if [[ -z "$IOS_ID" ]]; then
  echo ""
  echo "未检测到 iOS 真机。请确认："
  echo "  • 数据线支持数据传输（非仅充电线）"
  echo "  • iPhone 已解锁，弹出「信任此电脑」时点信任"
  echo "  • 换 USB 口后执行: flutter devices"
  echo ""
  echo "然后在 Xcode 打开并配置签名："
  echo "  open $MOBILE/ios/Runner.xcworkspace"
  exit 1
fi

echo ""
echo "=== 3. 使用设备: $IOS_ID ==="
cd "$MOBILE/ios" && pod install
cd "$MOBILE"
"$FLUTTER" run -d "$IOS_ID" --dart-define=API_HOST="$API_HOST"
