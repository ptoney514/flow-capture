'use client';

import { useState, useEffect, useCallback } from 'react';
import { FlowTree } from '@/components/FlowTree';
import { ScreenGrid } from '@/components/ScreenGrid';
import { FlowBreadcrumb } from '@/components/FlowBreadcrumb';
import { NewCaptureModal } from '@/components/NewCaptureModal';
import { ProjectSelector } from '@/components/ProjectSelector';
import { DeleteProjectModal } from '@/components/DeleteProjectModal';
import { Flow, ProjectWithPath, getFlowPath, Step } from '@/lib/flows';

export default function Home() {
  const [projects, setProjects] = useState<ProjectWithPath[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectWithPath | null>(null);
  const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCaptureModal, setShowCaptureModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<ProjectWithPath | null>(null);

  const fetchProjects = useCallback(() => {
    fetch('/api/flows')
      .then((res) => res.json())
      .then((data) => {
        setProjects(data);
        if (data.length > 0 && !selectedProject) {
          setSelectedProject(data[0]);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedProject]);

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCaptureStarted = () => {
    // Refresh projects after a short delay to pick up new captures
    setTimeout(fetchProjects, 2000);
  };

  const handleDeleteClick = (project: ProjectWithPath) => {
    setProjectToDelete(project);
    setShowDeleteModal(true);
  };

  const handleDeleteProject = async (projectName: string) => {
    const response = await fetch(`/api/projects/${encodeURIComponent(projectName)}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to delete project');
    }

    // If the deleted project was selected, clear selection
    if (selectedProject?.projectName === projectName) {
      setSelectedProject(null);
      setSelectedFlow(null);
    }

    // Refresh the projects list
    fetchProjects();
  };

  const filteredFlows = selectedProject?.flows.filter((flow) =>
    flow.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const flowPath = selectedFlow && selectedProject
    ? getFlowPath(selectedProject.flows, selectedFlow.id) || []
    : [];

  const getAllSteps = (flow: Flow): Step[] => {
    let steps = [...(flow.steps || [])];
    if (flow.children) {
      for (const child of flow.children) {
        steps = steps.concat(getAllSteps(child));
      }
    }
    return steps;
  };

  const currentSteps = selectedFlow ? getAllSteps(selectedFlow) : [];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-gray-900">Flow Viewer</h1>
            <button
              onClick={() => setShowCaptureModal(true)}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New
            </button>
          </div>
        </div>

        {/* Project Selector */}
        <div className="p-3 border-b border-gray-200">
          <ProjectSelector
            projects={projects}
            selectedProject={selectedProject}
            onSelectProject={(project) => {
              setSelectedProject(project);
              setSelectedFlow(null);
            }}
            onDeleteClick={handleDeleteClick}
          />
        </div>

        {/* Search */}
        <div className="p-3 border-b border-gray-200">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search flows..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-md text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Flow Tree */}
        <div className="flex-1 overflow-y-auto">
          <FlowTree
            flows={filteredFlows}
            selectedFlowId={selectedFlow?.id || null}
            onSelectFlow={setSelectedFlow}
          />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-y-auto">
        {selectedProject ? (
          <>
            <FlowBreadcrumb
              path={flowPath}
              onNavigate={(flow) => setSelectedFlow(flow)}
            />

            {selectedFlow ? (
              <>
                <div className="mb-6">
                  <h2 className="text-2xl font-semibold text-gray-900">{selectedFlow.name}</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {currentSteps.length} screenshot{currentSteps.length !== 1 ? 's' : ''}
                    {selectedFlow.capturedAt && (
                      <> · Captured {new Date(selectedFlow.capturedAt).toLocaleDateString()}</>
                    )}
                  </p>
                </div>
                <ScreenGrid steps={currentSteps} projectPath={selectedProject.path} />
              </>
            ) : (
              <div className="text-center py-16">
                <svg
                  className="w-16 h-16 mx-auto text-gray-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-gray-900">Select a flow</h3>
                <p className="mt-2 text-gray-500">
                  Choose a flow from the sidebar to view its screenshots
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <svg
              className="w-16 h-16 mx-auto text-gray-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No captures yet</h3>
            <p className="mt-2 text-gray-500">
              Start capturing your first flow
            </p>
            <button
              onClick={() => setShowCaptureModal(true)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              New Capture
            </button>
          </div>
        )}
      </main>

      {/* Capture Modal */}
      <NewCaptureModal
        isOpen={showCaptureModal}
        onClose={() => setShowCaptureModal(false)}
        existingProjects={projects.map((p) => p.projectName)}
        onCaptureStarted={handleCaptureStarted}
      />

      {/* Delete Project Modal */}
      <DeleteProjectModal
        isOpen={showDeleteModal}
        project={projectToDelete}
        onClose={() => {
          setShowDeleteModal(false);
          setProjectToDelete(null);
        }}
        onConfirm={handleDeleteProject}
      />
    </div>
  );
}
