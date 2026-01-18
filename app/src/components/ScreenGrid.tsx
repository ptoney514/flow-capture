'use client';

import { useState } from 'react';
import { Step, getScreenshotUrl } from '@/lib/flows';
import { ScreenCard } from './ScreenCard';

interface ScreenGridProps {
  steps: Step[];
  projectPath: string;
}

interface LightboxProps {
  step: Step;
  projectPath: string;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}

function Lightbox({ step, projectPath, onClose, onPrev, onNext }: LightboxProps) {
  const imageUrl = getScreenshotUrl(projectPath, step.filename);

  return (
    <div
      className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 text-white/80 hover:text-white"
        onClick={onClose}
      >
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {onPrev && (
        <button
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white p-2"
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
        >
          <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {onNext && (
        <button
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white p-2"
          onClick={(e) => { e.stopPropagation(); onNext(); }}
        >
          <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      <div className="max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <img
          src={imageUrl}
          alt={step.name}
          className="max-w-full max-h-[85vh] object-contain"
        />
        <div className="text-center mt-4 text-white">
          <h3 className="text-lg font-medium">{step.name}</h3>
          <p className="text-sm text-white/70 mt-1">{step.url}</p>
        </div>
      </div>
    </div>
  );
}

export function ScreenGrid({ steps, projectPath }: ScreenGridProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (steps.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No screenshots in this flow
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {steps.map((step, index) => (
          <ScreenCard
            key={step.filename}
            step={step}
            projectPath={projectPath}
            onClick={() => setLightboxIndex(index)}
          />
        ))}
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          step={steps[lightboxIndex]}
          projectPath={projectPath}
          onClose={() => setLightboxIndex(null)}
          onPrev={lightboxIndex > 0 ? () => setLightboxIndex(lightboxIndex - 1) : undefined}
          onNext={lightboxIndex < steps.length - 1 ? () => setLightboxIndex(lightboxIndex + 1) : undefined}
        />
      )}
    </>
  );
}
