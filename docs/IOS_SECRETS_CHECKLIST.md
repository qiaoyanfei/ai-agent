# iOS 云端打包 — 你提供这些，我帮你核对

## 当前进度

- [x] iPhone UDID：`00008030-000C153E0203802E`
- [ ] Team ID（待你提供）
- [ ] CSR → 开发证书 → p12
- [ ] 描述文件 `.mobileprovision`
- [ ] GitHub 5 个 Secrets
- [ ] Run workflow 下载 IPA

按顺序完成，每步做完可在对话里告诉我「第 N 步好了」。

## 第 1 步：Team ID（待发我）

1. 打开 https://developer.apple.com/account  
2. 登录 Apple ID  
3. **Membership** → 复制 **Team ID**（10 位）  

发我：`Team ID = __________`（你说稍后再弄，可先跳过）

---

## 第 2 步：iPhone UDID（已完成）

`00008030-000C153E0203802E` — guomeng的 iPhone (iOS 18.1.1)

---

## 第 3 步：在开发者网站创建（做完说一声）

| 项目 | 操作 |
|------|------|
| App ID | Identifiers → **+** → App IDs → Bundle ID：`com.aiagent.mindVault` |
| 设备 | Devices → **+** → 填第 2 步 UDID |
| 证书 | Certificates → **+** → **Apple Development** → 用钥匙串「证书助理」生成 CSR → 下载 .cer → 双击安装 |
| 描述文件 | Profiles → **+** → **iOS App Development** → 选 App ID、证书、你的 iPhone → 下载 `.mobileprovision` |

### 导出 p12

1. 打开 **钥匙串访问** → **我的证书**  
2. 找到 **Apple Development: 你的名字**（左边有展开箭头）  
3. 右键该证书（或含私钥的那一行）→ **导出** → 格式 **p12**，设密码（记住，即 `IOS_P12_PASSWORD`）  

得到两个文件，例如：

- `~/Downloads/zhiku-dev.p12`
- `~/Downloads/zhiku-dev.mobileprovision`

**不要把 p12 提交到 GitHub 仓库。** 只用于生成 Secret。

---

## 第 4 步：生成 GitHub Secrets（本地执行，把结果贴到 GitHub）

在终端（路径按你实际文件名改）：

```bash
cd /Users/yanfeiqiao/Documents/project/ai-agent
./scripts/prepare-github-ios-secrets.sh ~/Downloads/zhiku-dev.p12 ~/Downloads/zhiku-dev.mobileprovision
```

打开生成的 `.ios-secrets-export/` 里两个 txt，全选复制到：

https://github.com/qiaoyanfei/ai-agent/settings/secrets/actions

| Secret | 内容 |
|--------|------|
| `IOS_P12_BASE64` | IOS_P12_BASE64.txt 全文 |
| `IOS_P12_PASSWORD` | 导出 p12 时设的密码 |
| `IOS_PROFILE_BASE64` | IOS_PROFILE_BASE64.txt 全文 |
| `APPLE_TEAM_ID` | 第 1 步 Team ID |
| `KEYCHAIN_PASSWORD` | 自设，如 `ZhikuCi2024!` |

---

## 第 5 步：触发打包

https://github.com/qiaoyanfei/ai-agent/actions/workflows/ios-build.yml → **Run workflow** → `api_host` 填 `192.168.1.8`（或你 Mac 当前 IP）

完成后 **Artifacts** 下载 `zhiku-ios-ipa`。

---

## 我帮你核对时请发

- Team ID  
- UDID（若与第 2 步不同）  
- 是否已在开发者网站创建 App ID / 设备 / 证书 / Profile  
- Actions 运行链接（若失败）
