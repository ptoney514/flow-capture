// Types for capture functionality

export interface CaptureConfig {
  url: string;
  projectName: string;
  flowName: string;
  connectChrome: boolean;
}

export interface CaptureStartRequest {
  url: string;
  projectName: string;
  flowName: string;
  connectChrome: boolean;
}

export interface CaptureStartResponse {
  success: boolean;
  captureId: string;
  message: string;
}

export interface ChromeStatusResponse {
  available: boolean;
  message: string;
}

export interface LaunchChromeResponse {
  success: boolean;
  message: string;
}

export interface RecentUrl {
  url: string;
  projectName: string;
  flowName?: string;
  lastUsed: string; // ISO date
}
