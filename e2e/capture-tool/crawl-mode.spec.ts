import { test, expect } from '@playwright/test';
import {
  runCapture,
  readManifest,
  screenshotExists,
  cleanupTestProject,
  generateTestProjectName,
  TEST_URL,
  Flow,
} from '../fixtures/test-utils';

test.describe('Capture Tool - Crawl Mode', () => {
  let testProjectName: string;

  test.beforeEach(() => {
    testProjectName = generateTestProjectName('crawl');
  });

  test.afterEach(async () => {
    await cleanupTestProject(testProjectName);
  });

  test('crawls with default settings', async () => {
    const result = await runCapture([
      '--crawl',
      '--url', TEST_URL,
      '--name', testProjectName,
      '--flow', 'Site Crawl',
      '--headless',
      '--max-pages', '3',
    ], { timeout: 120000 });

    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('Crawl Mode');
    expect(result.stdout).toContain('Crawl complete');

    const manifest = await readManifest(testProjectName);
    expect(manifest).not.toBeNull();
    expect(manifest!.projectName).toBe(testProjectName);
    // Crawl creates flows - verify at least one exists with proper structure
    expect(manifest!.flows.length).toBeGreaterThanOrEqual(1);
    // Each flow should have an id and name
    for (const flow of manifest!.flows) {
      expect(flow.id).toBeDefined();
      expect(flow.name).toBeDefined();
    }
  });

  test('respects --depth parameter', async () => {
    const result = await runCapture([
      '--crawl',
      '--url', TEST_URL,
      '--name', testProjectName,
      '--flow', 'Depth Test',
      '--headless',
      '--depth', '1',
      '--max-pages', '5',
    ], { timeout: 120000 });

    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('Max depth: 1');

    const manifest = await readManifest(testProjectName);
    expect(manifest).not.toBeNull();
  });

  test('respects --max-pages limit', async () => {
    const maxPages = 2;
    const result = await runCapture([
      '--crawl',
      '--url', TEST_URL,
      '--name', testProjectName,
      '--flow', 'Max Pages Test',
      '--headless',
      '--max-pages', String(maxPages),
    ], { timeout: 120000 });

    expect(result.stderr).toBe('');
    expect(result.stdout).toContain(`Max pages: ${maxPages}`);
    expect(result.stdout).toContain('Crawl complete');

    const manifest = await readManifest(testProjectName);
    expect(manifest).not.toBeNull();
  });

  test('excludes URLs matching patterns', async () => {
    const result = await runCapture([
      '--crawl',
      '--url', TEST_URL,
      '--name', testProjectName,
      '--flow', 'Exclude Test',
      '--headless',
      '--max-pages', '5',
      '--exclude', '/admin,/private',
    ], { timeout: 120000 });

    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('Exclude patterns: /admin, /private');

    const manifest = await readManifest(testProjectName);
    expect(manifest).not.toBeNull();
  });

  test('stays within same domain', async () => {
    const result = await runCapture([
      '--crawl',
      '--url', TEST_URL,
      '--name', testProjectName,
      '--flow', 'Domain Test',
      '--headless',
      '--max-pages', '3',
    ], { timeout: 120000 });

    expect(result.stderr).toBe('');

    const manifest = await readManifest(testProjectName);
    expect(manifest).not.toBeNull();

    // Verify all captured URLs are from the same domain
    const checkUrls = (flows: Flow[]): void => {
      for (const flow of flows) {
        for (const step of flow.steps || []) {
          if (step.url) {
            expect(step.url).toContain('example.com');
          }
        }
        if (flow.children) {
          checkUrls(flow.children);
        }
      }
    };
    checkUrls(manifest!.flows);
  });

  test('creates hierarchical flow structure', async () => {
    const result = await runCapture([
      '--crawl',
      '--url', TEST_URL,
      '--name', testProjectName,
      '--flow', 'Hierarchy Test',
      '--headless',
      '--depth', '2',
      '--max-pages', '5',
    ], { timeout: 120000 });

    expect(result.stderr).toBe('');

    const manifest = await readManifest(testProjectName);
    expect(manifest).not.toBeNull();
    expect(manifest!.flows.length).toBeGreaterThanOrEqual(1);

    // Verify flows have proper structure (either steps or children)
    const rootFlow = manifest!.flows[0];
    expect(rootFlow.id).toBeDefined();
    expect(rootFlow.name).toBeDefined();
    // Each flow should have either steps or children (or both)
    const hasContent = (rootFlow.steps && rootFlow.steps.length > 0) ||
                       (rootFlow.children && rootFlow.children.length > 0);
    expect(hasContent).toBe(true);
  });

  test('avoids duplicate URLs', async () => {
    const result = await runCapture([
      '--crawl',
      '--url', TEST_URL,
      '--name', testProjectName,
      '--flow', 'Dedup Test',
      '--headless',
      '--max-pages', '10',
    ], { timeout: 120000 });

    expect(result.stderr).toBe('');

    const manifest = await readManifest(testProjectName);
    expect(manifest).not.toBeNull();

    // Collect all URLs from the manifest
    const urls = new Set<string>();
    const collectUrls = (flows: Flow[]): void => {
      for (const flow of flows) {
        for (const step of flow.steps || []) {
          if (step.url) {
            expect(urls.has(step.url)).toBe(false);
            urls.add(step.url);
          }
        }
        if (flow.children) {
          collectUrls(flow.children);
        }
      }
    };
    collectUrls(manifest!.flows);
  });

  test('creates screenshot files', async () => {
    const result = await runCapture([
      '--crawl',
      '--url', TEST_URL,
      '--name', testProjectName,
      '--flow', 'Screenshot Test',
      '--headless',
      '--max-pages', '2',
    ], { timeout: 120000 });

    expect(result.stderr).toBe('');

    const manifest = await readManifest(testProjectName);
    expect(manifest).not.toBeNull();

    // Check at least one screenshot exists
    const checkScreenshots = async (flows: Flow[]): Promise<void> => {
      for (const flow of flows) {
        for (const step of flow.steps || []) {
          if (step.filename) {
            const exists = await screenshotExists(testProjectName, step.filename);
            expect(exists).toBe(true);
          }
        }
        if (flow.children) {
          await checkScreenshots(flow.children);
        }
      }
    };
    await checkScreenshots(manifest!.flows);
  });
});
