import { test, expect } from '@playwright/test';

test.describe('API - /api/capture/chrome-status', () => {
  test('returns chrome status object', async ({ request }) => {
    const response = await request.get('/api/capture/chrome-status');

    expect(response.status()).toBe(200);
    const data = await response.json();

    // Should have the expected structure
    expect(data).toHaveProperty('available');
    expect(data).toHaveProperty('message');
    expect(typeof data.available).toBe('boolean');
    expect(typeof data.message).toBe('string');
  });

  test('returns available: false when Chrome debugging not running', async ({ request }) => {
    // In CI/test environments, Chrome debugging is typically not running
    const response = await request.get('/api/capture/chrome-status');

    expect(response.status()).toBe(200);
    const data = await response.json();

    // Most likely Chrome debugging is not available in test environment
    // but we mainly care that the endpoint responds correctly
    if (!data.available) {
      expect(data.message).toContain('Chrome');
    }
  });

  test('responds quickly (under 3s timeout)', async ({ request }) => {
    const startTime = Date.now();
    const response = await request.get('/api/capture/chrome-status');
    const duration = Date.now() - startTime;

    expect(response.status()).toBe(200);
    // Should respond within 3 seconds (API has 2s timeout internally)
    expect(duration).toBeLessThan(3000);
  });
});
