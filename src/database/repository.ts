import { Env, ContentItem, PinRecord, BoardRecord, PublishingAttempt, AmazonProduct, PinVariant } from '../types';

export class D1Repository {
  private db: D1Database;

  constructor(db: D1Database) {
    this.db = db;
  }

  // --- Amazon Products ---
  async addAmazonProduct(product: AmazonProduct): Promise<void> {
    await this.db
      .prepare(`
        INSERT INTO amazon_products (
          asin, title, description, features, category, price, currency,
          rating, reviews_count, image_url, additional_images, detail_page_url,
          affiliate_url, keywords, is_active
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(asin) DO UPDATE SET
          title=excluded.title,
          description=excluded.description,
          features=excluded.features,
          price=excluded.price,
          rating=excluded.rating,
          reviews_count=excluded.reviews_count,
          last_synced_at=CURRENT_TIMESTAMP
      `)
      .bind(
        product.asin,
        product.title,
        product.description || null,
        product.features ? JSON.stringify(product.features) : null,
        product.category || null,
        product.price || null,
        product.currency || 'USD',
        product.rating || null,
        product.reviews_count || 0,
        product.image_url,
        product.additional_images ? JSON.stringify(product.additional_images) : null,
        product.detail_page_url,
        product.affiliate_url,
        product.keywords ? JSON.stringify(product.keywords) : null,
        product.is_active ? 1 : 0
      )
      .run();
  }

  async getActiveAmazonProducts(limit: number = 10): Promise<AmazonProduct[]> {
    const results = await this.db
      .prepare("SELECT * FROM amazon_products WHERE is_active = 1 ORDER BY last_synced_at ASC LIMIT ?")
      .bind(limit)
      .all<any>();

    return (results.results || []).map(r => ({
      ...r,
      is_active: Boolean(r.is_active),
      features: r.features ? JSON.parse(r.features) : [],
      additional_images: r.additional_images ? JSON.parse(r.additional_images) : [],
      keywords: r.keywords ? JSON.parse(r.keywords) : []
    }));
  }

  // --- Pin Variants ---
  async createPinVariant(variant: Omit<PinVariant, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    const id = crypto.randomUUID();
    await this.db
      .prepare(`
        INSERT INTO pin_variants (
          id, product_asin, title, description, keywords, call_to_action,
          image_url, board_id, content_hash, image_hash, status, scheduled_for
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        id,
        variant.product_asin,
        variant.title,
        variant.description,
        variant.keywords ? JSON.stringify(variant.keywords) : null,
        variant.call_to_action || null,
        variant.image_url,
        variant.board_id,
        variant.content_hash,
        variant.image_hash || null,
        variant.status || 'PENDING',
        variant.scheduled_for || null
      )
      .run();
    return id;
  }

  async getNextPendingPinVariant(): Promise<PinVariant | null> {
    const result = await this.db
      .prepare("SELECT * FROM pin_variants WHERE status IN ('PENDING', 'SCHEDULED') ORDER BY created_at ASC LIMIT 1")
      .first<any>();

    if (!result) return null;

    return {
      ...result,
      keywords: result.keywords ? JSON.parse(result.keywords) : []
    };
  }

  async updatePinVariantStatus(id: string, status: PinVariant['status'], pinterestPinId?: string, error?: string): Promise<void> {
    await this.db
      .prepare(`
        UPDATE pin_variants
        SET status = ?,
            pinterest_pin_id = COALESCE(?, pinterest_pin_id),
            error_message = ?,
            published_at = CASE WHEN ? = 'PUBLISHED' THEN CURRENT_TIMESTAMP ELSE published_at END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `)
      .bind(status, pinterestPinId || null, error || null, status, id)
      .run();
  }

  async isVariantDuplicate(contentHash: string, imageHash?: string | null): Promise<boolean> {
    const contentCheck = await this.db
      .prepare("SELECT 1 FROM pin_variants WHERE content_hash = ? AND status = 'PUBLISHED' LIMIT 1")
      .bind(contentHash)
      .first();

    if (contentCheck) return true;

    if (imageHash) {
      const imageCheck = await this.db
        .prepare("SELECT 1 FROM pin_variants WHERE image_hash = ? AND status = 'PUBLISHED' LIMIT 1")
        .bind(imageHash)
        .first();
      if (imageCheck) return true;
    }

    return false;
  }

  async getRecentPins(limit: number = 20): Promise<any[]> {
    const results = await this.db
      .prepare("SELECT * FROM pin_variants ORDER BY created_at DESC LIMIT ?")
      .bind(limit)
      .all();
    return results.results || [];
  }

  // --- Content Items ---
  async getNextReadyContent(): Promise<ContentItem | null> {
    const result = await this.db
      .prepare("SELECT * FROM content_items WHERE status = 'READY' ORDER BY created_at ASC LIMIT 1")
      .first<ContentItem>();
    return result || null;
  }

  async updateContentStatus(id: string, status: ContentItem['status']): Promise<void> {
    await this.db
      .prepare("UPDATE content_items SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .bind(status, id)
      .run();
  }

  async addContentItem(item: Omit<ContentItem, 'id' | 'status' | 'created_at' | 'updated_at'>): Promise<string> {
    const id = crypto.randomUUID();
    await this.db
      .prepare(`
        INSERT INTO content_items (id, topic, link, custom_title, custom_description, image_url, source_type, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'READY')
      `)
      .bind(
        id,
        item.topic,
        item.link || null,
        item.custom_title || null,
        item.custom_description || null,
        item.image_url || null,
        item.source_type || 'manual'
      )
      .run();
    return id;
  }

  // --- Pins ---
  async createPinRecord(pin: Omit<PinRecord, 'id' | 'published_at'>): Promise<string> {
    const id = crypto.randomUUID();
    await this.db
      .prepare(`
        INSERT INTO pins (id, pinterest_pin_id, content_item_id, title, description, destination_url, image_url, board_id, content_hash, image_hash, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        id,
        pin.pinterest_pin_id || null,
        pin.content_item_id || null,
        pin.title,
        pin.description,
        pin.destination_url || null,
        pin.image_url,
        pin.board_id,
        pin.content_hash,
        pin.image_hash || null,
        pin.status
      )
      .run();
    return id;
  }

  async isDuplicate(contentHash: string, imageHash?: string | null): Promise<boolean> {
    const contentCheck = await this.db
      .prepare("SELECT 1 FROM pins WHERE content_hash = ? AND status = 'PUBLISHED' LIMIT 1")
      .bind(contentHash)
      .first();

    if (contentCheck) return true;

    if (imageHash) {
      const imageCheck = await this.db
        .prepare("SELECT 1 FROM pins WHERE image_hash = ? AND status = 'PUBLISHED' LIMIT 1")
        .bind(imageHash)
        .first();
      if (imageCheck) return true;
    }

    return false;
  }

  async getPublishedCountToday(): Promise<number> {
    const result = await this.db
      .prepare("SELECT COUNT(*) as count FROM pins WHERE status = 'PUBLISHED' AND DATE(published_at) = DATE('now')")
      .first<{ count: number }>();
    return result?.count ?? 0;
  }

  async getStats(): Promise<{ published: number; dry_run: number; failed: number; total_content: number }> {
    const published = (await this.db.prepare("SELECT COUNT(*) as count FROM pins WHERE status = 'PUBLISHED'").first<{ count: number }>())?.count ?? 0;
    const dry_run = (await this.db.prepare("SELECT COUNT(*) as count FROM pins WHERE status = 'DRY_RUN'").first<{ count: number }>())?.count ?? 0;
    const failed = (await this.db.prepare("SELECT COUNT(*) as count FROM pins WHERE status = 'FAILED'").first<{ count: number }>())?.count ?? 0;
    const total_content = (await this.db.prepare("SELECT COUNT(*) as count FROM content_items").first<{ count: number }>())?.count ?? 0;

    return { published, dry_run, failed, total_content };
  }

  // --- Attempts / Logs ---
  async recordAttempt(attempt: Omit<PublishingAttempt, 'id' | 'attempt_timestamp'>): Promise<void> {
    const id = crypto.randomUUID();
    await this.db
      .prepare(`
        INSERT INTO publishing_attempts (id, pin_id, content_hash, image_hash, destination_url, status, error_message)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        id,
        attempt.pin_id || null,
        attempt.content_hash,
        attempt.image_hash || null,
        attempt.destination_url || null,
        attempt.status,
        attempt.error_message || null
      )
      .run();
  }

  async log(level: string, message: string, context?: any): Promise<void> {
    await this.db
      .prepare("INSERT INTO app_logs (level, message, context) VALUES (?, ?, ?)")
      .bind(level, message, context ? JSON.stringify(context) : null)
      .run();
  }
}
