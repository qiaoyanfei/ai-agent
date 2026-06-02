#!/usr/bin/env bash
# 将 flutter build ios --no-codesign 的产物打成 AltStore 可用的未签名 IPA
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MOBILE="$ROOT/mobile"
APP="$MOBILE/build/ios/iphoneos/Runner.app"
OUT_DIR="$MOBILE/build/altstore-ipa"
IPA="$OUT_DIR/zhiku-altstore.ipa"

if [ ! -d "$APP" ]; then
  echo "未找到 $APP"
  echo "请先执行："
  echo "  cd mobile && flutter build ios --release --no-codesign --dart-define=API_HOST=192.168.1.8"
  exit 1
fi

rm -rf "$MOBILE/build/altstore-payload" "$OUT_DIR"
mkdir -p "$MOBILE/build/altstore-payload/Payload" "$OUT_DIR"
cp -R "$APP" "$MOBILE/build/altstore-payload/Payload/Runner.app"
(
  cd "$MOBILE/build/altstore-payload"
  zip -qr "$IPA" Payload
)

echo "已生成: $IPA"
ls -lh "$IPA"
