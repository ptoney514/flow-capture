import { test, expect } from '@playwright/test';
import {
  runCapture,
  readManifest,
  screenshotExists,
  cleanupTestProject,
  generateTestProjectName,
  TEST_URL,
} from '../fixtures/test-utils';

test.describe('Capture Tool - Automated Mode (--auto)', () => {
  let testProjectName: string;

  test.beforeEach(() => {
    testProjectName = generateTestProjectName('auto');
  });

  test.afterEach(async () => {
    await cleanupTestProject(testProjectName);
  });

  test('captures single screenshot with --auto flag', async () => {
    const flowName = 'Auto Capture';

    const result = await runCapture([
      '--url', TEST_URL,
      '--name', testProjectName,
      '--flow', flowName,
      '--auto',
      '--headless',
    ]);

    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('Running automated capture');
    expect(result.stdout).toContain('Captured:');

    const manifest = await readManifest(testProjectName);
    expect(manifest).not.toBeNull();
    expect(manifest!.flows).toHaveLength(1);
    expect(manifest!.flows[0].steps).toHaveLength(1);
  });

  test('executes multi-step capture with --steps JSON', async () => {
    const steps = JSON.stringify([
      { action: 'capture', name: 'Top of Page' },
      { action: 'scroll', pixels: 300 },
      { action: 'capture', name: 'After Scroll' },
    ]);

    const result = await runCapture([
      '--url', TEST_URL,
      '--name', testProjectName,
      '--flow', 'Multi Step Flow',
      '--auto',
      '--steps', `'${steps}'`,
      '--headless',
    ]);

    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('Running automated capture with 3 step(s)');
    expect(result.stdout).toContain('Scrolled 300px');

    const manifest = await readManifest(testProjectName);
    expect(manifest).not.toBeNull();
    expect(manifest!.flows[0].steps).toHaveLength(2);
    expect(manifest!.flows[0].steps[0].name).toBe('Top of Page');
    expect(manifest!.flows[0].steps[1].name).toBe('After Scroll');
  });

  test('executes wait action in --steps', async () => {
    const steps = JSON.stringify([
      { action: 'wait', ms: 500 },
      { action: 'capture', name: 'After Wait' },
    ]);

    const result = await runCapture([
      '--url', TEST_URL,
      '--name', testProjectName,
      '--flow', 'Wait Test',
      '--auto',
      '--steps', `'${steps}'`,
      '--headless',
    ]);

    expect(result.stdout).toContain('Waiting 500ms');
    expect(result.stdout).toContain('Captured:');

    const manifest = await readManifest(testProjectName);
    expect(manifest).not.toBeNull();
    expect(manifest!.flows[0].steps).toHaveLength(1);
  });

  test('executes goto action in --steps', async () => {
    const steps = JSON.stringify([
      { action: 'capture', name: 'Initial Page' },
      { action: 'goto', url: 'https://example.org' },
      { action: 'capture', name: 'New Page' },
    ]);

    const result = await runCapture([
      '--url', TEST_URL,
      '--name', testProjectName,
      '--flow', 'Goto Test',
      '--auto',
      '--steps', `'${steps}'`,
      '--headless',
    ]);

    expect(result.stdout).toContain('Navigating to https://example.org');

    const manifest = await readManifest(testProjectName);
    expect(manifest).not.toBeNull();
    expect(manifest!.flows[0].steps).toHaveLength(2);
    expect(manifest!.flows[0].steps[0].url).toContain('example.com');
    expect(manifest!.flows[0].steps[1].url).toContain('example.org');
  });

  test('uses default capture when --auto without --steps', async () => {
    const flowName = 'Default Auto';

    const result = await runCapture([
      '--url', TEST_URL,
      '--name', testProjectName,
      '--flow', flowName,
      '--auto',
      '--headless',
    ]);

    expect(result.stdout).toContain('Running automated capture with 1 step(s)');

    const manifest = await readManifest(testProjectName);
    expect(manifest).not.toBeNull();
    expect(manifest!.flows[0].steps).toHaveLength(1);
    expect(manifest!.flows[0].steps[0].name).toBe(flowName);
  });

  test('scrolls default 500px when pixels not specified', async () => {
    const steps = JSON.stringify([
      { action: 'scroll' },
      { action: 'capture', name: 'After Default Scroll' },
    ]);

    const result = await runCapture([
      '--url', TEST_URL,
      '--name', testProjectName,
      '--flow', 'Default Scroll',
      '--auto',
      '--steps', `'${steps}'`,
      '--headless',
    ]);

    expect(result.stdout).toContain('Scrolled 500px');
  });

  test('waits default 1000ms when ms not specified', async () => {
    const steps = JSON.stringify([
      { action: 'wait' },
      { action: 'capture', name: 'After Default Wait' },
    ]);

    const result = await runCapture([
      '--url', TEST_URL,
      '--name', testProjectName,
      '--flow', 'Default Wait',
      '--auto',
      '--steps', `'${steps}'`,
      '--headless',
    ]);

    expect(result.stdout).toContain('Waiting 1000ms');
  });

  test('handles unknown action gracefully', async () => {
    const steps = JSON.stringify([
      { action: 'unknownAction' },
      { action: 'capture', name: 'After Unknown' },
    ]);

    const result = await runCapture([
      '--url', TEST_URL,
      '--name', testProjectName,
      '--flow', 'Unknown Action',
      '--auto',
      '--steps', `'${steps}'`,
      '--headless',
    ]);

    expect(result.stdout).toContain('Unknown action: unknownAction');
    // Should still capture
    expect(result.stdout).toContain('Captured:');
  });

  test('combines --auto with --parent for nested flows', async () => {
    // Create parent flow
    await runCapture([
      '--url', TEST_URL,
      '--name', testProjectName,
      '--flow', 'Parent',
      '--auto',
      '--headless',
    ]);

    // Create child with multi-step
    const steps = JSON.stringify([
      { action: 'capture', name: 'Child Step 1' },
      { action: 'scroll', pixels: 200 },
      { action: 'capture', name: 'Child Step 2' },
    ]);

    await runCapture([
      '--url', TEST_URL,
      '--name', testProjectName,
      '--flow', 'Child',
      '--parent', 'parent',
      '--auto',
      '--steps', `'${steps}'`,
      '--headless',
    ]);

    const manifest = await readManifest(testProjectName);
    expect(manifest).not.toBeNull();
    expect(manifest!.flows).toHaveLength(1);
    expect(manifest!.flows[0].children).toHaveLength(1);
    expect(manifest!.flows[0].children![0].steps).toHaveLength(2);
  });
});
