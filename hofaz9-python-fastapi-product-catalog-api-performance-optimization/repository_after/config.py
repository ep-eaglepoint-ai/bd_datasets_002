from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://user:password@localhost:5432/catalog"
    redis_url: str = "redis://localhost:6379"
    cache_ttl: int = 60
    debug: bool = True
    
    class Config:
        env_file = ".env"


settings = Settings()
