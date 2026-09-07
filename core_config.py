import os
from dataclasses import dataclass
from typing import Optional

@dataclass
class Config:
    # Pinterest
    PINTEREST_CLIENT_ID: str = os.getenv("PINTEREST_CLIENT_ID", "")
    PINTEREST_CLIENT_SECRET: str = os.getenv("PINTEREST_CLIENT_SECRET", "")
    PINTEREST_ACCESS_TOKEN: str = os.getenv("PINTEREST_ACCESS_TOKEN", "")
    PINTEREST_REFRESH_TOKEN: str = os.getenv("PINTEREST_REFRESH_TOKEN", "")

    # App
    DRY_RUN: bool = os.getenv("DRY_RUN", "true").lower() == "true"
    POSTS_PER_DAY: int = int(os.getenv("POSTS_PER_DAY", "10"))
    TIMEZONE: str = os.getenv("TIMEZONE", "Asia/Kolkata")

    # Storage
    DB_PATH: str = "pinterest_automation.db"

    # AI
    AI_PROVIDER: str = os.getenv("AI_PROVIDER", "anthropic")
    AI_API_KEY: str = os.getenv("AI_API_KEY", "")
