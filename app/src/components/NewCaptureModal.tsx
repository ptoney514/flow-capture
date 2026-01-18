'use client';

import { useState, useEffect, useRef } from 'react';
import { useRecentUrls } from '@/hooks/useRecentUrls';
import type { ChromeStatusResponse, CaptureStartResponse } from '@/lib/capture';

interface NewCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingProjects: string[];
  onCaptureStarted: () => void;
}

export function NewCaptureModal({
  isOpen,
  onClose,
  existingProjects,
  onCaptureStarted,
}: NewCaptureModalProps) {
  const { recentUrls, addRecentUrl } = useRecentUrls();
  const [url, setUrl] = useState('');
  const [projectName, setProjectName] = useState('');
  const [flowName, setFlowName] = useState('');
  const [needsAuth, setNeedsAuth] = useState(false);
  const [chromeStatus, setChromeStatus] = useState<ChromeStatusResponse | null>(null);
  const [checkingChrome, setCheckingChrome] = useState(false);
  const [launchingChrome, setLaunchingChrome] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const [showRecentUrls, setShowRecentUrls] = useState(false);
  const [showProjectSuggestions, setShowProjectSuggestions] = useState(false);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Check Chrome status when auth is needed
  useEffect(() => {
    if (needsAuth && !chromeStatus) {
      checkChromeStatus();
    }
  }, [needsAuth, chromeStatus]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowRecentUrls(false);
        setShowProjectSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setUrl('');
      setProjectName('');
      setFlowName('');
      setNeedsAuth(false);
      setChromeStatus(null);
      setError('');
    }
  }, [isOpen]);

  const checkChromeStatus = async () => {
    setCheckingChrome(true);
    try {
      const res = await fetch('/api/capture/chrome-status');
      const data: ChromeStatusResponse = await res.json();
      setChromeStatus(data);
    } catch {
      setChromeStatus({ available: false, message: 'Failed to check Chrome status' });
    }
    setCheckingChrome(false);
  };

  const launchChrome = async () => {
    setLaunchingChrome(true);
    setError('');
    try {
      const res = await fetch('/api/capture/launch-chrome', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setChromeStatus({ available: true, message: data.message });
      } else {
        setError(data.message);
      }
    } catch {
      setError('Failed to launch Chrome');
    }
    setLaunchingChrome(false);
  };

  const startCapture = async () => {
    if (!url || !projectName || !flowName) {
      setError('Please fill in all fields');
      return;
    }

    setStarting(true);
    setError('');

    try {
      const res = await fetch('/api/capture/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          projectName,
          flowName,
          connectChrome: needsAuth,
        }),
      });

      const data: CaptureStartResponse = await res.json();

      if (data.success) {
        addRecentUrl({ url, projectName, flowName });
        onCaptureStarted();
        onClose();
      } else {
        setError(data.message);
      }
    } catch {
      setError('Failed to start capture');
    }
    setStarting(false);
  };

  const selectRecentUrl = (recent: typeof recentUrls[0]) => {
    setUrl(recent.url);
    setProjectName(recent.projectName);
    if (recent.flowName) {
      setFlowName(recent.flowName);
    }
    setShowRecentUrls(false);
  };

  const filteredProjects = existingProjects.filter(
    (p) => p.toLowerCase().includes(projectName.toLowerCase()) && p !== projectName
  );

  const canStart = url && projectName && flowName && (!needsAuth || chromeStatus?.available);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4" ref={dropdownRef}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">New Capture</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          {/* URL Input */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              URL to capture
            </label>
            <input
              ref={urlInputRef}
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onFocus={() => recentUrls.length > 0 && setShowRecentUrls(true)}
              placeholder="https://example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {/* Recent URLs Dropdown */}
            {showRecentUrls && recentUrls.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                <div className="px-3 py-2 text-xs font-medium text-gray-500 bg-gray-50">
                  Recent URLs
                </div>
                {recentUrls.map((recent, i) => (
                  <button
                    key={i}
                    onClick={() => selectRecentUrl(recent)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 border-t border-gray-100"
                  >
                    <div className="truncate text-gray-900">{recent.url}</div>
                    <div className="text-xs text-gray-500">
                      {recent.projectName} {recent.flowName && `/ ${recent.flowName}`}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Project Name */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project name
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              onFocus={() => existingProjects.length > 0 && setShowProjectSuggestions(true)}
              onBlur={() => setTimeout(() => setShowProjectSuggestions(false), 150)}
              placeholder="my-app"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {/* Project Suggestions */}
            {showProjectSuggestions && filteredProjects.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-32 overflow-y-auto">
                {filteredProjects.map((project) => (
                  <button
                    key={project}
                    onClick={() => {
                      setProjectName(project);
                      setShowProjectSuggestions(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                  >
                    {project}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Flow Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Flow name
            </label>
            <input
              type="text"
              value={flowName}
              onChange={(e) => setFlowName(e.target.value)}
              placeholder="Login Flow"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Authentication Question */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Do you need to be logged in?
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="auth"
                  checked={!needsAuth}
                  onChange={() => setNeedsAuth(false)}
                  className="text-blue-600"
                />
                <span className="text-sm text-gray-700">No - public pages</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="auth"
                  checked={needsAuth}
                  onChange={() => setNeedsAuth(true)}
                  className="text-blue-600"
                />
                <span className="text-sm text-gray-700">Yes - need to log in</span>
              </label>
            </div>
          </div>

          {/* Chrome Setup Section */}
          {needsAuth && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Chrome Setup</h3>
              <p className="text-xs text-gray-600 mb-3">
                To capture authenticated pages, we need to connect to your Chrome browser where you're already logged in.
              </p>

              {checkingChrome ? (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Checking Chrome status...
                </div>
              ) : chromeStatus?.available ? (
                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {chromeStatus.message}
                </div>
              ) : (
                <div className="space-y-3">
                  <button
                    onClick={launchChrome}
                    disabled={launchingChrome}
                    className="w-full px-4 py-2 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {launchingChrome ? 'Launching Chrome...' : 'Launch Chrome for Me'}
                  </button>
                  <div className="text-xs text-gray-500">
                    <p className="font-medium mb-1">Or launch manually:</p>
                    <code className="block bg-gray-200 px-2 py-1 rounded text-[10px] break-all">
                      /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222
                    </code>
                  </div>
                  <button
                    onClick={checkChromeStatus}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Check again
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
          >
            Cancel
          </button>
          <button
            onClick={startCapture}
            disabled={!canStart || starting}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {starting ? 'Starting...' : 'Start Capture'}
          </button>
        </div>
      </div>
    </div>
  );
}
