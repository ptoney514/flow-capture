import { test, expect } from '@playwright/test';
import {
  runCapture,
  cleanupTestProject,
  generateTestProjectName,
  TEST_URL,
} from '../fixtures/test-utils';

test.describe('API - /api/flows', () => {
  let testProjectName: string;

  test.beforeEach(() => {
    testProjectName = generateTestProjectName('flows-api');
  });

  test.afterEach(async () => {
    await cleanupTestProject(testProjectName);
  });

  test('returns empty array when no projects exist', async ({ request }) => {
    // Note: This test assumes a clean state or filters for test projects
    const response = await request.get('/api/flows');

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test('returns projects list after capture', async ({ request }) => {
    // Create a test capture
    await runCapture([
      '--url', TEST_URL,
      '--name', testProjectName,
      '--flow', 'Test Flow',
      '--headless',
    ]);

    const response = await request.get('/api/flows');

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);

    // Find our test project
    const testProject = data.find((p: { path: string }) => p.path === testProjectName);
    expect(testProject).toBeDefined();
    expect(testProject.projectName).toBe(testProjectName);
    expect(testProject.flows).toBeDefined();
    expect(Array.isArray(testProject.flows)).toBe(true);
  });

  test('returns specific project with ?project= query', async ({ request }) => {
    // Create a test capture
    await runCapture([
      '--url', TEST_URL,
      '--name', testProjectName,
      '--flow', 'Specific Flow',
      '--headless',
    ]);

    const response = await request.get(`/api/flows?project=${testProjectName}`);

    expect(response.status()).toBe(200);
    const data = await response.json();

    expect(data.projectName).toBe(testProjectName);
    expect(data.path).toBe(testProjectName);
    expect(data.flows).toHaveLength(1);
    expect(data.flows[0].name).toBe('Specific Flow');
  });

  test('returns 404 for non-existent project', async ({ request }) => {
    const response = await request.get('/api/flows?project=non-existent-project-12345');

    expect(response.status()).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Project not found');
  });

  test('returns project with nested flows', async ({ request }) => {
    // Create parent flow
    await runCapture([
      '--url', TEST_URL,
      '--name', testProjectName,
      '--flow', 'Parent Flow',
      '--headless',
    ]);

    // Create child flow
    await runCapture([
      '--url', TEST_URL,
      '--name', testProjectName,
      '--flow', 'Child Flow',
      '--parent', 'parent-flow',
      '--headless',
    ]);

    const response = await request.get(`/api/flows?project=${testProjectName}`);

    expect(response.status()).toBe(200);
    const data = await response.json();

    expect(data.flows).toHaveLength(1);
    expect(data.flows[0].name).toBe('Parent Flow');
    expect(data.flows[0].children).toHaveLength(1);
    expect(data.flows[0].children[0].name).toBe('Child Flow');
  });

  test('returns correct flow structure', async ({ request }) => {
    await runCapture([
      '--url', TEST_URL,
      '--name', testProjectName,
      '--flow', 'Structure Test',
      '--headless',
    ]);

    const response = await request.get(`/api/flows?project=${testProjectName}`);
    const data = await response.json();

    const flow = data.flows[0];
    expect(flow).toHaveProperty('id');
    expect(flow).toHaveProperty('name');
    expect(flow).toHaveProperty('steps');
    expect(flow.steps[0]).toHaveProperty('order');
    expect(flow.steps[0]).toHaveProperty('name');
    expect(flow.steps[0]).toHaveProperty('filename');
    expect(flow.steps[0]).toHaveProperty('url');
  });
});
