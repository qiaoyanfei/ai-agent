# iOS 云端打包（GitHub Actions）

本机 Mac 较旧（macOS 12 + Xcode 14）无法直接调试 iOS 18 真机时，可用 GitHub Actions 在 **macos-14** 上构建 IPA，再装到 iPhone。

## 1. 触发构建

1. 将代码推到 GitHub
2. 打开仓库 **Actions** → **iOS Build** → **Run workflow**
3. `api_host` 填你电脑的局域网 IP（默认 `192.168.1.8`）
4. 等待完成后在 **Artifacts** 下载

推送 `mobile/**` 变更到 `main` / `master` 也会自动触发。

## 2. 配置签名（才能装到真机）

在 GitHub 仓库 **Settings → Secrets and variables → Actions** 添加：

| Secret | 说明 |
|--------|------|
| `IOS_P12_BASE64` | 开发或 Ad Hoc 证书导出的 `.p12` 做 base64 |
| `IOS_P12_PASSWORD` | 导出 p12 时设置的密码 |
| `IOS_PROFILE_BASE64` | 描述文件 `.mobileprovision` 做 base64 |
| `APPLE_TEAM_ID` | [开发者账号](https://developer.apple.com/account) 里的 10 位 Team ID |
| `KEYCHAIN_PASSWORD` | 任意强密码（仅 CI 临时钥匙串用） |

### 证书与描述文件（简要）

1. [Apple Developer](https://developer.apple.com/account) → **Certificates** → 创建 **Apple Development**（或 Distribution + Ad Hoc）
2. **Identifiers** → App ID，Bundle ID 与工程一致：`com.aiagent.mindVault`
3. **Devices** → 注册 iPhone UDID（Xcode 窗口或 [Apple Configurator](https://apps.apple.com/app/apple-configurator/id1037126344) 查看）
4. **Profiles** → **iOS App Development**（或 Ad Hoc）→ 选 App ID、证书、设备 → 下载 `.mobileprovision`
5. 在 Mac 钥匙串导出 `.p12`（含私钥）

### 生成 base64（在 Mac 终端）

```bash
base64 -i cert.p12 | pbcopy          # 粘贴到 IOS_P12_BASE64
base64 -i profile.mobileprovision | pbcopy   # 粘贴到 IOS_PROFILE_BASE64
```

## 3. 安装到 iPhone

1. 下载 Artifact **zhiku-ios-ipa**（`.ipa`）
2. 任选其一：
   - **Apple Configurator**：连接 iPhone → 添加 App → 选 ipa
   - **Xcode**（15+）：Window → Devices and Simulators → 设备安装
   - 第三方工具（需自行评估风险）：如 Sideloadly 等
3. 手机与电脑 **同一 WiFi**，App 内 API 指向构建时填的 `api_host`，后端在 Mac 上 `docker compose up`

首次安装后：**设置 → 通用 → VPN 与设备管理** → 信任开发者。

## 4. 未配置 Secrets 时

仅产出 **zhiku-ios-unsigned**（未签名 `.app` 压缩包），无法直接装到手机，需在 **Xcode 15+** 的 Mac 上打开工程签名。

## 5. 常见问题

- **Profile 不包含设备**：重新生成描述文件并勾选当前 iPhone UDID
- **Bundle ID 不一致**：Xcode / CI 使用 `com.aiagent.mindVault`
- **装完连不上后端**：确认 `api_host`、防火墙、手机与 Mac 同网段
