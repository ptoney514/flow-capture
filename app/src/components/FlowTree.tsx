'use client';

import { useState } from 'react';
import { Flow, countSteps } from '@/lib/flows';

interface FlowTreeProps {
  flows: Flow[];
  selectedFlowId: string | null;
  onSelectFlow: (flow: Flow) => void;
}

interface FlowNodeProps {
  flow: Flow;
  depth: number;
  selectedFlowId: string | null;
  onSelectFlow: (flow: Flow) => void;
}

function FlowNode({ flow, depth, selectedFlowId, onSelectFlow }: FlowNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = flow.children && flow.children.length > 0;
  const stepCount = countSteps(flow);
  const isSelected = selectedFlowId === flow.id;

  return (
    <div>
      <div
        className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-gray-100 ${
          isSelected ? 'bg-blue-50 text-blue-700' : ''
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => onSelectFlow(flow)}
      >
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="w-4 h-4 flex items-center justify-center text-gray-500 hover:text-gray-700"
          >
            <svg
              className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
        {!hasChildren && <span className="w-4" />}
        <span className="flex-1 truncate text-sm">{flow.name}</span>
        <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
          {stepCount}
        </span>
      </div>
      {hasChildren && expanded && (
        <div>
          {flow.children!.map((child) => (
            <FlowNode
              key={child.id}
              flow={child}
              depth={depth + 1}
              selectedFlowId={selectedFlowId}
              onSelectFlow={onSelectFlow}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FlowTree({ flows, selectedFlowId, onSelectFlow }: FlowTreeProps) {
  return (
    <div className="py-2">
      {flows.length === 0 ? (
        <div className="px-4 py-8 text-center text-gray-500 text-sm">
          No flows captured yet
        </div>
      ) : (
        flows.map((flow) => (
          <FlowNode
            key={flow.id}
            flow={flow}
            depth={0}
            selectedFlowId={selectedFlowId}
            onSelectFlow={onSelectFlow}
          />
        ))
      )}
    </div>
  );
}
