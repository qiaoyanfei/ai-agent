# 知库 — 产品与学习路线

## 产品定位

**知库**（原 MindVault 代号）是一款 **个人 AI 知识库问答** App：上传文档 → 解析入库 → 基于 RAG 的可追溯问答。

## 当前版本能力（v1.0 目标）

| 模块 | 功能 |
|------|------|
| 账号 | 注册 / 登录 / 退出 |
| 知识库 | 创建、列表、详情 |
| 文档 | 上传 PDF/TXT/MD、解析状态轮询、删除 |
| 问答 | 流式 SSE、引用来源、Markdown 渲染、历史会话、**引用跳转原文**（TXT/MD 高亮 + PDF 页码） |
| 体验 | 深色模式、设置与关于、错误提示 |
| 跨端 | Flutter 双端；Android MethodChannel 示例 |

## 技术栈（对齐移动端面试能力）

- **Flutter**：Widget、StatefulWidget、go_router、Dio + SSE
- **Riverpod**：主题等全局状态
- **Platform Channel**：`NativeBridge`（设备/渠道信息）
- **后端**：FastAPI + JWT + pgvector RAG
- **工程**：`widget_test`、真机网络配置、Release 构建说明

## 后续迭代（v1.1+）

- 云端语音识别（DashScope ASR）
- 文档预览、知识库编辑/删除
- 会话删除、离线缓存
- iOS 原生模块扩展、HarmonyOS 调研
- CI（analyze / test / build apk）

## 本地运行

见仓库根目录 [README.md](../README.md)。
