import hashlib
import sqlite3
import logging
from typing import Optional

logger = logging.getLogger(__name__)

class DuplicateDetector:
    def __init__(self, db_path: str = "pinterest_automation.db"):
        self.db_path = db_path

    def _get_connection(self):
        return sqlite3.connect(self.db_path)

    def generate_content_hash(self, title: str, description: str, link: Optional[str]) -> str:
        """Generates a reproducible SHA-256 hash for the Pin content."""
        raw = f"{title.strip().lower()}|{description.strip().lower()}|{str(link).strip().lower()}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    def generate_image_hash(self, image_path: str) -> str:
        """
        Generates a quick MD5 of the image binary.
        For production with massive scales, a perceptual hash (phash) is better.
        """
        hasher = hashlib.md5()
        with open(image_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hasher.update(chunk)
        return hasher.hexdigest()

    def check_duplicate(self, title: str, description: str, link: Optional[str], image_path: Optional[str]) -> bool:
        """
        Returns True if this exact content or image has already been published.
        """
        content_hash = self.generate_content_hash(title, description, link)
        img_hash = None
        if image_path:
            img_hash = self.generate_image_hash(image_path)

        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            # Check content match
            cursor.execute("SELECT 1 FROM pin_history WHERE content_hash = ? AND status = 'PUBLISHED'", (content_hash,))
            if cursor.fetchone():
                logger.warning("Duplicate detected: Exact content hash already published.")
                return True

            # Check image match
            if img_hash:
                cursor.execute("SELECT 1 FROM pin_history WHERE image_hash = ? AND status = 'PUBLISHED'", (img_hash,))
                if cursor.fetchone():
                    logger.warning("Duplicate detected: Exact image binary already published.")
                    return True

            # Check URL match if we don't want multiple pins to the same exact URL in a short time
            if link:
                # Add logic for cooldown if required (e.g. not same URL within 7 days)
                cursor.execute("SELECT published_at FROM pin_history WHERE destination_url = ? AND status = 'PUBLISHED' ORDER BY published_at DESC LIMIT 1", (link,))
                row = cursor.fetchone()
                if row:
                    # In a full production system, parse published_at and check time delta.
                    logger.info(f"Note: URL {link} was pinned previously at {row[0]}, checking if we should allow... allowed for now.")

            return False

        finally:
            conn.close()

    def record_publication(self, pin_id: str, title: str, description: str, link: Optional[str], image_path: Optional[str], board_id: str, status: str = "PUBLISHED", error: str = ""):
        """Records a successful or failed Pin in history."""
        content_hash = self.generate_content_hash(title, description, link)
        img_hash = self.generate_image_hash(image_path) if image_path else ""

        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO pin_history (pin_id, content_hash, image_hash, title, description, board_id, destination_url, published_at, status, error)
                VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?)
            """, (pin_id, content_hash, img_hash, title, description, board_id, link, status, error))
            conn.commit()
            logger.info(f"Recorded Pin status: {status} into local history.")
        finally:
            conn.close()
