'use client';

import { useState, useEffect, useRef } from 'react';
import type { ProjectWithPath, Flow } from '@/lib/flows';

interface ProjectSelectorProps {
  projects: ProjectWithPath[];
  selectedProject: ProjectWithPath | null;
  onSelectProject: (project: ProjectWithPath | null) => void;
  onDeleteClick: (project: ProjectWithPath) => void;
}

function countFlows(flows: Flow[]): number {
  let count = flows.length;
  for (const flow of flows) {
    if (flow.children) {
      count += countFlows(flow.children);
    }
  }
  return count;
}

export function ProjectSelector({
  projects,
  selectedProject,
  onSelectProject,
  onDeleteClick,
}: ProjectSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleSelectProject = (project: ProjectWithPath) => {
    onSelectProject(project);
    setIsOpen(false);
  };

  const handleDeleteClick = (e: React.MouseEvent, project: ProjectWithPath) => {
    e.stopPropagation();
    setIsOpen(false);
    onDeleteClick(project);
  };

  return (
    <div className="relative" ref={dropdownRef} data-testid="project-selector">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm text-left flex items-center justify-between hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        data-testid="project-selector-button"
      >
        <span className="flex items-center gap-2 truncate">
          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <span className="truncate">
            {selectedProject?.projectName || 'Select a project'}
          </span>
          {selectedProject && (
            <span className="text-gray-400 text-xs">
              ({countFlows(selectedProject.flows)} flows)
            </span>
          )}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto"
          data-testid="project-dropdown"
        >
          {projects.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">
              No projects found
            </div>
          ) : (
            projects.map((project) => (
              <div
                key={project.path}
                className={`flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-50 ${
                  selectedProject?.path === project.path ? 'bg-blue-50' : ''
                }`}
                onClick={() => handleSelectProject(project)}
                data-testid={`project-option-${project.projectName}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-900 truncate">
                      {project.projectName}
                    </span>
                    {selectedProject?.path === project.path && (
                      <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {countFlows(project.flows)} flow{countFlows(project.flows) !== 1 ? 's' : ''}
                  </div>
                </div>
                <button
                  onClick={(e) => handleDeleteClick(e, project)}
                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                  title="Delete project"
                  data-testid={`delete-project-${project.projectName}`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
