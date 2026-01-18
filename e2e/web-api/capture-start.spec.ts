import { test, expect } from '@playwright/test';
import {
  cleanupTestProject,
  generateTestProjectName,
  readManifest,
  waitFor,
  TEST_URL,
} from '../fixtures/test-utils';

test.describe('API - /api/capture/start', () => {
  let testProjectName: string;

  test.beforeEach(() => {
    testProjectName = generateTestProjectName('api-capture');
  });

  test.afterEach(async () => {
    await cleanupTestProject(testProjectName);
  });

  test('returns 400 when url is missing', async ({ request }) => {
    const response = await request.post('/api/capture/start', {
      data: {
        projectName: testProjectName,
        flowName: 'Test Flow',
      },
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.message).toContain('Missing required fields');
  });

  test('returns 400 when projectName is missing', async ({ request }) => {
    const response = await request.post('/api/capture/start', {
      data: {
        url: TEST_URL,
        flowName: 'Test Flow',
      },
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.success).toBe(false);
  });

  test('returns 400 when flowName is missing', async ({ request }) => {
    const response = await request.post('/api/capture/start', {
      data: {
        url: TEST_URL,
        projectName: testProjectName,
      },
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.success).toBe(false);
  });

  test('returns 400 for invalid URL', async ({ request }) => {
    const response = await request.post('/api/capture/start', {
      data: {
        url: 'not-a-valid-url',
        projectName: testProjectName,
        flowName: 'Test Flow',
      },
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.message).toContain('Invalid URL');
  });

  test('returns 200 and captureId for valid request', async ({ request }) => {
    const response = await request.post('/api/capture/start', {
      data: {
        url: TEST_URL,
        projectName: testProjectName,
        flowName: 'API Test Flow',
      },
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.captureId).toBeDefined();
    expect(data.captureId).toMatch(/^[a-f0-9-]{36}$/); // UUID format
    expect(data.message).toContain('Capture started');
  });

  test('actually captures screenshot (async verification)', async ({ request }) => {
    const flowName = 'Async Capture Test';

    const response = await request.post('/api/capture/start', {
      data: {
        url: TEST_URL,
        projectName: testProjectName,
        flowName,
      },
    });

    expect(response.status()).toBe(200);

    // Wait for the capture to complete (it runs asynchronously)
    const captured = await waitFor(
      async () => {
        const manifest = await readManifest(testProjectName);
        return manifest !== null && manifest.flows.length > 0;
      },
      15000, // 15 second timeout
      1000   // Check every second
    );

    expect(captured).toBe(true);

    const manifest = await readManifest(testProjectName);
    expect(manifest).not.toBeNull();
    expect(manifest!.flows[0].name).toBe(flowName);
    expect(manifest!.flows[0].steps.length).toBeGreaterThan(0);
  });

  test('handles special characters in project name', async ({ request }) => {
    const specialName = `test-project_${Date.now()}`;

    const response = await request.post('/api/capture/start', {
      data: {
        url: TEST_URL,
        projectName: specialName,
        flowName: 'Test Flow',
      },
    });

    expect(response.status()).toBe(200);

    // Clean up
    await cleanupTestProject(specialName);
  });

  test('handles special characters in flow name', async ({ request }) => {
    const response = await request.post('/api/capture/start', {
      data: {
        url: TEST_URL,
        projectName: testProjectName,
        flowName: "Test Flow with 'quotes' and spaces",
      },
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });
});
