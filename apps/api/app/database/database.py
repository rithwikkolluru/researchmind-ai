from sqlmodel import SQLModel, create_engine

from app.core.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    echo=True
)


def create_db():
    SQLModel.metadata.create_all(engine)
    