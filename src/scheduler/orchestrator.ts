import { Env, PinVariant } from './types';
import { PinterestClient } from './pinterest/client';
import { D1Repository } from './database/repository';
import { AmazonClient } from './amazon/client';
import { AmazonAutomationProcessor } from './amazon/processor/automation';
import { createAIProvider } from './ai/provider';

export class AutomationOrchestrator {
  private repo: D1Repository;
  private pinterest: PinterestClient;
  private amazon: AmazonClient;
  private processor: AmazonAutomationProcessor;
  private env: Env;

  constructor(env: Env) {
    this.env = env;
    this.repo = new D1Repository(env.DB);
    this.pinterest = new PinterestClient(
      env.PINTEREST_ACCESS_TOKEN || '',
      env.PINTEREST_CLIENT_ID,
      env.PINTEREST_CLIENT_SECRET
    );
    this.amazon = new AmazonClient(env);
    const ai = createAIProvider(env.AI_PROVIDER, env.AI_API_KEY, env.AI_MODEL);
    this.processor = new AmazonAutomationProcessor(this.repo, ai, this.amazon, env);
  }

  async run(): Promise<any> {
    const results: any = {
      discovery: 0,
      variants: 0,
      published: 0,
      errors: []
    };

    try {
      // 1. Sync Amazon Products (if needed - e.g., once a day or on a subset of runs)
      // For now, we'll run discovery if we have no active products or periodically
      results.discovery = await this.processor.discoverAndSyncProducts(this.env.NICHE || 'trending electronics');

      // 2. Generate new Pin Variants
      results.variants = await this.processor.generateVariants();

      // 3. Publish pending pins
      const targetPerRun = 1; // Simplify: publish 1 pin per cron run to stay safe
      for (let i = 0; i < targetPerRun; i++) {
        const variant = await this.repo.getNextPendingPinVariant();
        if (!variant) break;

        try {
          if (String(this.env.DRY_RUN).toLowerCase() === 'true') {
            await this.repo.updatePinVariantStatus(variant.id, 'DRY_RUN');
            results.published++;
            continue;
          }

          const pin = await this.pinterest.createPin({
            board_id: variant.board_id,
            title: variant.title,
            description: variant.description,
            link: `https://www.amazon.com/dp/${variant.product_asin}?tag=${this.env.AMAZON_ASSOCIATE_TAG}`,
            media_source: {
              source_type: 'image_url',
              url: variant.image_url
            }
          });

          await this.repo.updatePinVariantStatus(variant.id, 'PUBLISHED', pin.id);
          results.published++;
        } catch (error: any) {
          console.error(`Failed to publish pin for variant ${variant.id}:`, error);
          await this.repo.updatePinVariantStatus(variant.id, 'FAILED', undefined, error.message);
          results.errors.push({ id: variant.id, error: error.message });
        }
      }

    } catch (error: any) {
      console.error('Automation run failed:', error);
      results.errors.push({ global: error.message });
    }

    return results;
  }
}
