import { test, expect } from '@playwright/test';
import {
  runCapture,
  readManifest,
  cleanupTestProject,
  generateTestProjectName,
  apiRequest,
  TEST_URL,
} from '../fixtures/test-utils';

test.describe('Delete Project API', () => {
  let testProjectName: string;

  test.beforeEach(() => {
    testProjectName = generateTestProjectName('delete-api');
  });

  test.afterEach(async () => {
    await cleanupTestProject(testProjectName);
  });

  test('deletes existing project successfully', async () => {
    // First create a project
    await runCapture([
      '--url', TEST_URL,
      '--name', testProjectName,
      '--flow', 'Test Flow',
      '--headless',
    ]);

    // Verify project exists
    const manifestBefore = await readManifest(testProjectName);
    expect(manifestBefore).not.toBeNull();

    // Delete the project
    const response = await apiRequest(`/api/projects/${testProjectName}`, {
      method: 'DELETE',
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);

    // Verify project no longer exists
    const manifestAfter = await readManifest(testProjectName);
    expect(manifestAfter).toBeNull();
  });

  test('returns 404 for non-existent project', async () => {
    const response = await apiRequest('/api/projects/non-existent-project-12345', {
      method: 'DELETE',
    });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Project not found');
  });

  test('returns 400 for path traversal attempts', async () => {
    const response = await apiRequest('/api/projects/..%2F..%2Fetc', {
      method: 'DELETE',
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid project name');
  });

  test('returns 400 for invalid project names', async () => {
    // Project name with special characters
    const response = await apiRequest('/api/projects/test%24project', {
      method: 'DELETE',
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid project name');
  });

  test('returns 400 for project names with slashes', async () => {
    const response = await apiRequest('/api/projects/test%2Fproject', {
      method: 'DELETE',
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid project name');
  });

  test('project disappears from /api/flows after deletion', async () => {
    // Create a project
    await runCapture([
      '--url', TEST_URL,
      '--name', testProjectName,
      '--flow', 'Test Flow',
      '--headless',
    ]);

    // Verify project appears in flows API
    let flowsResponse = await apiRequest('/api/flows');
    let flows = await flowsResponse.json();
    expect(flows.some((p: { projectName: string }) => p.projectName === testProjectName)).toBe(true);

    // Delete the project
    await apiRequest(`/api/projects/${testProjectName}`, {
      method: 'DELETE',
    });

    // Verify project no longer appears in flows API
    flowsResponse = await apiRequest('/api/flows');
    flows = await flowsResponse.json();
    expect(flows.some((p: { projectName: string }) => p.projectName === testProjectName)).toBe(false);
  });

  test('allows valid project names with hyphens and underscores', async () => {
    const validProjectName = 'test-project_123';

    // Create a project with valid name
    await runCapture([
      '--url', TEST_URL,
      '--name', validProjectName,
      '--flow', 'Test Flow',
      '--headless',
    ]);

    // Delete should succeed
    const response = await apiRequest(`/api/projects/${validProjectName}`, {
      method: 'DELETE',
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });
});
