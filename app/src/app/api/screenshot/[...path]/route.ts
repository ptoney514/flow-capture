import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const CAPTURES_DIR = path.resolve(process.cwd(), '../captures');

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathParts } = await params;
  const filePath = path.join(CAPTURES_DIR, ...pathParts);

  // Security: ensure we're still within captures directory
  if (!filePath.startsWith(CAPTURES_DIR)) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 403 });
  }

  try {
    const buffer = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();

    const mimeTypes: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}
