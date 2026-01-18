'use client';

import { useState, useEffect, useCallback } from 'react';
import type { RecentUrl } from '@/lib/capture';

const STORAGE_KEY = 'flowCapture:recentUrls';
const MAX_RECENT_URLS = 10;

export function useRecentUrls() {
  const [recentUrls, setRecentUrls] = useState<RecentUrl[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setRecentUrls(JSON.parse(stored));
      }
    } catch {
      // Invalid JSON or localStorage unavailable
    }
  }, []);

  // Save a new URL to history
  const addRecentUrl = useCallback((entry: Omit<RecentUrl, 'lastUsed'>) => {
    setRecentUrls((prev) => {
      // Remove existing entry with same URL if present
      const filtered = prev.filter((item) => item.url !== entry.url);

      // Add new entry at the beginning
      const newEntry: RecentUrl = {
        ...entry,
        lastUsed: new Date().toISOString(),
      };

      const updated = [newEntry, ...filtered].slice(0, MAX_RECENT_URLS);

      // Persist to localStorage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // localStorage unavailable or full
      }

      return updated;
    });
  }, []);

  // Clear all recent URLs
  const clearRecentUrls = useCallback(() => {
    setRecentUrls([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // localStorage unavailable
    }
  }, []);

  return {
    recentUrls,
    addRecentUrl,
    clearRecentUrls,
  };
}
