import { Env, AmazonProduct, PinVariant } from '../../types';
import { D1Repository } from '../../database/repository';
import { AIProvider } from '../../ai/provider';
import { AmazonClient } from '../client';
import { AmazonSearchItem } from '../types';

export class AmazonAutomationProcessor {
  private repo: D1Repository;
  private ai: AIProvider;
  private amazon: AmazonClient;
  private env: Env;

  constructor(repo: D1Repository, ai: AIProvider, amazon: AmazonClient, env: Env) {
    this.repo = repo;
    this.ai = ai;
    this.amazon = amazon;
    this.env = env;
  }

  /**
   * Discovers products on Amazon and syncs them to D1.
   */
  async discoverAndSyncProducts(keywords: string): Promise<number> {
    const response = await this.amazon.searchProducts(keywords);
    const items = response.SearchItemsResponse.SearchResult.Items || [];

    for (const item of items) {
      const product: AmazonProduct = {
        asin: item.ASIN,
        title: item.ItemInfo.Title.DisplayValue,
        description: item.ItemInfo.Features?.DisplayValues.join('. '),
        features: item.ItemInfo.Features?.DisplayValues || [],
        category: item.BrowseNodeInfo?.BrowseNodes?.[0]?.DisplayName,
        price: item.Offers?.Listings?.[0]?.Price?.Amount,
        currency: item.Offers?.Listings?.[0]?.Price?.Currency,
        image_url: item.Images?.Primary?.Large?.URL || '',
        detail_page_url: item.DetailPageURL,
        affiliate_url: item.DetailPageURL, // In production, construct with associate tag
        is_active: true,
      };

      await this.repo.addAmazonProduct(product);
    }

    return items.length;
  }

  /**
   * Generates Pinterest variants for active Amazon products.
   */
  async generateVariants(): Promise<number> {
    const products = await this.repo.getActiveAmazonProducts(5);
    let generatedCount = 0;

    for (const product of products) {
      // 1. Check if we already have enough variants for this product
      // (Simplified: just check for overall duplicate content hash)

      // 2. Generate content using AI
      const aiContent = await this.ai.generatePinVariant(
        product.title,
        product.description || product.title,
        this.env.BRAND_NAME,
        this.env.NICHE
      );

      const contentHash = await this.generateHash(aiContent.title + aiContent.description + product.affiliate_url);

      if (await this.repo.isVariantDuplicate(contentHash)) {
        console.log(`Skipping duplicate variant for ASIN: ${product.asin}`);
        continue;
      }

      // 3. Create Pin Variant
      const variant: Omit<PinVariant, 'id' | 'created_at' | 'updated_at'> = {
        product_asin: product.asin,
        title: aiContent.title,
        description: aiContent.description,
        keywords: aiContent.keywords,
        image_url: product.image_url,
        board_id: this.env.DEFAULT_BOARD_ID || 'default',
        content_hash: contentHash,
        status: 'PENDING',
      };

      await this.repo.createPinVariant(variant);
      generatedCount++;
    }

    return generatedCount;
  }

  private async generateHash(text: string): Promise<string> {
    const msgUint8 = new TextEncoder().encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}
