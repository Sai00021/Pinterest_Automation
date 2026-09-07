import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleScheduled, handleRequest } from '../src/index';
import { PinterestClient } from '../src/pinterest/client';
import { DuplicateDetector } from '../src/duplicate/detector';
import { ContentManager } from '../src/content/manager';
import { PinRepository } from '../src/database/repository';
import { AIGenerator } from '../src/ai/provider';
import { ImageProcessor } from '../src/images/processor';
import { Orchestrator } from '../src/scheduler/orchestrator';

const mockEnv: Env = {
  PINTEREST_ACCESS_TOKEN: 'test_access_token',
  PINTEREST_REFRESH_TOKEN: 'test_refresh_token',
  PINTEREST_CLIENT_ID: 'test_client_id',
  PINTEREST_CLIENT_SECRET: 'test_client_secret',
  DB: {} as D1Database, // Mock D1
  AI_PROVIDER: 'heuristic',
  AI_API_KEY: '',
  POSTS_PER_DAY: 2,
  DEFAULT_BOARD_ID: 'board123',
  WEBSITE_URL: 'https://test.com',
  DRY_RUN: 'true',
  TIMEZONE: 'Asia/Kolkata',
  CONTENT_LANGUAGE: 'en',
  NICHE: 'Test Niche',
  BRAND_NAME: 'Test Brand',
  BRAND_DESCRIPTION: 'Test Brand Description',
  LOGGER: console,
};

// Mock dependencies
vi.mock('../src/pinterest/client');
vi.mock('../src/duplicate/detector');
vi.mock('../src/content/manager');
vi.mock('../src/database/repository');
vi.mock('../src/ai/provider');
vi.mock('../src/images/processor');
vi.mock('../src/scheduler/orchestrator');

describe('handleScheduled', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Reset mocks for each test
    vi.mocked(Orchestrator).mockClear();
    vi.mocked(Orchestrator.prototype.executeScheduledPins).mockResolvedValueOnce(undefined);
  });

  it('should call the orchestrator to execute scheduled pins', async () => {
    const mockController = {};
    await handleScheduled(mockController as any, mockEnv);
    expect(Orchestrator).toHaveBeenCalledWith(mockEnv);
    expect(Orchestrator.prototype.executeScheduledPins).toHaveBeenCalledOnce();
  });

  it('should log an error if orchestrator fails', async () => {
    const mockController = {};
    vi.mocked(Orchestrator.prototype.executeScheduledPins).mockRejectedValueOnce(new Error('Scheduler failed'));

    await handleScheduled(mockController as any, mockEnv);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Scheduled task failed:'), expect.any(Error));
  });
});

describe('handleRequest', () => {
  const mockUrl = new URL('http://localhost');
  const mockRequest = (method: string, path: string) => new Request(new URL(path, mockUrl).toString(), { method });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    vi.mocked(PinRepository).mockClear();
    vi.mocked(PinRepository.prototype.getAnalytics).mockResolvedValueOnce({
      totalPinsGenerated: 5,
      totalPinsPublished: 3,
      totalPinsFailed: 1,
      totalPinsSkipped: 1,
      lastSuccessfulPin: '2026-09-03T10:00:00Z',
      lastError: null,
      todayPublished: 1,
    });
  });

  it('should return health status for /health', async () => {
    const request = mockRequest('GET', '/health');
    const response = await handleRequest(request, mockEnv);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('ok');
    expect(body.mode).toBe('dry-run');
  });

  it('should return analytics for /analytics', async () => {
    const request = mockRequest('GET', '/analytics');
    const response = await handleRequest(request, mockEnv);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.totalPinsPublished).toBe(3);
    expect(PinRepository).toHaveBeenCalledWith(mockEnv.DB);
    expect(PinRepository.prototype.getAnalytics).toHaveBeenCalledOnce();
  });

  it('should return 404 for unknown path', async () => {
    const request = mockRequest('GET', '/unknown');
    const response = await handleRequest(request, mockEnv);
    expect(response.status).toBe(404);
  });

  it('should handle repository errors for analytics', async () => {
    vi.mocked(PinRepository.prototype.getAnalytics).mockRejectedValueOnce(new Error('DB Error'));
    const request = mockRequest('GET', '/analytics');
    const response = await handleRequest(request, mockEnv);
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Failed to retrieve analytics');
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Failed to retrieve analytics:'), expect.any(Error));
  });
});
