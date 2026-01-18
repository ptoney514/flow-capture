import { test, expect } from '@playwright/test';
import {
  runCapture,
  readManifest,
  cleanupTestProject,
  generateTestProjectName,
  TEST_URL,
} from '../fixtures/test-utils';

test.describe('API - /api/screenshot/[...path]', () => {
  let testProjectName: string;

  test.beforeEach(() => {
    testProjectName = generateTestProjectName('screenshot-api');
  });

  test.afterEach(async () => {
    await cleanupTestProject(testProjectName);
  });

  test('serves PNG screenshot with correct content-type', async ({ request }) => {
    // Create a test capture
    await runCapture([
      '--url', TEST_URL,
      '--name', testProjectName,
      '--flow', 'Screenshot Test',
      '--headless',
    ]);

    // Get the filename from manifest
    const manifest = await readManifest(testProjectName);
    expect(manifest).not.toBeNull();

    const filename = manifest!.flows[0].steps[0].filename;
    const response = await request.get(`/api/screenshot/${testProjectName}/${filename}`);

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toBe('image/png');
    expect(response.headers()['cache-control']).toContain('max-age');
  });

  test('returns 404 for non-existent file', async ({ request }) => {
    const response = await request.get(`/api/screenshot/${testProjectName}/non-existent.png`);

    expect(response.status()).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('File not found');
  });

  test('returns 403 for path traversal attempt', async ({ request }) => {
    // Attempt to escape captures directory
    const response = await request.get('/api/screenshot/../../../etc/passwd');

    // Should be blocked (either 403 or 404 depending on implementation)
    expect([403, 404]).toContain(response.status());
  });

  test('returns 403 for encoded path traversal attempt', async ({ request }) => {
    // Attempt with URL-encoded path traversal
    const response = await request.get('/api/screenshot/..%2F..%2F..%2Fetc%2Fpasswd');

    expect([403, 404]).toContain(response.status());
  });

  test('serves screenshot with correct size', async ({ request }) => {
    await runCapture([
      '--url', TEST_URL,
      '--name', testProjectName,
      '--flow', 'Size Test',
      '--headless',
    ]);

    const manifest = await readManifest(testProjectName);
    expect(manifest).not.toBeNull();

    const filename = manifest!.flows[0].steps[0].filename;
    const response = await request.get(`/api/screenshot/${testProjectName}/${filename}`);

    expect(response.status()).toBe(200);

    // PNG should have reasonable size (at least 1KB)
    const body = await response.body();
    expect(body.length).toBeGreaterThan(1000);
  });

  test('handles nested project paths', async ({ request }) => {
    // This tests that multiple path segments are handled
    await runCapture([
      '--url', TEST_URL,
      '--name', testProjectName,
      '--flow', 'Nested Path Test',
      '--headless',
    ]);

    const manifest = await readManifest(testProjectName);
    expect(manifest).not.toBeNull();

    const filename = manifest!.flows[0].steps[0].filename;

    // The path should work correctly
    const response = await request.get(`/api/screenshot/${testProjectName}/${filename}`);
    expect(response.status()).toBe(200);
  });

  test('returns 404 for non-existent project', async ({ request }) => {
    const response = await request.get('/api/screenshot/non-existent-project-12345/test.png');

    expect(response.status()).toBe(404);
  });

  test('validates file extension handling', async ({ request }) => {
    await runCapture([
      '--url', TEST_URL,
      '--name', testProjectName,
      '--flow', 'Extension Test',
      '--headless',
    ]);

    const manifest = await readManifest(testProjectName);
    expect(manifest).not.toBeNull();

    const filename = manifest!.flows[0].steps[0].filename;

    // Request the file with correct extension
    const response = await request.get(`/api/screenshot/${testProjectName}/${filename}`);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toBe('image/png');
  });
});
