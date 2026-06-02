# iOS 云端打包（GitHub Actions）— 可安装 IPA

你的 Mac（macOS 12 + Xcode 14）**无法**给 iOS 18 真机装调试包，但可以在 GitHub 上用 **macOS 15 + Xcode 16** 云端编译出 **已签名 IPA**，下载后装到 iPhone。

## 一、你要做的事（两步）

### 步骤 1：在 GitHub 配置 5 个 Secrets

打开：  
https://github.com/qiaoyanfei/ai-agent/settings/secrets/actions  

点 **New repository secret**，逐个添加：

| Secret 名称 | 填什么 |
|-------------|--------|
| `IOS_P12_BASE64` | 开发证书 `.p12` 整文件做 base64（见下文生成） |
| `IOS_P12_PASSWORD` | 导出 p12 时你设的密码 |
| `IOS_PROFILE_BASE64` | 描述文件 `.mobileprovision` 做 base64 |
| `APPLE_TEAM_ID` | Apple 开发者账号里的 **Team ID**（10 位字母数字） |
| `KEYCHAIN_PASSWORD` | 随便设一串强密码（仅 CI 用，如 `CiKeychain2024!`） |

### 步骤 2：手动触发构建

1. 打开 https://github.com/qiaoyanfei/ai-agent/actions/workflows/ios-build.yml  
2. 点 **Run workflow**  
3. `api_host` 填你电脑的局域网 IP（手机和 Mac 同一 WiFi，默认 `192.168.1.8`）  
4. 等约 10–20 分钟，绿色 ✓ 后进入该次运行 → **Artifacts** → 下载 **zhiku-ios-ipa**

---

## 二、证书与描述文件怎么弄（免费 Apple ID 即可）

需要 [Apple Developer](https://developer.apple.com/account) 登录（免费 Apple ID 也行）。

### 1. 查 Team ID

开发者网站右上角 **Membership** → **Team ID**（10 位）→ 填到 `APPLE_TEAM_ID`。

### 2. 注册 App ID

**Identifiers** → **+** → **App IDs** → Bundle ID 填：

`com.aiagent.mindVault`

（须与工程一致。）

### 3. 注册 iPhone

**Devices** → **+** → 填 iPhone **UDID**。

UDID 查看方式（任选）：

- 手机连 Mac，打开 Xcode → **Window → Devices and Simulators** → 选中设备复制 Identifier  
- 或 iPhone **设置 → 通用 → 关于本机**，部分版本可看到  

### 4. 创建证书并导出 p12

**Certificates** → **+** → **Apple Development** → 按向导在 Mac 上生成 CSR（钥匙串访问 → 证书助理 → 请求证书）→ 下载 `.cer` → 双击安装到钥匙串。

在 **钥匙串访问** → **我的证书** → 展开含 `Apple Development` 的条目 → 右键 **导出** → `.p12`，设密码（即 `IOS_P12_PASSWORD`）。

### 5. 创建描述文件

**Profiles** → **+** → **iOS App Development** → 选 App ID、证书、你的 iPhone → 下载 `.mobileprovision`。

### 6. 生成 base64 贴到 GitHub

在放有 `cert.p12` 和 `profile.mobileprovision` 的目录执行：

```bash
base64 -i cert.p12 | pbcopy
# → 粘贴到 Secret：IOS_P12_BASE64

base64 -i profile.mobileprovision | pbcopy
# → 粘贴到 Secret：IOS_PROFILE_BASE64
```

也可用仓库脚本（把文件路径作为参数）：

```bash
./scripts/prepare-github-ios-secrets.sh cert.p12 profile.mobileprovision
```

---

## 三、装到 iPhone

1. 下载 Artifact 里的 `.ipa`  
2. 用 **Apple Configurator 2**（App Store 免费）或借一台 **Xcode 15+** 的 Mac：  
   - Configurator：连接 iPhone → 添加 App → 选 ipa  
3. 手机与 Mac **同一 WiFi**；Mac 上 `docker compose up`，App 访问构建时填的 `api_host`  
4. 首次打开：**设置 → 通用 → VPN 与设备管理** → 信任你的开发者证书  

免费证书签名的 App 约 **7 天** 需重新打包安装。

---

## 四、未配置 Secrets 时

手动触发会直接 **失败并提示**，避免误以为未签名包能装到手机。  
推送代码自动触发的构建仍可能产出未签名包（仅用于检查编译，**不能安装**）。

---

## 五、常见问题

| 现象 | 处理 |
|------|------|
| Workflow 失败：signing / provisioning | 检查 5 个 Secret、Profile 是否包含本机 UDID、Bundle ID 是否一致 |
| 装完打不开 / 未信任 | 设置 → 通用 → VPN 与设备管理 → 信任 |
| App 连不上后端 | 确认 `api_host`、防火墙、手机与 Mac 同网段 |
| Profile 过期 | 开发者网站重新生成 Profile 并更新 `IOS_PROFILE_BASE64` |
