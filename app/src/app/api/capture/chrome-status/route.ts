import { NextResponse } from 'next/server';
import type { ChromeStatusResponse } from '@/lib/capture';

const CHROME_DEBUG_URL = 'http://localhost:9222/json/version';

export async function GET() {
  try {
    const response = await fetch(CHROME_DEBUG_URL, {
      signal: AbortSignal.timeout(2000),
    });

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json({
        available: true,
        message: `Chrome debugging active (${data.Browser || 'Chrome'})`,
      } satisfies ChromeStatusResponse);
    }

    return NextResponse.json({
      available: false,
      message: 'Chrome debugging port not responding',
    } satisfies ChromeStatusResponse);
  } catch {
    return NextResponse.json({
      available: false,
      message: 'Chrome is not running with debugging enabled',
    } satisfies ChromeStatusResponse);
  }
}
