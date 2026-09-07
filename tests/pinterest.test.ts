import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PinterestClient } from '../src/pinterest/client';

const mockEnv = {
  PINTEREST_ACCESS_TOKEN: 'test_access_token',
  PINTEREST_CLIENT_ID: 'test_client_id',
  PINTEREST_CLIENT_SECRET: 'test_client_secret',
  DB: {},
  AI_PROVIDER: 'heuristic',
  AI_API_KEY: '',
  POSTS_PER_DAY: 10,
  DEFAULT_BOARD_ID: 'test_board_id',
  WEBSITE_URL: 'https://example.com',
  DRY_RUN: 'true',
  TIMEZONE: 'Asia/Kolkata',
  CONTENT_LANGUAGE: 'en',
  NICHE: 'Test Niche',
  BRAND_NAME: 'Test Brand',
  BRAND_DESCRIPTION: 'Test Brand Description',
};

describe('PinterestClient', () => {
  let client: PinterestClient;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
    client = new PinterestClient(mockEnv as any);
  });

  it('should fetch boards successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: [{ id: '123', name: 'My Board' }] }),
    });

    const boards = await client.getBoards();
    expect(boards).toEqual({ data: [{ id: '123', name: 'My Board' }] });
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.pinterest.com/v5/boards',
      expect.objectContaining({
        method: 'GET',
        headers: {
          'Authorization': 'Bearer test_access_token',
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      }),
    );
  });

  it('should handle API errors for fetching boards', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ code: 1, message: 'Invalid request' }),
    });

    await expect(client.getBoards()).rejects.toThrow('Pinterest API Error (400): Invalid request');
  });

  it('should create a pin successfully', async () => {
    const mockPinData = {
      board_id: 'test_board_id',
      title: 'Test Pin Title',
      description: 'Test Pin Description',
      link: 'https://example.com/test-pin',
      media_source: {
        source_type: 'image_url',
        url: 'https://example.com/image.jpg',
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: () => Promise.resolve({ data: { id: '456', ...mockPinData } }),
    });

    const pin = await client.createPin(
      mockPinData.board_id,
      mockPinData.title,
      mockPinData.description,
      mockPinData.link,
      mockPinData.media_source
    );
    expect(pin.data.id).toEqual('456');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.pinterest.com/v5/pins',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test_access_token',
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(mockPinData),
      }),
    );
  });

  it('should handle token refresh', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        access_token: 'new_access_token',
        refresh_token: 'new_refresh_token',
        expires_in: 3600,
      }),
    });

    const newTokens = await client.refreshAccessToken('old_refresh_token');
    expect(newTokens.access_token).toEqual('new_access_token');
    expect(client.accessToken).toEqual('new_access_token');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.pinterest.com/v5/oauth/token',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: expect.stringContaining('grant_type=refresh_token')
      })
    );
  });

  it('should retry on 429 status code', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      headers: { get: () => '1' }, // Retry after 1 second
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: [{ id: '123', name: 'My Board' }] }),
    });

    const boards = await client.getBoards();
    expect(boards).toEqual({ data: [{ id: '123', name: 'My Board' }] });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

});
