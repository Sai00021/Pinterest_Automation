import sqlite3
import os
from dataclasses import dataclass

# Fallback or simple config for testing
@dataclass
class Config:
    DB_PATH: str = "pinterest_automation.db"

def init_db():
    config = Config()
    conn = sqlite3.connect(config.DB_PATH)
    cursor = conn.cursor()
    # Create tables
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS pin_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pin_id TEXT,
            content_hash TEXT,
            image_hash TEXT,
            title TEXT,
            description TEXT,
            board_id TEXT,
            destination_url TEXT,
            published_at DATETIME,
            status TEXT,
            error TEXT
        )
    """)
    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print(f"Database initialized at {Config().DB_PATH}")
