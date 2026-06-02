import httpx

from app.core.config import settings


class OpenAIClient:
    def __init__(self) -> None:
        self.base = settings.openai_base_url.rstrip("/")
        self.headers = {
            "Authorization": f"Bearer {settings.openai_api_key}",
            "Content-Type": "application/json",
        }

    async def embed(self, texts: list[str]) -> list[list[float]]:
        if not settings.openai_api_key:
            raise RuntimeError("请配置 OPENAI_API_KEY（通义千问 DashScope API Key）")
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(
                f"{self.base}/embeddings",
                headers=self.headers,
                json={
                    "model": settings.embedding_model,
                    "input": texts,
                    "dimensions": settings.embedding_dimensions,
                },
            )
            resp.raise_for_status()
            data = resp.json()["data"]
            return [item["embedding"] for item in sorted(data, key=lambda x: x["index"])]

    async def chat_stream(self, messages: list[dict]):
        if not settings.openai_api_key:
            raise RuntimeError("请配置 OPENAI_API_KEY（通义千问 DashScope API Key）")
        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream(
                "POST",
                f"{self.base}/chat/completions",
                headers=self.headers,
                json={
                    "model": settings.chat_model,
                    "messages": messages,
                    "stream": True,
                },
            ) as resp:
                resp.raise_for_status()
                async for line in resp.aiter_lines():
                    if not line or not line.startswith("data: "):
                        continue
                    payload = line[6:]
                    if payload.strip() == "[DONE]":
                        break
                    yield payload
