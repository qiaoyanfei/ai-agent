#!/bin/bash
# CocoaPods for system Ruby 2.6 (macOS Monterey). Run in Terminal: bash scripts/install-cocoapods.sh
set -euo pipefail

export http_proxy="${http_proxy:-http://127.0.0.1:8118}"
export https_proxy="${https_proxy:-http://127.0.0.1:8118}"
export HTTP_PROXY="${HTTP_PROXY:-$http_proxy}"
export HTTPS_PROXY="${HTTPS_PROXY:-$https_proxy}"

echo "==> Installing CocoaPods 1.11.3 (Ruby 2.6 compatible)..."
sudo gem install ffi -v 1.15.5
sudo gem install activesupport -v 6.1.7.8
sudo gem install cocoapods-core -v 1.11.3
sudo gem install cocoapods-downloader -v 1.6.3
sudo gem install cocoapods -v 1.11.3

echo ""
echo "==> Done. Version:"
pod --version
echo ""
echo "Next: cd mobile/ios && pod install"
