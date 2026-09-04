import { ContentItem, PinPost, PinStatus } from "../types";
import { Repository } from "../database/repository";
import { AIProvider } from "../ai/provider";
import { ImageProcessor } from "../images/processor";
import { DuplicateDetector } from "../duplicate/detector";
import { Config } from "../config";

export class ContentManager {
  private repository: Repository;
  private aiProvider: AIProvider;
  private config: Config;

  constructor(repository: Repository, aiProvider: AIProvider, config: Config) {
    this.repository = repository;
    this.aiProvider = aiProvider;
    this.config = config;
  }

  /**
   * Processes a raw content item through generation, image processing, validation, and duplicate checking.
   * @returns A PinPost object if successful, or null if skipped/failed.
   */
  async processContentItem(rawItem: ContentItem): Promise<PinPost | null> {
    // 1. Content Generation (if needed)
    const aiGeneratedContent = await this.aiProvider.generatePinContent(
      rawItem.topic,
      this.config.BRAND_NAME,
      this.config.NICHE
    );

    const title = rawItem.custom_title || aiGeneratedContent.title;
    const description = rawItem.custom_description || aiGeneratedContent.description;
    const destinationUrl = rawItem.link || this.config.WEBSITE_URL;
    const altText = aiGeneratedContent.alt_text;

    // 2. Image Acquisition/Generation
    let imageUrl: string | undefined;
    let imageHash: string | undefined;

    if (rawItem.image_url) {
      imageUrl = rawItem.image_url;
      // TODO: Fetch and hash image if not local/R2
      // For now, assuming URL can be directly used or R2 will handle it
    } else {
      // Generate a text-based image for now as a fallback/template
      // In a real R2 setup, this would save to R2 and get a public URL
      // For Workers, we'd need to upload generated image to R2 or use an external image generation service.
      console.log("Generating placeholder text pin.");
      // For now, we'll assume the ImageProcessor will generate a URL or base64 directly usable by Pinterest
      // For Cloudflare Workers, a direct image generation to base64 or R2 upload is required.
      // Simplified for now: assume image URL from an external source or a pre-generated one.
      // This part needs a concrete R2 or external image service integration.
      imageUrl = "https://via.placeholder.com/1000x1500?text=Pinterest+Automation";
    }

    // 3. Validation (simplified - more robust validation needed)
    if (!title || !description) {
      console.warn(`Skipping item due to missing title or description: ${rawItem.topic}`);
      await this.repository.recordPublishAttempt({
        contentHash: null,
        imageHash: null,
        status: PinStatus.SKIPPED,
        error: "Missing title or description",
        scheduledAt: new Date(),
        title: rawItem.topic,
        description: "",
        boardId: this.config.DEFAULT_BOARD_ID,
        destinationUrl: destinationUrl,
      });
      return null;
    }

    // 4. Duplicate Check
    const contentHash = await DuplicateDetector.generateContentHash(title, description, destinationUrl);
    if (await this.repository.isDuplicate(contentHash)) {
      console.warn(`Skipping duplicate content: ${title}`);
      await this.repository.recordPublishAttempt({
        contentHash,
        imageHash: null, // Image hash not available yet for external images without fetching
        status: PinStatus.DUPLICATE,
        error: "Duplicate content detected",
        scheduledAt: new Date(),
        title: title,
        description: description,
        boardId: this.config.DEFAULT_BOARD_ID,
        destinationUrl: destinationUrl,
      });
      return null;
    }

    // If image hash is needed for duplicate detection, the image must be fetched and hashed here.
    // Given Cloudflare Workers, directly fetching and processing images for hashing would need a stream-based approach or R2.
    // For now, we proceed with content-based duplicate check.

    const pinPost: PinPost = {
      title,
      description,
      destinationUrl,
      boardId: this.config.DEFAULT_BOARD_ID, // Use configured default board
      imageUrl,
      altText,
      contentHash,
      imageHash: imageHash || null, // placeholder
      status: PinStatus.READY, // Mark as ready for scheduling
      scheduledAt: new Date(), // This will be updated by the scheduler
    };

    // Persist as READY in D1
    const generatedPinId = await this.repository.createGeneratedPin(pinPost);
    pinPost.id = generatedPinId; // Assign the ID from D1

    return pinPost;
  }

  async getPendingContent(): Promise<PinPost[]> {
    return this.repository.getGeneratedPinsByStatus(PinStatus.READY);
  }
}
