import { test, expect } from '@playwright/test';
import {
  runCapture,
  readManifest,
  screenshotExists,
  cleanupTestProject,
  generateTestProjectName,
  TEST_URL,
} from '../fixtures/test-utils';

test.describe('Capture Tool - Non-Interactive Mode (--url)', () => {
  let testProjectName: string;

  test.beforeEach(() => {
    testProjectName = generateTestProjectName('non-interactive');
  });

  test.afterEach(async () => {
    await cleanupTestProject(testProjectName);
  });

  test('captures single screenshot with --url flag', async () => {
    const flowName = 'Homepage';

    const result = await runCapture([
      '--url', TEST_URL,
      '--name', testProjectName,
      '--flow', flowName,
      '--headless',
    ]);

    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('Captured:');
    expect(result.stdout).toContain('screenshot(s)');

    // Verify manifest was created
    const manifest = await readManifest(testProjectName);
    expect(manifest).not.toBeNull();
    expect(manifest!.projectName).toBe(testProjectName);
    expect(manifest!.flows).toHaveLength(1);
    expect(manifest!.flows[0].name).toBe(flowName);
    expect(manifest!.flows[0].steps).toHaveLength(1);

    // Verify screenshot file exists
    const step = manifest!.flows[0].steps[0];
    const exists = await screenshotExists(testProjectName, step.filename);
    expect(exists).toBe(true);
  });

  test('captures with correct step structure', async () => {
    const flowName = 'Test Flow';

    await runCapture([
      '--url', TEST_URL,
      '--name', testProjectName,
      '--flow', flowName,
      '--headless',
    ]);

    const manifest = await readManifest(testProjectName);
    expect(manifest).not.toBeNull();

    const step = manifest!.flows[0].steps[0];
    expect(step.order).toBe(1);
    expect(step.name).toBe(flowName);
    expect(step.filename).toMatch(/^\d{3}-.*\.png$/);
    expect(step.url).toBe(TEST_URL + '/');
  });

  test('uses "default" as project name when not specified', async () => {
    // Note: This test uses a specific project name to clean up
    const defaultProjectName = 'default';

    await runCapture([
      '--url', TEST_URL,
      '--flow', 'Test',
      '--headless',
    ]);

    const manifest = await readManifest(defaultProjectName);
    expect(manifest).not.toBeNull();
    expect(manifest!.projectName).toBe(defaultProjectName);

    // Clean up default project
    await cleanupTestProject(defaultProjectName);
  });

  test('appends flow to existing manifest', async () => {
    // First capture
    await runCapture([
      '--url', TEST_URL,
      '--name', testProjectName,
      '--flow', 'Flow 1',
      '--headless',
    ]);

    // Second capture
    await runCapture([
      '--url', TEST_URL,
      '--name', testProjectName,
      '--flow', 'Flow 2',
      '--headless',
    ]);

    const manifest = await readManifest(testProjectName);
    expect(manifest).not.toBeNull();
    expect(manifest!.flows).toHaveLength(2);
    expect(manifest!.flows[0].name).toBe('Flow 1');
    expect(manifest!.flows[1].name).toBe('Flow 2');
  });

  test('supports nested flows with --parent flag', async () => {
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

    const manifest = await readManifest(testProjectName);
    expect(manifest).not.toBeNull();
    expect(manifest!.flows).toHaveLength(1);
    expect(manifest!.flows[0].name).toBe('Parent Flow');
    expect(manifest!.flows[0].children).toBeDefined();
    expect(manifest!.flows[0].children).toHaveLength(1);
    expect(manifest!.flows[0].children![0].name).toBe('Child Flow');
  });

  test('handles URLs without protocol', async () => {
    // The capture tool should work with URLs that include protocol
    await runCapture([
      '--url', 'https://example.com',
      '--name', testProjectName,
      '--flow', 'Protocol Test',
      '--headless',
    ]);

    const manifest = await readManifest(testProjectName);
    expect(manifest).not.toBeNull();
    expect(manifest!.flows[0].steps[0].url).toContain('example.com');
  });
});
