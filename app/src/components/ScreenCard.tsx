'use client';

import { useState } from 'react';
import { Step, getScreenshotUrl } from '@/lib/flows';

interface ScreenCardProps {
  step: Step;
  projectPath: string;
  onClick?: () => void;
}

export function ScreenCard({ step, projectPath, onClick }: ScreenCardProps) {
  const [imageError, setImageError] = useState(false);
  const imageUrl = getScreenshotUrl(projectPath, step.filename);

  return (
    <div
      className="group bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="relative aspect-[16/10] bg-gray-100">
        {imageError ? (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        ) : (
          <img
            src={imageUrl}
            alt={step.name}
            className="w-full h-full object-cover object-top"
            onError={() => setImageError(true)}
          />
        )}
        <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
          {step.order}
        </div>
      </div>
      <div className="p-3">
        <h3 className="font-medium text-sm text-gray-900 truncate">{step.name}</h3>
        {step.description && (
          <p className="text-xs text-gray-500 mt-1 truncate">{step.description}</p>
        )}
        <p className="text-xs text-gray-400 mt-1 truncate">{step.url}</p>
      </div>
    </div>
  );
}
