import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const CAPTURES_DIR = path.resolve(process.cwd(), '../captures');

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name: projectName } = await params;

  // Security: Validate project name (alphanumeric, hyphens, underscores only)
  if (!/^[a-zA-Z0-9_-]+$/.test(projectName)) {
    return NextResponse.json(
      { error: 'Invalid project name' },
      { status: 400 }
    );
  }

  // Security: Ensure path is within CAPTURES_DIR (prevent path traversal)
  const projectDir = path.join(CAPTURES_DIR, projectName);
  const resolvedPath = path.resolve(projectDir);
  const resolvedCapturesDir = path.resolve(CAPTURES_DIR);

  if (!resolvedPath.startsWith(resolvedCapturesDir + path.sep)) {
    return NextResponse.json(
      { error: 'Invalid project path' },
      { status: 400 }
    );
  }

  // Check if project exists
  try {
    await fs.access(projectDir);
  } catch {
    return NextResponse.json(
      { error: 'Project not found' },
      { status: 404 }
    );
  }

  // Delete project directory recursively
  try {
    await fs.rm(projectDir, { recursive: true, force: true });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    );
  }
}
