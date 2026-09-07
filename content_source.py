import csv
import json
import logging
from dataclasses import dataclass
from typing import List, Optional
import xml.etree.ElementTree as ET
import urllib.request

logger = logging.getLogger(__name__)

@dataclass
class ContentItem:
    topic: str
    link: Optional[str] = None
    custom_title: Optional[str] = None
    custom_description: Optional[str] = None
    image_url: Optional[str] = None

class ContentSourceManager:
    @staticmethod
    def load_from_csv(file_path: str) -> List[ContentItem]:
        items = []
        try:
            with open(file_path, mode="r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    items.append(ContentItem(
                        topic=row.get("topic", "").strip(),
                        link=row.get("link", "").strip() or None,
                        custom_title=row.get("title", "").strip() or None,
                        custom_description=row.get("description", "").strip() or None,
                        image_url=row.get("image_url", "").strip() or None
                    ))
        except Exception as e:
            logger.error(f"Failed to load content from CSV: {e}")
        return [item for item in items if item.topic]

    @staticmethod
    def load_from_json(file_path: str) -> List[ContentItem]:
        items = []
        try:
            with open(file_path, mode="r", encoding="utf-8") as f:
                data = json.load(f)
                for entry in data:
                    items.append(ContentItem(
                        topic=entry.get("topic", "").strip(),
                        link=entry.get("link", None),
                        custom_title=entry.get("title", None),
                        custom_description=entry.get("description", None),
                        image_url=entry.get("image_url", None)
                    ))
        except Exception as e:
            logger.error(f"Failed to load content from JSON: {e}")
        return [item for item in items if item.topic]

    @staticmethod
    def load_from_rss(feed_url: str) -> List[ContentItem]:
        """Fetches the latest blog articles from an RSS feed."""
        items = []
        try:
            req = urllib.request.Request(feed_url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=10) as response:
                tree = ET.fromstring(response.read())
                for item in tree.findall(".//item"):
                    title = item.find("title")
                    link = item.find("link")
                    description = item.find("description")
                    if title is not None and title.text:
                        items.append(ContentItem(
                            topic=title.text.strip(),
                            link=link.text.strip() if link is not None else None,
                            custom_description=description.text.strip() if description is not None else None
                        ))
        except Exception as e:
            logger.error(f"Failed to fetch RSS feed {feed_url}: {e}")
        return items
