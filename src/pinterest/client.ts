export class PinterestAPIError extends Error {
  public status: number;
  public details: any;

  constructor(message: string, status: number, details?: any) {
    super(message);
    this.name = 'PinterestAPIError';
    this.status = status;
    this.details = details;
  }
}

export class PinterestAuthError extends PinterestAPIError {
  constructor(message: string, details?: any) {
    super(message, 401, details);
    this.name = 'PinterestAuthError';
  }
}

export class PinterestRateLimitError extends PinterestAPIError {
  public retryAfter: number;

  constructor(message: string, retryAfter: number, details?: any) {
    super(message, 429, details);
    this.name = 'PinterestRateLimitError';
    this.retryAfter = retryAfter;
  }
}

export interface PinterestMediaSource {
  source_type: 'image_url' | 'image_base64' | 'multiple_image_urls';
  url?: string;
  content_type?: string;
  data?: string;
}

export interface CreatePinParams {
  board_id: string;
  title: string;
  description: string;
  link?: string | null;
  media_source: PinterestMediaSource;
  alt_text?: string;
}

export class PinterestClient {
  private static BASE_URL = 'https://api.pinterest.com/v5';
  private accessToken: string;
  private clientId?: string;
  private clientSecret?: string;

  constructor(accessToken: string, clientId?: string, clientSecret?: string) {
    this.accessToken = accessToken;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  private async request<T>(
    method: string,
    endpoint: string,
    body?: any,
    retries = 3
  ): Promise<T> {
    const url = `${PinterestClient.BASE_URL}/${endpoint.replace(/^\//, '')}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
        });

        if (response.status === 429) {
          const retryAfterSec = parseInt(response.headers.get('Retry-After') || '2', 10);
          if (attempt < retries - 1) {
            // Wait with backoff
            await new Promise((r) => setTimeout(r, retryAfterSec * 1000));
            continue;
          }
          throw new PinterestRateLimitError('Pinterest API Rate Limit Exceeded', retryAfterSec);
        }

        if (response.status === 401) {
          throw new PinterestAuthError('Unauthorized: Pinterest Access Token is invalid or expired.');
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new PinterestAPIError(
            `Pinterest API Error (${response.status}): ${response.statusText}`,
            response.status,
            errorData
          );
        }

        return (await response.json()) as T;
      } catch (err: any) {
        if (err instanceof PinterestAPIError) {
          throw err;
        }
        if (attempt === retries - 1) {
          throw new PinterestAPIError(`Network/Fetch Error: ${err.message}`, 500, err);
        }
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
      }
    }

    throw new PinterestAPIError('Unexpected Pinterest API request termination.', 500);
  }

  async getBoards(): Promise<any> {
    return this.request('GET', '/boards');
  }

  async createPin(params: CreatePinParams): Promise<{ id: string; [key: string]: any }> {
    const payload: any = {
      board_id: params.board_id,
      title: params.title.substring(0, 100),
      description: params.description.substring(0, 500),
      media_source: params.media_source,
    };

    if (params.link) {
      payload.link = params.link;
    }

    if (params.alt_text) {
      payload.alt_text = params.alt_text.substring(0, 500);
    }

    return this.request<{ id: string }>('POST', '/pins', payload);
  }

  async refreshAccessToken(refreshToken: string): Promise<{ access_token: string; [key: string]: any }> {
    if (!this.clientId || !this.clientSecret) {
      throw new PinterestAuthError('Missing Client ID or Client Secret for token refresh.');
    }

    const url = `${PinterestClient.BASE_URL}/oauth/token`;
    const basicAuth = btoa(`${this.clientId}:${this.clientSecret}`);

    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', refreshToken);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new PinterestAuthError('Failed to refresh Pinterest token', err);
    }

    const data = (await response.json()) as { access_token: string };
    this.accessToken = data.access_token;
    return data;
  }
}
