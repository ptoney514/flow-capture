'use client';

import { Flow } from '@/lib/flows';

interface FlowBreadcrumbProps {
  path: Flow[];
  onNavigate: (flow: Flow | null) => void;
}

export function FlowBreadcrumb({ path, onNavigate }: FlowBreadcrumbProps) {
  if (path.length === 0) return null;

  return (
    <nav className="flex items-center text-sm text-gray-600 mb-4">
      <button
        className="hover:text-blue-600"
        onClick={() => onNavigate(null)}
      >
        All Flows
      </button>
      {path.map((flow, index) => (
        <span key={flow.id} className="flex items-center">
          <svg className="w-4 h-4 mx-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          {index === path.length - 1 ? (
            <span className="text-gray-900 font-medium">{flow.name}</span>
          ) : (
            <button
              className="hover:text-blue-600"
              onClick={() => onNavigate(flow)}
            >
              {flow.name}
            </button>
          )}
        </span>
      ))}
    </nav>
  );
}
