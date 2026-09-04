import json
import logging
import os
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

class AIGenerator:
    def __init__(self, provider: str = "heuristic", api_key: str = "", model: str = ""):
        self.provider = provider.lower()
        self.api_key = api_key
        self.model = model

    def generate_pin_content(self, topic: str, brand_name: str = "", niche: str = "") -> Dict[str, Any]:
        """
        Generates SEO-friendly Pin title, description, and keywords.
        """
        if self.provider == "openai" and self.api_key:
            return self._generate_openai(topic, brand_name, niche)
        elif self.provider == "anthropic" and self.api_key:
            return self._generate_anthropic(topic, brand_name, niche)
        else:
            # Fallback heuristic generator
            return self._generate_heuristic(topic, brand_name, niche)

    def _generate_heuristic(self, topic: str, brand_name: str, niche: str) -> Dict[str, Any]:
        """Simple rules-based generation to ensure offline/free operation."""
        brand = f" | {brand_name}" if brand_name else ""
        niche_str = f" in {niche}" if niche else ""
        title = f"Top Ideas for {topic}{brand}"[:100]
        description = (
            f"Discover the best tips and inspiration for {topic}{niche_str}. "
            f"Save this Pin to your board for later! Follow for more amazing content."
        )[:500]

        return {
            "title": title,
            "description": description,
            "keywords": [topic, niche, "inspiration", "tips"],
            "alt_text": f"Infographic or aesthetic image related to {topic}"
        }

    def _generate_openai(self, topic: str, brand_name: str, niche: str) -> Dict[str, Any]:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=self.api_key)

            prompt = (
                f"You are a Pinterest SEO expert. Generate an engaging, high-ranking Pin for:\n"
                f"Topic: {topic}\nBrand: {brand_name}\nNiche: {niche}\n\n"
                f"Return ONLY a JSON object with keys: title (max 100 chars), description (max 500 chars), "
                f"keywords (array of 5 strings), alt_text (max 100 chars)."
            )

            response = client.chat.completions.create(
                model=self.model or "gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"}
            )
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            logger.error(f"OpenAI generation failed: {e}. Falling back to heuristic.")
            return self._generate_heuristic(topic, brand_name, niche)

    def _generate_anthropic(self, topic: str, brand_name: str, niche: str) -> Dict[str, Any]:
        try:
            import anthropic
            client = anthropic.Anthropic(api_key=self.api_key)

            prompt = (
                f"You are a Pinterest SEO expert. Generate an engaging, high-ranking Pin for:\n"
                f"Topic: {topic}\nBrand: {brand_name}\nNiche: {niche}\n\n"
                f"Respond ONLY with a JSON object containing keys: 'title' (max 100 chars), 'description' (max 500 chars), "
                f"'keywords' (array of strings), 'alt_text' (max 100 chars)."
            )

            response = client.messages.create(
                model=self.model or "claude-3-haiku-20240307",
                max_tokens=500,
                messages=[{"role": "user", "content": prompt}]
            )
            content = response.content[0].text
            return json.loads(content)
        except Exception as e:
            logger.error(f"Anthropic generation failed: {e}. Falling back to heuristic.")
            return self._generate_heuristic(topic, brand_name, niche)
