# iOS 免费安装：AltStore（C 方案）

不付 Apple Developer Program 年费（¥688），也不在 GitHub 配置签名 Secrets。  
在 GitHub 云端打出 **未签名 IPA**，用 **AltStore + 免费 Apple ID** 装到 iPhone。

| 项目 | 说明 |
|------|------|
| 费用 | ¥0（免费 Apple ID 即可） |
| 你的 2015 Mac | 不必升级系统、不必 Xcode 16 |
| 证书有效期 | 约 **7 天**，需在 AltStore 里 **Refresh** |
| 同时安装数量 | 免费账号约 **3 个** App 槽位 |
| Bundle ID | `com.aiagent.mindVault`（与工程一致） |

付费签名 + 云端 IPA 见 [IOS_CI.md](./IOS_CI.md)（可选，非本方案）。

---

## 一、在 GitHub 打出 IPA

1. 打开：  
   https://github.com/qiaoyanfei/ai-agent/actions/workflows/ios-altstore-ipa.yml  
2. 点 **Run workflow**  
3. `api_host` 填你电脑的 **局域网 IP**（手机和电脑同一 WiFi，例如 `192.168.1.8`）  
4. 等约 10–20 分钟，运行变绿 ✓  
5. 进入该次运行 → **Artifacts** → 下载 **zhiku-ios-altstore-ipa**（内有 `zhiku-altstore.ipa`）

改 API 地址后需重新 Run workflow 并重新安装。

---

## 二、准备 AltStore（电脑 + iPhone）

官方站点：https://altstore.io  

### 1. 电脑安装 AltServer

- **Windows**：按官网装 AltServer；通常还需 [iTunes](https://www.apple.com/itunes/) 与 [iCloud  Windows](https://www.apple.com/icloud/setup/windows.html)（与 AltStore 文档一致）  
- **Mac**：下载 AltServer，拖到「应用程序」  

电脑与 iPhone 须 **同一 WiFi**（USB 安装 AltStore 时也可插线）。

### 2. iPhone 安装 AltStore 本体

1. 电脑运行 **AltServer**（菜单栏/托盘里要有图标）  
2. 用数据线连接 iPhone（首次较稳），在手机上 **信任此电脑**  
3. AltServer 菜单 → **Install AltStore** → 选你的 iPhone  
4. 输入 **免费 Apple ID**（与 App Store 相同即可，不必付费开发者）  
5. iPhone：**设置 → 通用 → VPN 与设备管理** → 信任 AltStore 开发者  

若提示已达 3 个 App 上限，先在 AltStore 里删掉不用的应用再装。

---

## 三、把知库 IPA 装进 iPhone

任选一种：

### 方式 A：电脑 AltServer 侧载（推荐）

1. 解压 Artifact，得到 `zhiku-altstore.ipa`  
2. AltServer 菜单 → **Sideload .ipa…**（或 **Install .ipa**）  
3. 选 `zhiku-altstore.ipa`，同一 Apple ID 登录  
4. 等完成后，主屏幕出现 **知库**

### 方式 B：传到手机后用 AltStore 打开

1. 用 **隔空投送 / 文件 / 微信** 把 `zhiku-altstore.ipa` 弄到 iPhone  
2. 用 **文件** 打开 → 分享 → **AltStore** → Install  

---

## 四、安装后必做

1. **续签（约每 7 天）**  
   - 打开 AltStore → **Refresh All**  
   - 电脑 AltServer 保持运行，且与手机 **同一 WiFi**  

2. **访问后端**  
   - 手机与运行 Docker/API 的电脑 **同一 WiFi**  
   - `api_host` 须填电脑局域网 IP，不能填 `127.0.0.1`  
   - 在 iPhone Safari 试：`http://你的IP:8000/health` 应返回正常  

3. **信任与权限**  
   - 若 App 闪退：检查 VPN 与设备管理里是否仍信任  
   - 首次打开允许网络访问  

---

## 五、常见问题

| 现象 | 处理 |
|------|------|
| AltServer 找不到设备 | 换 USB；Windows 确认 iTunes/iCloud 已装；解锁手机 |
| `Could not connect to AltServer` | 同一 WiFi；关 VPN；电脑 AltServer 是否在运行 |
| 安装失败 / 已达上限 | 免费 ID 同时约 3 个应用，删掉旧的再装 |
| App 7 天后打不开 | AltStore → Refresh All（AltServer 要开着） |
| 知库连不上 API | 核对 workflow 里的 `api_host`；后端是否 `:8000` 监听 `0.0.0.0` |
| 想改 API 地址 | 重新 Run workflow → 下载新 ipa → 再侧载（会覆盖同 Bundle ID） |

---

## 六、与付费 CI 方案对比

| | AltStore（本文） | [IOS_CI.md](./IOS_CI.md) 签名 IPA |
|--|------------------|-----------------------------------|
| 年费 | 无 | Apple Developer Program |
| GitHub Secrets | 不需要 | 5 项 |
| 续期 | 约 7 天手动 Refresh | 证书 1 年 |
| 适合 | 自用、偶尔测 iPhone | 长期 iOS、上架、TestFlight |

---

## 七、本地打包（可选，需 macOS + Xcode）

若已有未签名 `Runner.app`，可在仓库根目录执行：

```bash
./scripts/package-altstore-ipa.sh
```

产物：`mobile/build/altstore-ipa/zhiku-altstore.ipa`（需先 `flutter build ios --release --no-codesign`）。
