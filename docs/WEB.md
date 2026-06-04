# 知库 Web 端（React + Vite）

浏览器版知库，与 Flutter App、微信小程序共用 **同一套 FastAPI**。

## 技术栈

- **React 18** + **TypeScript**
- **Vite 5**（开发服务器 + 打包）
- **React Router 6**
- 原生 `fetch` + SSE 流式聊天（无额外 UI 库，样式与 App 靛蓝主题一致）

## 目录

```
web/
├── src/
│   ├── api/          # client.ts、chatStream.ts
│   ├── lib/          # auth、config、citation、format
│   ├── pages/        # 登录、知识库、详情、聊天、预览、设置
│   └── components/
├── vite.config.ts    # 开发代理 /api → :8000
└── package.json
```

## 本地运行（两种方式）

### 方式 A：和 backend 一样，全走 Docker（推荐对齐生产）

一条命令起 **db + redis + api + web**：

```bash
cd /Users/yanfeiqiao/Documents/project/ai-agent
docker compose up -d --build
```

浏览器打开 **http://localhost:8080**（Web），API 文档仍在 **http://127.0.0.1:8000/docs**。

原理：

```text
浏览器 :8080  →  web 容器 (Nginx)
                    ├─ /           → 静态文件（镜像内 npm run build 的 dist）
                    └─ /api/*      → 反代到 api:8000（同一 compose 网络）
```

改 Web 代码后需重新构建镜像：

```bash
docker compose up -d --build web
```

### 方式 B：仅后端 Docker，前端 Vite 热更新（日常改 UI）

```bash
docker compose up -d          # 只起 db/redis/api
cd web && npm install && npm run dev
```

浏览器 **http://localhost:5173**，Vite 把 `/api` 代理到 `127.0.0.1:8000`。

| 对比 | Docker web (:8080) | Vite dev (:5173) |
|------|--------------------|------------------|
| 是否要本机 Node | 构建镜像时要，运行时不要 | 要 |
| 是否热更新 | 否，改完需 rebuild | 是 |
| 和线上一致度 | 高（Nginx + /api） | 中（Vite 代理） |

## 生产构建与部署

```bash
cd web
# 与 API 同域可继续用 /api；分离部署时：
# echo 'VITE_API_BASE_URL=https://api.yourdomain.com' > .env.production
npm run build
```

产物在 `web/dist/`，由 Nginx 等托管静态文件；API 建议同域反代，见 `MINIPROGRAM.md` 发布章节。

## 功能对照

| 功能 | Web |
|------|-----|
| 登录 / 注册 | ✅ |
| 知识库列表 / 新建 | ✅ |
| 文档上传 / 删除 / 状态轮询 | ✅ |
| AI 问答流式 + 历史会话 | ✅ |
| 引用 `[n]` 预览 | 文本高亮 ✅；PDF iframe / 新标签 ✅ |
| 深色模式 | 未做（可后续加） |

## 与 App / 小程序

- 同一账号（`localStorage` 存 token）
- 业务与 `miniprogram/`、`mobile/` 对齐，接口以 `/docs` OpenAPI 为准
