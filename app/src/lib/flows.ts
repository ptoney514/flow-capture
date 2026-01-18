// Types and client-safe utilities only - no Node.js imports

export interface Step {
  order: number;
  name: string;
  description?: string;
  filename: string;
  url: string;
  timestamp: string;
}

export interface Flow {
  id: string;
  name: string;
  capturedAt?: string;
  steps: Step[];
  children?: Flow[];
}

export interface Project {
  projectName: string;
  flows: Flow[];
}

export interface ProjectWithPath extends Project {
  path: string;
}

export function countSteps(flow: Flow): number {
  let count = flow.steps?.length || 0;
  if (flow.children) {
    for (const child of flow.children) {
      count += countSteps(child);
    }
  }
  return count;
}

export function findFlow(flows: Flow[], id: string): Flow | null {
  for (const flow of flows) {
    if (flow.id === id) {
      return flow;
    }
    if (flow.children) {
      const found = findFlow(flow.children, id);
      if (found) return found;
    }
  }
  return null;
}

export function getFlowPath(flows: Flow[], targetId: string, path: Flow[] = []): Flow[] | null {
  for (const flow of flows) {
    if (flow.id === targetId) {
      return [...path, flow];
    }
    if (flow.children) {
      const found = getFlowPath(flow.children, targetId, [...path, flow]);
      if (found) return found;
    }
  }
  return null;
}

export function getScreenshotUrl(projectPath: string, filename: string): string {
  return `/api/screenshot/${projectPath}/${filename}`;
}
