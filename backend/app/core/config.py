from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    secret_key: str = "dev-secret-change-me"
    access_token_expire_minutes: int = 60 * 24 * 7

    database_url: str = "postgresql+psycopg://app:app@localhost:5432/knowledge"
    redis_url: str = "redis://localhost:6379/0"
    upload_dir: str = "./uploads"
    cors_origins: str = "http://127.0.0.1:8000,http://localhost:8000"

    # 通义千问 DashScope（OpenAI 兼容模式），Key 在 https://dashscope.console.aliyun.com 获取
    openai_api_key: str = ""
    openai_base_url: str = "https://dashscope.aliyuncs.com/compatible-mode/v1"
    chat_model: str = "qwen-plus"
    embedding_model: str = "text-embedding-v3"
    embedding_dimensions: int = 1024

    chunk_size: int = 800
    chunk_overlap: int = 100
    rag_top_k: int = 5

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
