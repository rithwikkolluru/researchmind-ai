from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "ResearchMind AI"
    DEBUG: bool = True

    HOST: str = "0.0.0.0"
    PORT: int = 8000

    DATABASE_URL: str = "sqlite:///./researchmind.db"

    GEMINI_API_KEY: str = ""

    SECRET_KEY: str = "researchmind_secret"

    ALGORITHM: str = "HS256"

    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    class Config:
        env_file = ".env"


settings = Settings()