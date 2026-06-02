from sqlalchemy import text
from sqlmodel import Session, SQLModel, create_engine

from app.core.config import settings

engine = create_engine(settings.database_url, echo=False)


def init_db() -> None:
    with engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        conn.commit()
    SQLModel.metadata.create_all(engine)
    _migrate_chunk_columns()


def _migrate_chunk_columns() -> None:
    """Add citation jump columns to existing databases."""
    statements = [
        "ALTER TABLE documentchunk ADD COLUMN IF NOT EXISTS char_start INTEGER DEFAULT 0",
        "ALTER TABLE documentchunk ADD COLUMN IF NOT EXISTS char_end INTEGER DEFAULT 0",
        "ALTER TABLE documentchunk ADD COLUMN IF NOT EXISTS page_start INTEGER DEFAULT 1",
        "ALTER TABLE documentchunk ADD COLUMN IF NOT EXISTS page_end INTEGER DEFAULT 1",
    ]
    with engine.connect() as conn:
        for stmt in statements:
            conn.execute(text(stmt))
        conn.commit()


def get_session():
    with Session(engine) as session:
        yield session
