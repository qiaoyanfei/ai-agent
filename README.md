# 知库 — AI 知识库问答

> 产品代号曾用 MindVault；对外品牌名：**知库**。详见 [docs/PRODUCT.md](docs/PRODUCT.md)。

个人知识库 + RAG 问答，Flutter 客户端 + FastAPI 后端。

## 项目结构

```
ai-agent/
├── backend/          # FastAPI + RAG
├── mobile/           # Flutter (Riverpod + GoRouter + Dio)
├── docker-compose.yml
├── uploads/          # 上传文件
└── .env              # 环境变量（从 .env.example 复制）
```

## 快速开始

### 1. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env，填入 DashScope API Key（通义千问）和 SECRET_KEY
```

### 2. 启动后端（Docker）

确保 Docker Desktop 已运行，然后：

```bash
cd /Users/yanfeiqiao/Documents/project/ai-agent
# 推荐：前台启动，能看到拉镜像/构建日志
docker compose up --build
# 或: bash scripts/start.sh
```

**后台启动**（终端会立刻返回，日志要看 compose logs）：

```bash
docker compose up -d --build
docker compose logs -f api
```

#### `docker compose up -d` 好像没反应？

1. **`-d` 是后台模式**，本终端不会刷日志，属于正常现象。
2. 多数情况是卡在 **拉取 Docker Hub 镜像**（国内很慢或一直挂着）。处理：
   - Docker Desktop → **Settings → Docker Engine**，确认有 `registry-mirrors`（已为你在 `~/.docker/daemon.json` 加了国内镜像），点 **Apply & Restart**。
   - Settings → **Proxies**，填 `http://127.0.0.1:8118`（与终端代理一致）。
   - 重启 Docker 后执行：`docker compose pull`（应能看到 Pulling 进度），再 `docker compose up --build`。
3. 查看状态：`docker compose ps`、`docker compose logs api`。

API 文档：http://127.0.0.1:8000/docs

### 3. 启动 Flutter

```bash
cd mobile
flutter pub get
flutter run -d chrome   # 或 macos / android
```

修改 `mobile/lib/core/config.dart` 中的 `apiBaseUrl`（Android 模拟器用 `http://10.0.2.2:8000`）。

## 主要 API

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/auth/register` | 注册 |
| POST | `/auth/login` | 登录 |
| GET/POST | `/collections` | 知识库 |
| POST | `/collections/{id}/documents` | 上传文档 |
| POST | `/chat` | RAG 问答（SSE 流式） |

## 技术栈

- **后端**: FastAPI, SQLModel, PostgreSQL + pgvector, Redis, JWT
- **AI**: 通义千问（DashScope OpenAI 兼容接口），默认 `qwen-plus` + `text-embedding-v3`

### 千问模型配置（`.env`）

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `OPENAI_API_KEY` | — | [DashScope API Key](https://dashscope.console.aliyun.com/apiKey) |
| `OPENAI_BASE_URL` | `https://dashscope.aliyuncs.com/compatible-mode/v1` | 兼容模式地址 |
| `CHAT_MODEL` | `qwen-plus` | 可改为 `qwen-turbo`、`qwen-max` 等 |
| `EMBEDDING_MODEL` | `text-embedding-v3` | 向量模型 |
| `EMBEDDING_DIMENSIONS` | `1024` | 须与数据库向量维度一致 |

若曾用 OpenAI 维度 1536 建过表，需 `docker compose down -v` 后重建数据库，或把 `EMBEDDING_DIMENSIONS` 设为 `1536` 并在请求中保持一致。
- **前端**: Flutter 3.24, Riverpod, GoRouter, Dio

## 并行开发建议

- 后端 Agent：只改 `backend/`
- 前端 Agent：只改 `mobile/`
- 共用契约：以 `/docs` OpenAPI 为准
