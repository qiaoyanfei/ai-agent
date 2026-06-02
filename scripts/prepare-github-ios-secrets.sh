#!/usr/bin/env bash
# 将 p12 与 mobileprovision 转为 base64，便于粘贴到 GitHub Secrets
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "用法: $0 <cert.p12> <profile.mobileprovision>"
  echo ""
  echo "生成后请到 GitHub → Settings → Secrets → Actions 配置："
  echo "  IOS_P12_BASE64 / IOS_PROFILE_BASE64"
  exit 1
fi

P12="$1"
PP="$2"
OUT_DIR="$(cd "$(dirname "$0")/.." && pwd)/.ios-secrets-export"
mkdir -p "$OUT_DIR"

base64 -i "$P12" > "$OUT_DIR/IOS_P12_BASE64.txt"
base64 -i "$PP" > "$OUT_DIR/IOS_PROFILE_BASE64.txt"

echo "已写入（勿提交 git）："
echo "  $OUT_DIR/IOS_P12_BASE64.txt"
echo "  $OUT_DIR/IOS_PROFILE_BASE64.txt"
echo ""
echo "打开文件全选复制，分别粘贴到 GitHub Secrets。"
echo "另需设置: IOS_P12_PASSWORD, APPLE_TEAM_ID, KEYCHAIN_PASSWORD"
