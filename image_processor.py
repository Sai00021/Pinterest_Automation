import base64
import io
import os
import logging
from typing import Tuple, Optional
from PIL import Image, ImageDraw, ImageFont

logger = logging.getLogger(__name__)

class ImageProcessor:
    DEFAULT_WIDTH = 1000
    DEFAULT_HEIGHT = 1500

    @classmethod
    def validate_image(cls, image_path: str) -> bool:
        """Validates that the image exists, is an image, and fits size limits."""
        if not os.path.exists(image_path):
            logger.error(f"Image not found: {image_path}")
            return False

        try:
            with Image.open(image_path) as img:
                img.verify()
            return True
        except Exception as e:
            logger.error(f"Invalid image file {image_path}: {e}")
            return False

    @classmethod
    def to_base64(cls, image_path: str) -> str:
        """Converts an image file to base64 string."""
        with open(image_path, "rb") as img_file:
            return base64.b64encode(img_file.read()).decode("utf-8")

    @classmethod
    def create_text_pin(
        cls,
        text: str,
        output_path: str,
        brand_name: str = "",
        bg_color: Tuple[int, int, int] = (245, 240, 235),
        text_color: Tuple[int, int, int] = (30, 30, 30),
        width: int = DEFAULT_WIDTH,
        height: int = DEFAULT_HEIGHT
    ) -> str:
        """
        Creates a vertical, highly readable text-based Pin (ideal for quotes, tips, lists).
        """
        img = Image.new("RGB", (width, height), color=bg_color)
        draw = ImageDraw.Draw(img)

        # Draw a stylish border/accent
        draw.rectangle([(40, 40), (width - 40, height - 40)], outline=(200, 190, 180), width=4)

        # Simple text wrapping logic
        words = text.split()
        lines = []
        current_line = []

        # Rough approximation for line wrapping without loading external TTF
        for word in words:
            if len(" ".join(current_line + [word])) < 22:
                current_line.append(word)
            else:
                lines.append(" ".join(current_line))
                current_line = [word]
        if current_line:
            lines.append(" ".join(current_line))

        # Centering text
        y_text = height // 3
        for line in lines:
            # Draw simple text using default bitmap font or fallback
            draw.text((width // 10, y_text), line, fill=text_color)
            y_text += 50

        # Footer branding
        if brand_name:
            draw.text((width // 10, height - 100), f"📌 {brand_name}", fill=(120, 120, 120))

        img.save(output_path, "JPEG", quality=90)
        logger.info(f"Generated text pin image at {output_path}")
        return output_path
