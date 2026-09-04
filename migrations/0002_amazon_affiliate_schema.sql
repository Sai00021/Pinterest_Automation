-- Migration for Amazon Affiliate -> Pinterest Automation System

CREATE TABLE IF NOT EXISTS amazon_products (
    asin TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    features TEXT, -- JSON array of product bullet points
    category TEXT,
    price REAL,
    currency TEXT DEFAULT 'USD',
    rating REAL,
    reviews_count INTEGER DEFAULT 0,
    image_url TEXT NOT NULL,
    additional_images TEXT, -- JSON array of image URLs
    detail_page_url TEXT NOT NULL,
    affiliate_url TEXT NOT NULL,
    keywords TEXT, -- Comma-separated or JSON tags
    is_active INTEGER DEFAULT 1,
    last_synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pin_variants (
    id TEXT PRIMARY KEY,
    product_asin TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    keywords TEXT, -- JSON array of hashtags/keywords
    call_to_action TEXT,
    image_url TEXT NOT NULL,
    board_id TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    image_hash TEXT,
    status TEXT DEFAULT 'PENDING', -- PENDING, SCHEDULED, PUBLISHED, FAILED, SKIPPED, DRY_RUN
    scheduled_for TIMESTAMP,
    published_at TIMESTAMP,
    pinterest_pin_id TEXT UNIQUE,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_asin) REFERENCES amazon_products(asin)
);

CREATE TABLE IF NOT EXISTS rate_limits (
    provider TEXT PRIMARY KEY, -- 'amazon', 'pinterest', 'ai'
    requests_this_hour INTEGER DEFAULT 0,
    requests_today INTEGER DEFAULT 0,
    last_reset_hour TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_reset_day TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_amazon_products_active ON amazon_products(is_active);
CREATE INDEX IF NOT EXISTS idx_amazon_products_category ON amazon_products(category);
CREATE INDEX IF NOT EXISTS idx_pin_variants_status ON pin_variants(status);
CREATE INDEX IF NOT EXISTS idx_pin_variants_asin ON pin_variants(product_asin);
CREATE INDEX IF NOT EXISTS idx_pin_variants_content_hash ON pin_variants(content_hash);
CREATE INDEX IF NOT EXISTS idx_pin_variants_image_hash ON pin_variants(image_hash);
CREATE INDEX IF NOT EXISTS idx_pin_variants_scheduled ON pin_variants(scheduled_for);
