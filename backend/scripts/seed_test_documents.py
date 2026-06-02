"""向知识库写入测试文档。运行: docker compose exec api python scripts/seed_test_documents.py"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlmodel import Session, select

from app.core.config import settings
from app.db.session import engine
from app.models import Collection, Document, DocumentStatus
from app.services.document_processor import process_document

COLLECTION_ID = 1

SAMPLE_FILES = {
    "flutter入门.md": """# Flutter 入门笔记

Flutter 是 Google 推出的跨平台 UI 框架，使用 Dart 语言。

## 核心概念
- Widget：一切皆组件
- State：StatefulWidget 与 StatelessWidget
- Hot Reload：保存代码后快速刷新界面

## 常用命令
flutter pub get / flutter run / flutter doctor

适合构建 iOS、Android、Web 和桌面应用。
""",
    "知库使用说明.md": """# 知库 使用说明

知库是 AI 知识库问答助手，支持上传 PDF、TXT、Markdown 文档。

## 功能
1. 注册/登录账号
2. 创建知识库
3. 上传文档，后台自动切片与向量化
4. 基于 RAG 的问答，回答会引用文档片段

## API
默认后端 http://127.0.0.1:8000，在知识库详情进入问答即可聊天。
""",
    "通义千问配置.txt": """通义千问 DashScope OpenAI 兼容配置

BASE_URL: https://dashscope.aliyuncs.com/compatible-mode/v1
对话模型: qwen-plus
向量模型: text-embedding-v3
向量维度: 1024

在 .env 设置 OPENAI_API_KEY。上传文档后会调用 embedding 写入 pgvector。
""",
    "docker部署.md": """# Docker 部署

启动: docker compose up -d

服务: api(8000), db(pgvector), redis

健康检查: curl http://127.0.0.1:8000/health

上传文件目录 ./uploads，数据库 volume pgdata。
""",
}


async def main() -> None:
    with Session(engine) as session:
        col = session.get(Collection, COLLECTION_ID)
        if not col:
            print(f"知识库 id={COLLECTION_ID} 不存在")
            sys.exit(1)
        print(f"知识库: {col.name} (id={col.id})")

        for filename, content in SAMPLE_FILES.items():
            existing = session.exec(
                select(Document).where(
                    Document.collection_id == COLLECTION_ID,
                    Document.filename == filename,
                )
            ).first()
            if existing and existing.status == DocumentStatus.ready:
                print(f"跳过: {filename}")
                continue

            if existing:
                doc = existing
                doc.status = DocumentStatus.pending
                doc.error_message = ""
            else:
                doc = Document(
                    collection_id=COLLECTION_ID,
                    filename=filename,
                    content_type="text/markdown" if filename.endswith(".md") else "text/plain",
                    status=DocumentStatus.pending,
                )
            session.add(doc)
            session.commit()
            session.refresh(doc)

            dest_dir = Path(settings.upload_dir) / str(COLLECTION_ID) / str(doc.id)
            dest_dir.mkdir(parents=True, exist_ok=True)
            (dest_dir / filename).write_text(content, encoding="utf-8")
            print(f"处理: {filename} (id={doc.id})")
            await process_document(session, doc.id)
            session.refresh(doc)
            status = doc.status.value if hasattr(doc.status, "value") else doc.status
            print(f"  -> {status}" + (f" {doc.error_message}" if doc.error_message else ""))

    print("完成。在 App 知识库详情下拉刷新。")


if __name__ == "__main__":
    asyncio.run(main())
