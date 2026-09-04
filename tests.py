import unittest
import os
import sqlite3
from duplicate import DuplicateDetector
from ai_generator import AIGenerator

class TestPinterestAutomation(unittest.TestCase):
    def setUp(self):
        self.db_path = "test_db.db"
        self.detector = DuplicateDetector(db_path=self.db_path)
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS pin_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pin_id TEXT,
                content_hash TEXT,
                image_hash TEXT,
                title TEXT,
                description TEXT,
                board_id TEXT,
                destination_url TEXT,
                published_at DATETIME,
                status TEXT,
                error TEXT
            )
        """)
        conn.commit()
        conn.close()

    def tearDown(self):
        if os.path.exists(self.db_path):
            os.remove(self.db_path)

    def test_duplicate_detection(self):
        # 1. Check not duplicate
        self.assertFalse(self.detector.check_duplicate("Test Title", "Test Desc", "http://example.com", None))

        # 2. Record
        self.detector.record_publication("123", "Test Title", "Test Desc", "http://example.com", None, "board1")

        # 3. Check duplicate
        self.assertTrue(self.detector.check_duplicate("Test Title", "Test Desc", "http://example.com", None))

    def test_heuristic_ai(self):
        ai = AIGenerator(provider="heuristic")
        res = ai.generate_pin_content("Healthy Smoothies")
        self.assertIn("title", res)
        self.assertIn("description", res)
        self.assertTrue(len(res["title"]) <= 100)
        self.assertTrue(len(res["description"]) <= 500)

if __name__ == "__main__":
    unittest.main()
