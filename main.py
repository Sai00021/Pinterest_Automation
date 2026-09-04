import argparse
import logging
import json
from pinterest_client import PinterestClient
from ai_generator import AIGenerator
from image_processor import ImageProcessor
from content_source import ContentSourceManager
from duplicate import DuplicateDetector
from core_config import Config
from database_helper import init_db

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("PinterestAutomation")

def run_pipeline(dry_run: bool):
    config = Config()
    init_db() # Ensure DB exists

    client = PinterestClient(access_token=config.PINTEREST_ACCESS_TOKEN)
    ai = AIGenerator(provider=config.AI_PROVIDER, api_key=config.AI_API_KEY)
    detector = DuplicateDetector(db_path=config.DB_PATH)

    # Example ingestion - ensure content.csv exists
    items = ContentSourceManager.load_from_csv("content.csv")
    logger.info(f"Loaded {len(items)} items to process.")

    for item in items:
        # Duplicate check needs image too, but using topics for now
        if detector.check_duplicate(item.topic, item.custom_description or "", item.link, None):
            logger.info(f"Skipping duplicate: {item.topic}")
            continue

        # Generate SEO content
        pin_content = ai.generate_pin_content(item.topic)

        # Process image
        img_path = "temp_pin.jpg"
        ImageProcessor.create_text_pin(pin_content['title'], img_path)

        # Publish/DryRun
        if dry_run:
            logger.info(f"[DRY-RUN] Title: {pin_content['title']}")
            logger.info(f"[DRY-RUN] Description: {pin_content['description']}")
            detector.record_publication("dry_run_id", pin_content['title'], pin_content['description'], item.link, img_path, "dry_run_board", status="DRY_RUN")
        else:
            try:
                # Need a board ID from config
                res = client.create_pin("YOUR_BOARD_ID", pin_content['title'], pin_content['description'], item.link,
                                        {"source_type": "image_url", "url": "https://via.placeholder.com/1000x1500"}) # Simplified
                detector.record_publication(res['id'], pin_content['title'], pin_content['description'], item.link, img_path, "YOUR_BOARD_ID")
                logger.info(f"Successfully published: {pin_content['title']}")
            except Exception as e:
                logger.error(f"Failed to publish {item.topic}: {e}")
                detector.record_publication("failure", pin_content['title'], pin_content['description'], item.link, img_path, "YOUR_BOARD_ID", status="FAILED", error=str(e))

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    try:
        run_pipeline(args.dry_run)
    except Exception as e:
        logger.error(f"Pipeline crashed: {e}")

if __name__ == "__main__":
    main()
