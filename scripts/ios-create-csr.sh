#!/usr/bin/env bash
# 在 Mac 上生成 Apple 开发证书用的 CSR（无需 Team ID）
set -euo pipefail

OUT="${1:-$HOME/Desktop/ZhikuCertRequest}"
mkdir -p "$(dirname "$OUT")"

echo "将打开「钥匙串访问」— 请按提示操作："
echo "  菜单：钥匙串访问 → 证书助理 → 从证书颁发机构请求证书"
echo "  - 用户电子邮件：填你的常用邮箱"
echo "  - 常用名称：如 Yanfei Qiao"
echo "  - 选择「存储到磁盘」"
echo "  - 保存为: CertificateSigningRequest.certSigningRequest"
echo ""
echo "完成后到 developer.apple.com → Certificates → + → Apple Development → 上传该 CSR"
echo ""

open -a "Keychain Access"
