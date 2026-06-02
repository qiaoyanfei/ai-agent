#!/bin/bash
# Android 真机连接后端。WiFi 方式无需本脚本；仅 USB 且不用局域网 IP 时执行 adb reverse。
set -euo pipefail
export PATH="${ANDROID_HOME:-$HOME/Library/Android/sdk}/platform-tools:$PATH"
adb reverse tcp:8000 tcp:8000
echo "adb reverse 已设置。请用: flutter run --dart-define=ANDROID_API_HOST=127.0.0.1"
adb reverse --list
