import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

// Paths
export const ROOT_DIR = path.resolve(__dirname, '../..');
export const CAPTURES_DIR = path.join(ROOT_DIR, 'captures');
export const FLOW_CAPTURE_DIR = path.join(ROOT_DIR, 'flow-capture');
export const CAPTURE_SCRIPT = path.join(FLOW_CAPTURE_DIR, 'src', 'capture.js');
export const APP_DIR = path.join(ROOT_DIR, 'app');

// Test URL - a stable external site for testing
export const TEST_URL = 'https://example.com';

// Generate unique test project names to avoid conflicts
export function generateTestProjectName(prefix = 'e2e-test'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

// Run capture.js with specified arguments
export async function runCapture(
  args: string[],
  options: { timeout?: number } = {}
): Promise<{ stdout: string; stderr: string }> {
  const command = `node ${CAPTURE_SCRIPT} ${args.join(' ')}`;
  const timeout = options.timeout || 60000; // Default 60 second timeout
  try {
    const result = await execAsync(command, {
      cwd: FLOW_CAPTURE_DIR,
      timeout,
    });
    return result;
  } catch (error: unknown) {
    const execError = error as { stdout?: string; stderr?: string; message: string };
    // Return stdout/stderr even on non-zero exit code
    if (execError.stdout !== undefined || execError.stderr !== undefined) {
      return {
        stdout: execError.stdout || '',
        stderr: execError.stderr || '',
      };
    }
    throw error;
  }
}

// Read manifest.json for a project
export async function readManifest(projectName: string): Promise<Manifest | null> {
  const manifestPath = path.join(CAPTURES_DIR, projectName, 'manifest.json');
  try {
    const content = await fs.readFile(manifestPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

// Check if screenshot file exists
export async function screenshotExists(projectName: string, filename: string): Promise<boolean> {
  const filepath = path.join(CAPTURES_DIR, projectName, filename);
  try {
    await fs.access(filepath);
    return true;
  } catch {
    return false;
  }
}

// Clean up test project directory
export async function cleanupTestProject(projectName: string): Promise<void> {
  const projectDir = path.join(CAPTURES_DIR, projectName);
  try {
    await fs.rm(projectDir, { recursive: true, force: true });
  } catch {
    // Ignore if doesn't exist
  }
}

// Types matching the app's types
export interface Step {
  order: number;
  name: string;
  description?: string;
  filename: string;
  url: string;
  timestamp?: string;
}

export interface Flow {
  id: string;
  name: string;
  capturedAt?: string;
  steps: Step[];
  children?: Flow[];
}

export interface Manifest {
  projectName: string;
  flows: Flow[];
}

// API helper to make requests to the Next.js server
export async function apiRequest(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  return fetch(`${baseUrl}${path}`, options);
}

// Wait for a condition to be true
export async function waitFor(
  condition: () => Promise<boolean>,
  timeout = 10000,
  interval = 500
): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await condition()) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  return false;
}
