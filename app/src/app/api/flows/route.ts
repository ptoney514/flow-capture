import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import type { Project, ProjectWithPath } from '@/lib/flows';

const CAPTURES_DIR = path.resolve(process.cwd(), '../captures');

async function getProjects(): Promise<ProjectWithPath[]> {
  const projects: ProjectWithPath[] = [];

  try {
    const entries = await fs.readdir(CAPTURES_DIR, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const manifestPath = path.join(CAPTURES_DIR, entry.name, 'manifest.json');
        try {
          const content = await fs.readFile(manifestPath, 'utf-8');
          const project = JSON.parse(content) as Project;
          projects.push({
            ...project,
            path: entry.name
          });
        } catch {
          // No manifest, skip
        }
      }
    }
  } catch {
    // Captures dir doesn't exist
  }

  return projects;
}

async function getProject(name: string): Promise<ProjectWithPath | null> {
  const manifestPath = path.join(CAPTURES_DIR, name, 'manifest.json');

  try {
    const content = await fs.readFile(manifestPath, 'utf-8');
    const project = JSON.parse(content) as Project;
    return {
      ...project,
      path: name
    };
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const project = searchParams.get('project');

  if (project) {
    const data = await getProject(project);
    if (!data) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    return NextResponse.json(data);
  }

  const projects = await getProjects();
  return NextResponse.json(projects);
}
