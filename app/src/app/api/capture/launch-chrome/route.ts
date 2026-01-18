import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import type { LaunchChromeResponse } from '@/lib/capture';

const CHROME_DEBUG_PORT = 9222;

// Chrome paths for different platforms
const CHROME_PATHS: Record<string, string[]> = {
  darwin: [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
  ],
  win32: [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ],
  linux: [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
  ],
};

async function findChrome(): Promise<string | null> {
  const platform = process.platform;
  const paths = CHROME_PATHS[platform] || [];

  for (const chromePath of paths) {
    try {
      const fs = await import('fs/promises');
      await fs.access(chromePath);
      return chromePath;
    } catch {
      // Path doesn't exist, try next
    }
  }
  return null;
}

async function isChromeCdpAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`http://localhost:${CHROME_DEBUG_PORT}/json/version`, {
      signal: AbortSignal.timeout(1000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function POST() {
  // Check if Chrome CDP is already available
  if (await isChromeCdpAvailable()) {
    return NextResponse.json({
      success: true,
      message: 'Chrome is already running with debugging enabled',
    } satisfies LaunchChromeResponse);
  }

  // Find Chrome executable
  const chromePath = await findChrome();
  if (!chromePath) {
    return NextResponse.json({
      success: false,
      message: 'Could not find Chrome installation',
    } satisfies LaunchChromeResponse, { status: 404 });
  }

  try {
    // Spawn Chrome with debugging flag
    const chromeProcess = spawn(chromePath, [
      `--remote-debugging-port=${CHROME_DEBUG_PORT}`,
      '--no-first-run',
      '--no-default-browser-check',
    ], {
      detached: true,
      stdio: 'ignore',
    });

    // Detach so it doesn't get killed when this process ends
    chromeProcess.unref();

    // Wait a moment for Chrome to start
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Verify Chrome started with debugging
    if (await isChromeCdpAvailable()) {
      return NextResponse.json({
        success: true,
        message: 'Chrome launched with debugging enabled',
      } satisfies LaunchChromeResponse);
    }

    return NextResponse.json({
      success: false,
      message: 'Chrome launched but debugging port not available. Try launching manually.',
    } satisfies LaunchChromeResponse, { status: 500 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      success: false,
      message: `Failed to launch Chrome: ${message}`,
    } satisfies LaunchChromeResponse, { status: 500 });
  }
}
