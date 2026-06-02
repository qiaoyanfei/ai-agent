#!/usr/bin/env bash
# 在本机构建可安装到真机的 IPA（需先在 Xcode 登录 Apple ID 并选择 Team）
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MOBILE="$ROOT/mobile"
API_HOST="${API_HOST:-$(ipconfig getifaddr en0 2>/dev/null || echo 192.168.1.8)}"
FLUTTER="${FLUTTER:-$HOME/development/flutter/bin/flutter}"

export PATH="$HOME/development/flutter/bin:/Applications/Xcode.app/Contents/Developer/usr/bin:$PATH"
unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY ALL_PROXY all_proxy 2>/dev/null || true

if ! security find-identity -v -p codesigning 2>/dev/null | grep -q "Apple Development\|Apple Distribution"; then
  echo "未检测到 iOS 签名证书。"
  echo "正在打开 Xcode，请完成签名配置后重新运行本脚本。"
  echo ""
  echo "操作步骤："
  echo "  1. Runner → Signing & Capabilities"
  echo "  2. 勾选 Automatically manage signing"
  echo "  3. Team 选择你的 Apple ID（Personal Team）"
  echo "  4. 用数据线连接 iPhone，等待 Xcode 注册设备"
  echo ""
  open "$MOBILE/ios/Runner.xcworkspace"
  exit 1
fi

echo "API_HOST=$API_HOST"
cd "$MOBILE/ios" && pod install
cd "$MOBILE"

"$FLUTTER" build ipa --release --dart-define=API_HOST="$API_HOST"

IPA="$(find build/ios/ipa -name '*.ipa' 2>/dev/null | head -1)"
if [[ -z "$IPA" ]]; then
  echo "未找到 IPA，请检查构建日志。"
  exit 1
fi

mkdir -p "$ROOT/dist"
OUT="$ROOT/dist/zhiku-install.ipa"
cp "$IPA" "$OUT"
echo ""
echo "✓ 可安装 IPA 已生成:"
echo "  $OUT"
echo ""
echo "安装方式：Xcode → Window → Devices and Simulators → 选中 iPhone → 点 + 选该 ipa"
echo "或 Apple Configurator 拖入安装。安装后需在 设置→通用→VPN与设备管理 中信任开发者。"
