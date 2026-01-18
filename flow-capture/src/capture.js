#!/usr/bin/env node

import { chromium } from 'playwright';
import { program } from 'commander';
import inquirer from 'inquirer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CAPTURES_DIR = path.resolve(__dirname, '../../captures');

class FlowCapture {
  constructor(options) {
    this.projectName = options.name || 'default';
    this.flowName = options.flow || null;
    this.parentId = options.parent || null;
    this.url = options.url || null;
    this.connectToChrome = options.connectChrome || false;
    this.interactive = options.interactive || false;
    this.automated = options.auto || false;
    this.stepsJson = options.steps || null;
    this.headless = options.headless || false;
    this.fullPage = options.fullPage || false;

    // Crawl mode options
    this.crawlMode = options.crawl || false;
    this.maxDepth = parseInt(options.depth) || 2;
    this.maxPages = parseInt(options.maxPages) || 50;
    this.excludePatterns = options.exclude ? options.exclude.split(',').map(p => p.trim()) : [];

    this.browser = null;
    this.context = null;
    this.page = null;
    this.steps = [];
    this.stepCounter = 0;
    this.projectDir = null;
    this.flowId = null;

    // Crawl state
    this.visitedUrls = new Set();
    this.crawlTree = new Map(); // URL -> { parent, depth, children, step }
  }

  async init() {
    // Create project directory
    this.projectDir = path.join(CAPTURES_DIR, this.projectName);
    await fs.mkdir(this.projectDir, { recursive: true });

    if (this.connectToChrome) {
      // Connect to existing Chrome running with --remote-debugging-port=9222
      try {
        console.log('Connecting to Chrome via CDP at localhost:9222...');
        this.browser = await chromium.connectOverCDP('http://localhost:9222');
        const contexts = this.browser.contexts();

        if (contexts.length === 0) {
          console.log('No existing contexts found, creating new one...');
          this.context = await this.browser.newContext();
        } else {
          console.log(`Found ${contexts.length} existing context(s), using first one...`);
          this.context = contexts[0];
        }

        // Create new page in the context
        this.page = await this.context.newPage();
        console.log('Successfully connected to Chrome!');
      } catch (error) {
        console.error('Failed to connect to Chrome. Make sure Chrome is running with:');
        console.error('/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222');
        throw error;
      }
    } else {
      // Launch new browser
      console.log('Launching new browser...');
      this.browser = await chromium.launch({ headless: this.headless });
      this.context = await this.browser.newContext({
        viewport: { width: 1280, height: 800 }
      });
      this.page = await this.context.newPage();
    }

    // Navigate to URL if provided
    if (this.url) {
      console.log(`Navigating to ${this.url}...`);
      await this.page.goto(this.url, { waitUntil: 'networkidle' });
    }
  }

  async captureScreen(name, description = '') {
    this.stepCounter++;
    const filename = `${String(this.stepCounter).padStart(3, '0')}-${this.slugify(name)}.png`;
    const filepath = path.join(this.projectDir, filename);

    await this.page.screenshot({
      path: filepath,
      fullPage: this.fullPage
    });

    const step = {
      order: this.stepCounter,
      name,
      description,
      filename,
      url: this.page.url(),
      timestamp: new Date().toISOString()
    };

    this.steps.push(step);
    console.log(`Captured: ${filename}`);

    return step;
  }

  slugify(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
  }

  normalizeUrl(url) {
    try {
      const parsed = new URL(url);
      // Remove fragment and trailing slash
      parsed.hash = '';
      let normalized = parsed.href;
      if (normalized.endsWith('/') && parsed.pathname !== '/') {
        normalized = normalized.slice(0, -1);
      }
      return normalized;
    } catch {
      return null;
    }
  }

  isValidCrawlUrl(url, baseOrigin) {
    if (!url) return false;

    try {
      const parsed = new URL(url);

      // Must be same origin
      if (parsed.origin !== baseOrigin) return false;

      // Skip common non-page URLs
      const skipProtocols = ['javascript:', 'mailto:', 'tel:', 'data:'];
      if (skipProtocols.some(p => url.startsWith(p))) return false;

      // Skip file downloads
      const skipExtensions = ['.pdf', '.zip', '.tar', '.gz', '.rar', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.jpg', '.jpeg', '.png', '.gif', '.svg', '.mp3', '.mp4', '.avi', '.mov'];
      const pathname = parsed.pathname.toLowerCase();
      if (skipExtensions.some(ext => pathname.endsWith(ext))) return false;

      // Check exclude patterns
      for (const pattern of this.excludePatterns) {
        if (url.includes(pattern)) return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  async discoverLinks(baseOrigin) {
    const links = new Set();

    try {
      const anchors = await this.page.locator('a[href]').all();
      for (const anchor of anchors) {
        try {
          const href = await anchor.getAttribute('href');
          if (!href) continue;

          // Resolve relative URLs
          let absoluteUrl;
          try {
            absoluteUrl = new URL(href, this.page.url()).href;
          } catch {
            continue;
          }

          const normalized = this.normalizeUrl(absoluteUrl);
          if (normalized && this.isValidCrawlUrl(normalized, baseOrigin)) {
            links.add(normalized);
          }
        } catch {
          // Skip links that cause errors
        }
      }
    } catch (error) {
      console.error('Error discovering links:', error.message);
    }

    return Array.from(links);
  }

  async runCrawl() {
    if (!this.url) {
      throw new Error('URL is required for crawl mode');
    }

    const baseUrl = new URL(this.url);
    const baseOrigin = baseUrl.origin;
    const seedUrl = this.normalizeUrl(this.url);

    console.log(`\n--- Crawl Mode ---`);
    console.log(`Seed URL: ${seedUrl}`);
    console.log(`Max depth: ${this.maxDepth}`);
    console.log(`Max pages: ${this.maxPages}`);
    if (this.excludePatterns.length > 0) {
      console.log(`Exclude patterns: ${this.excludePatterns.join(', ')}`);
    }
    console.log('');

    // BFS queue: { url, depth, parentUrl }
    const queue = [{ url: seedUrl, depth: 0, parentUrl: null }];
    this.visitedUrls.add(seedUrl);

    while (queue.length > 0 && this.steps.length < this.maxPages) {
      const { url, depth, parentUrl } = queue.shift();

      console.log(`[${this.steps.length + 1}/${this.maxPages}] Depth ${depth}: ${url}`);

      try {
        await this.page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

        // Generate step name from URL path
        const urlObj = new URL(url);
        let stepName = urlObj.pathname === '/' ? 'Home' : urlObj.pathname.replace(/^\/|\/$/g, '').replace(/\//g, ' - ');
        if (!stepName) stepName = 'Home';

        const step = await this.captureScreen(stepName);

        // Store crawl tree info
        this.crawlTree.set(url, {
          parent: parentUrl,
          depth,
          children: [],
          step
        });

        // Update parent's children
        if (parentUrl && this.crawlTree.has(parentUrl)) {
          this.crawlTree.get(parentUrl).children.push(url);
        }

        // Discover links if we haven't reached max depth
        if (depth < this.maxDepth && this.steps.length < this.maxPages) {
          const links = await this.discoverLinks(baseOrigin);

          for (const link of links) {
            if (!this.visitedUrls.has(link) && this.steps.length + queue.length < this.maxPages) {
              this.visitedUrls.add(link);
              queue.push({ url: link, depth: depth + 1, parentUrl: url });
            }
          }
        }
      } catch (error) {
        console.error(`  Error capturing ${url}: ${error.message}`);
      }
    }

    console.log(`\nCrawl complete: captured ${this.steps.length} page(s)`);
  }

  buildHierarchicalFlows() {
    // Find root URLs (no parent)
    const rootUrls = [];
    for (const [url, info] of this.crawlTree) {
      if (info.parent === null) {
        rootUrls.push(url);
      }
    }

    const buildFlow = (url) => {
      const info = this.crawlTree.get(url);
      if (!info || !info.step) return null;

      const flow = {
        id: this.slugify(info.step.name || `page-${info.step.order}`),
        name: info.step.name,
        capturedAt: info.step.timestamp,
        steps: [info.step]
      };

      if (info.children.length > 0) {
        flow.children = info.children
          .map(childUrl => buildFlow(childUrl))
          .filter(Boolean);
      }

      return flow;
    };

    // Build flows from root URLs
    return rootUrls.map(url => buildFlow(url)).filter(Boolean);
  }

  async saveCrawlManifest() {
    const manifestPath = path.join(this.projectDir, 'manifest.json');
    let manifest = { projectName: this.projectName, flows: [] };

    // Load existing manifest if it exists
    try {
      const existing = await fs.readFile(manifestPath, 'utf-8');
      manifest = JSON.parse(existing);
    } catch {
      // No existing manifest
    }

    // Build hierarchical structure from crawl tree
    const crawlFlows = this.buildHierarchicalFlows();

    // Create a parent flow for the crawl
    const crawlFlow = {
      id: this.slugify(this.flowName || `crawl-${Date.now()}`),
      name: this.flowName || 'Site Crawl',
      capturedAt: new Date().toISOString(),
      steps: [],
      children: crawlFlows
    };

    // Add to manifest
    const existingIndex = manifest.flows.findIndex(f => f.id === crawlFlow.id);
    if (existingIndex >= 0) {
      manifest.flows[existingIndex] = crawlFlow;
    } else {
      manifest.flows.push(crawlFlow);
    }

    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`Manifest saved to ${manifestPath}`);
  }

  async saveManifest() {
    const manifestPath = path.join(this.projectDir, 'manifest.json');
    let manifest = { projectName: this.projectName, flows: [] };

    // Load existing manifest if it exists
    try {
      const existing = await fs.readFile(manifestPath, 'utf-8');
      manifest = JSON.parse(existing);
    } catch (e) {
      // No existing manifest
    }

    // Generate flow ID
    this.flowId = this.slugify(this.flowName || `flow-${Date.now()}`);

    const flowData = {
      id: this.flowId,
      name: this.flowName || 'Unnamed Flow',
      capturedAt: new Date().toISOString(),
      steps: this.steps
    };

    if (this.parentId) {
      // Add as child of parent flow
      const addToParent = (flows) => {
        for (const flow of flows) {
          if (flow.id === this.parentId) {
            flow.children = flow.children || [];
            flow.children.push(flowData);
            return true;
          }
          if (flow.children && addToParent(flow.children)) {
            return true;
          }
        }
        return false;
      };

      if (!addToParent(manifest.flows)) {
        console.warn(`Parent flow '${this.parentId}' not found. Adding as top-level flow.`);
        manifest.flows.push(flowData);
      }
    } else {
      // Add as top-level flow or update existing
      const existingIndex = manifest.flows.findIndex(f => f.id === this.flowId);
      if (existingIndex >= 0) {
        manifest.flows[existingIndex] = { ...manifest.flows[existingIndex], ...flowData };
      } else {
        manifest.flows.push(flowData);
      }
    }

    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`Manifest saved to ${manifestPath}`);
  }

  async runInteractive() {
    console.log('\n--- Interactive Flow Capture ---');
    console.log('Commands:');
    console.log('  capture <name> - Take a screenshot with name');
    console.log('  goto <url>     - Navigate to URL');
    console.log('  wait <ms>      - Wait for milliseconds');
    console.log('  done           - Save and exit\n');

    let running = true;

    while (running) {
      const { command } = await inquirer.prompt([{
        type: 'input',
        name: 'command',
        message: '>',
        prefix: ''
      }]);

      const parts = command.trim().split(/\s+/);
      const cmd = parts[0]?.toLowerCase();
      const args = parts.slice(1).join(' ');

      try {
        switch (cmd) {
          case 'capture':
          case 'c':
            if (!args) {
              console.log('Usage: capture <name>');
            } else {
              await this.captureScreen(args);
            }
            break;

          case 'goto':
          case 'g':
            if (!args) {
              console.log('Usage: goto <url>');
            } else {
              const url = args.startsWith('http') ? args : `https://${args}`;
              console.log(`Navigating to ${url}...`);
              await this.page.goto(url, { waitUntil: 'networkidle' });
              console.log('Done.');
            }
            break;

          case 'click':
            if (!args) {
              console.log('Usage: click <selector>');
            } else {
              await this.page.click(args);
              console.log(`Clicked: ${args}`);
            }
            break;

          case 'wait':
          case 'w':
            const ms = parseInt(args) || 1000;
            console.log(`Waiting ${ms}ms...`);
            await this.page.waitForTimeout(ms);
            break;

          case 'scroll':
            const pixels = parseInt(args) || 500;
            await this.page.evaluate((p) => window.scrollBy(0, p), pixels);
            console.log(`Scrolled ${pixels}px`);
            break;

          case 'done':
          case 'exit':
          case 'q':
            running = false;
            break;

          case 'help':
          case 'h':
            console.log('Commands:');
            console.log('  capture/c <name> - Take a screenshot');
            console.log('  goto/g <url>     - Navigate to URL');
            console.log('  click <selector> - Click an element');
            console.log('  scroll <pixels>  - Scroll down');
            console.log('  wait/w <ms>      - Wait for ms');
            console.log('  done/q           - Save and exit');
            break;

          default:
            if (cmd) {
              console.log(`Unknown command: ${cmd}. Type 'help' for commands.`);
            }
        }
      } catch (error) {
        console.error(`Error: ${error.message}`);
      }
    }
  }

  async runAutomated(stepsJson) {
    const steps = stepsJson ? JSON.parse(stepsJson) : [
      { action: 'capture', name: this.flowName || 'screenshot' }
    ];

    console.log(`Running automated capture with ${steps.length} step(s)...`);

    for (const step of steps) {
      try {
        switch (step.action) {
          case 'capture':
            await this.captureScreen(step.name || 'screenshot');
            break;

          case 'goto':
            if (step.url) {
              const url = step.url.startsWith('http') ? step.url : `https://${step.url}`;
              console.log(`Navigating to ${url}...`);
              await this.page.goto(url, { waitUntil: 'networkidle' });
            }
            break;

          case 'click':
            if (step.selector) {
              console.log(`Clicking: ${step.selector}`);
              await this.page.click(step.selector);
            }
            break;

          case 'wait':
            const ms = step.ms || 1000;
            console.log(`Waiting ${ms}ms...`);
            await this.page.waitForTimeout(ms);
            break;

          case 'scroll':
            const pixels = step.pixels || 500;
            await this.page.evaluate((p) => window.scrollBy(0, p), pixels);
            console.log(`Scrolled ${pixels}px`);
            break;

          default:
            console.log(`Unknown action: ${step.action}`);
        }
      } catch (error) {
        console.error(`Error executing step ${step.action}: ${error.message}`);
        throw error;
      }
    }
  }

  async run() {
    try {
      await this.init();

      if (this.crawlMode) {
        await this.runCrawl();
        if (this.steps.length > 0) {
          await this.saveCrawlManifest();
        }
      } else if (this.automated) {
        await this.runAutomated(this.stepsJson);
        if (this.steps.length > 0) {
          await this.saveManifest();
        }
      } else if (this.interactive) {
        await this.runInteractive();
        if (this.steps.length > 0) {
          await this.saveManifest();
        }
      } else if (this.url) {
        // Single capture mode
        await this.captureScreen(this.flowName || 'screenshot');
        if (this.steps.length > 0) {
          await this.saveManifest();
        }
      }

      if (this.steps.length > 0) {
        console.log(`\nCaptured ${this.steps.length} screenshot(s) to ${this.projectDir}`);
      }
    } finally {
      await this.cleanup();
    }
  }

  async cleanup() {
    if (this.page && !this.connectToChrome) {
      await this.page.close().catch(() => {});
    }
    if (this.browser) {
      if (this.connectToChrome) {
        // Just disconnect, don't close
        await this.browser.close().catch(() => {});
      } else {
        await this.browser.close().catch(() => {});
      }
    }
  }
}

// CLI
program
  .name('flow-capture')
  .description('Capture website flows with screenshots')
  .option('-n, --name <name>', 'Project name', 'default')
  .option('-f, --flow <name>', 'Flow name')
  .option('-p, --parent <id>', 'Parent flow ID for nesting')
  .option('-u, --url <url>', 'URL to capture')
  .option('-i, --interactive', 'Interactive mode')
  .option('-a, --auto', 'Automated mode (no interactive prompts)')
  .option('--steps <json>', 'JSON array of steps to execute in auto mode')
  .option('-c, --connect-chrome', 'Connect to existing Chrome via CDP')
  .option('--headless', 'Run in headless mode')
  .option('-F, --full-page', 'Capture full scrollable page instead of viewport')
  .option('--crawl', 'Enable crawl mode to discover and capture pages')
  .option('--depth <n>', 'Max crawl depth (default: 2)', '2')
  .option('--max-pages <n>', 'Max pages to capture (default: 50)', '50')
  .option('--exclude <patterns>', 'Comma-separated URL patterns to skip')
  .action(async (options) => {
    const capture = new FlowCapture(options);
    await capture.run();
  });

program.parse();
