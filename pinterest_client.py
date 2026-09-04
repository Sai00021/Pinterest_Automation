import time
import requests
import json
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

class PinterestAPIError(Exception):
    pass

class PinterestClient:
    BASE_URL = "https://api.pinterest.com/v5"

    def __init__(self, access_token: str, client_id: str = "", client_secret: str = ""):
        self.access_token = access_token
        self.client_id = client_id
        self.client_secret = client_secret

    def _get_headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }

    def _request(self, method: str, endpoint: str, data: Optional[Dict[str, Any]] = None, params: Optional[Dict[str, Any]] = None, retries: int = 3) -> Dict[str, Any]:
        url = f"{self.BASE_URL}/{endpoint.lstrip('/')}"
        headers = self._get_headers()

        for attempt in range(retries):
            try:
                response = requests.request(
                    method=method,
                    url=url,
                    headers=headers,
                    json=data,
                    params=params,
                    timeout=30
                )

                # Handle Rate Limiting
                if response.status_code == 429:
                    retry_after = int(response.headers.get("Retry-After", 2 ** attempt))
                    logger.warning(f"Rate limited (429). Retrying after {retry_after} seconds...")
                    time.sleep(retry_after)
                    continue

                # Handle Token Expired (401)
                if response.status_code == 401:
                    logger.error("Unauthorized: Access token might be invalid or expired.")
                    raise PinterestAPIError("Unauthorized. Please refresh token.")

                response.raise_for_status()
                return response.json()

            except requests.exceptions.RequestException as e:
                logger.error(f"Request failed: {e}. Attempt {attempt + 1} of {retries}")
                if attempt == retries - 1:
                    raise PinterestAPIError(f"Pinterest API request failed after {retries} retries: {e}")
                time.sleep(2 ** attempt)

        raise PinterestAPIError("Unexpected error during Pinterest API request.")

    def get_boards(self) -> Dict[str, Any]:
        """Fetch all boards for the authenticated user."""
        return self._request("GET", "/boards")

    def create_pin(self, board_id: str, title: str, description: str, link: Optional[str], media_source: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a Pin.
        media_source format:
        For Image URL:
        {
            "source_type": "image_url",
            "url": "https://example.com/image.jpg"
        }
        For Base64:
        {
            "source_type": "image_base64",
            "content_type": "image/jpeg",
            "data": "<base64_encoded_string>"
        }
        """
        payload = {
            "board_id": board_id,
            "title": title[:100],  # 100 char limit
            "description": description[:500],  # 500 char limit
            "media_source": media_source
        }
        if link:
            payload["link"] = link

        return self._request("POST", "/pins", data=payload)

    def refresh_access_token(self, refresh_token: str) -> Dict[str, Any]:
        """Refresh the OAuth 2.0 access token."""
        url = f"{self.BASE_URL}/oauth/token"
        auth = (self.client_id, self.client_secret)
        data = {
            "grant_type": "refresh_token",
            "refresh_token": refresh_token
        }
        headers = {"Content-Type": "application/x-www-form-urlencoded"}

        response = requests.post(url, auth=auth, data=data, headers=headers)
        response.raise_for_status()
        tokens = response.json()
        self.access_token = tokens.get("access_token", self.access_token)
        return tokens
