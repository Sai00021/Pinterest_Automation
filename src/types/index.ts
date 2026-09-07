import { R2Bucket, D1Database } from '@cloudflare/workers-types';

export interface Env {
  DB: D1Database;
  R2_BUCKET?: R2Bucket;
  PINTEREST_CLIENT_ID?: string;
  PINTEREST_CLIENT_SECRET?: string;
  PINTEREST_ACCESS_TOKEN?: string;
  PINTEREST_REFRESH_TOKEN?: string;
  AMAZON_ASSOCIATE_TAG?: string;
  AMAZON_ACCESS_KEY?: string;
  AMAZON_SECRET_KEY?: string;
  AI_API_KEY?: string;
  ADMIN_API_KEY?: string;

  // Non-secrets (Vars)
  TIMEZONE?: string;
  POSTS_PER_DAY?: string;
  DRY_RUN?: string;
  SCHEDULE_MODE?: string;
  BRAND_NAME?: string;
  NICHE?: string;
  CONTENT_LANGUAGE?: string;
  DEFAULT_BOARD_ID?: string;
  AI_PROVIDER?: string;
  AI_MODEL?: string;
}

export interface ContentItem {
  id: string;
  topic: string;
  link?: string | null;
  custom_title?: string | null;
  custom_description?: string | null;
  image_url?: string | null;
  source_type: string;
  status: 'DRAFT' | 'READY' | 'SCHEDULED' | 'PUBLISHING' | 'PUBLISHED' | 'SKIPPED' | 'FAILED';
  created_at?: string;
  updated_at?: string;
}

export interface PinRecord {
  id: string;
  pinterest_pin_id?: string | null;
  content_item_id?: string | null;
  title: string;
  description: string;
  destination_url?: string | null;
  image_url: string;
  board_id: string;
  content_hash: string;
  image_hash?: string | null;
  status: 'DRY_RUN' | 'PUBLISHED' | 'FAILED';
  published_at?: string;
}

export interface BoardRecord {
  id: string;
  name: string;
  description?: string | null;
  privacy?: string;
  last_synced_at?: string;
}

export interface PublishingAttempt {
  id: string;
  pin_id?: string | null;
  content_hash: string;
  image_hash?: string | null;
  destination_url?: string | null;
  status: 'SUCCESS' | 'FAILED' | 'DUPLICATE_SKIPPED' | 'DRY_RUN';
  error_message?: string | null;
  attempt_timestamp?: string;
}

export interface AmazonProduct {
  asin: string;
  title: string;
  description?: string | null;
  features?: string[] | null;
  category?: string | null;
  price?: number | null;
  currency?: string | null;
  rating?: number | null;
  reviews_count?: number | null;
  image_url: string;
  additional_images?: string[] | null;
  detail_page_url: string;
  affiliate_url: string;
  keywords?: string[] | null;
  is_active: boolean;
  last_synced_at?: string;
  created_at?: string;
}

export interface PinVariant {
  id: string;
  product_asin: string;
  title: string;
  description: string;
  keywords?: string[] | null;
  call_to_action?: string | null;
  image_url: string;
  board_id: string;
  content_hash: string;
  image_hash?: string | null;
  status: 'PENDING' | 'SCHEDULED' | 'PUBLISHED' | 'FAILED' | 'SKIPPED' | 'DRY_RUN';
  scheduled_for?: string | null;
  published_at?: string | null;
  pinterest_pin_id?: string | null;
  error_message?: string | null;
  created_at?: string;
  updated_at?: string;
}
