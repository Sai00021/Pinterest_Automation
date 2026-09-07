-- Initial Database Schema for Pinterest Automation

CREATE TABLE IF NOT EXISTS content_items (
    id TEXT PRIMARY KEY,
    topic TEXT NOT NULL,
    link TEXT,
    custom_title TEXT,
    custom_description TEXT,
    image_url TEXT,
    source_type TEXT DEFAULT 'manual',
    status TEXT DEFAULT 'READY', -- DRAFT, READY, SCHEDULED, PUBLISHING, PUBLISHED, SKIPPED, FAILED
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pins (
    id TEXT PRIMARY KEY,
    pinterest_pin_id TEXT UNIQUE,
    content_item_id TEXT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    destination_url TEXT,
    image_url TEXT NOT NULL,
    board_id TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    image_hash TEXT,
    status TEXT NOT NULL, -- DRY_RUN, PUBLISHED, FAILED
    published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (content_item_id) REFERENCES content_items(id)
);

CREATE TABLE IF NOT EXISTS publishing_attempts (
    id TEXT PRIMARY KEY,
    pin_id TEXT,
    content_hash TEXT NOT NULL,
    image_hash TEXT,
    destination_url TEXT,
    status TEXT NOT NULL, -- SUCCESS, FAILED, DUPLICATE_SKIPPED, DRY_RUN
    error_message TEXT,
    attempt_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS boards (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    privacy TEXT DEFAULT 'PUBLIC',
    last_synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    level TEXT NOT NULL,
    message TEXT NOT NULL,
    context TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pins_content_hash ON pins(content_hash);
CREATE INDEX IF NOT EXISTS idx_pins_image_hash ON pins(image_hash);
CREATE INDEX IF NOT EXISTS idx_pins_destination_url ON pins(destination_url);
CREATE INDEX IF NOT EXISTS idx_pins_published_at ON pins(published_at);
CREATE INDEX IF NOT EXISTS idx_content_status ON content_items(status);
