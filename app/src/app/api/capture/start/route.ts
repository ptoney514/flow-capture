import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';
import { randomUUID } from 'crypto';
import type { CaptureStartRequest, CaptureStartResponse } from '@/lib/capture';

// Escape shell argument to prevent injection
function escapeShellArg(arg: string): string {
  return `'${arg.replace(/'/g, "'\\''")}'`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as CaptureStartRequest;
    const { url, projectName, flowName, connectChrome } = body;

    // Validate required fields
    if (!url || !projectName || !flowName) {
      return NextResponse.json({
        success: false,
        captureId: '',
        message: 'Missing required fields: url, projectName, flowName',
      } satisfies CaptureStartResponse, { status: 400 });
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json({
        success: false,
        captureId: '',
        message: 'Invalid URL provided',
      } satisfies CaptureStartResponse, { status: 400 });
    }

    // Build paths at runtime
    const flowCaptureDir = path.resolve(process.cwd(), '..', 'flow-capture');
    const captureScript = path.join(flowCaptureDir, 'src', 'capture.js');

    // Build the shell command
    const cmdParts = [
      'node',
      escapeShellArg(captureScript),
      '--auto',      // Use automated mode (no interactive prompts)
      '--headless',  // Run headless for automated captures
      '--name', escapeShellArg(projectName),
      '--flow', escapeShellArg(flowName),
      '--url', escapeShellArg(url),
    ];

    if (connectChrome) {
      cmdParts.push('-c');
      // Remove --headless when connecting to Chrome (need visible browser)
      const headlessIndex = cmdParts.indexOf('--headless');
      if (headlessIndex > -1) {
        cmdParts.splice(headlessIndex, 1);
      }
    }

    const captureId = randomUUID();
    const command = cmdParts.join(' ');

    // Run the capture process detached using nohup
    exec(`cd ${escapeShellArg(flowCaptureDir)} && nohup ${command} > /dev/null 2>&1 &`);

    return NextResponse.json({
      success: true,
      captureId,
      message: `Capture started for ${flowName}. A browser window should open shortly.`,
    } satisfies CaptureStartResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      success: false,
      captureId: '',
      message: `Failed to start capture: ${message}`,
    } satisfies CaptureStartResponse, { status: 500 });
  }
}
