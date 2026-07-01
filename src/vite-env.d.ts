/// <reference types="vite/client" />

interface StudioHostInfo {
  userDataPath: string;
  appVersion: string;
  packaged: boolean;
}

interface SourceTranscript {
  status: 'ready' | 'empty' | 'missing' | 'unavailable';
  language: string;
  text: string;
  lineCount: number;
  manualTrackCount?: number;
  automaticTrackCount?: number;
  error?: string;
}

interface SourceLinkAnalysis {
  ok: boolean;
  fetchedAt: string;
  analyzer?: string;
  url?: string;
  originalUrl?: string;
  title?: string;
  platform?: string;
  author?: string;
  durationSeconds?: number | null;
  thumbnail?: string;
  description?: string;
  transcript?: SourceTranscript;
  voice?: {
    hasAudio: boolean;
    status: string;
    consentRequired: boolean;
  };
  action?: {
    status: string;
    readyForAdapter: boolean;
  };
  message?: string;
  installHint?: string;
}

interface Window {
  studioHost?: {
    getHostInfo: () => Promise<StudioHostInfo>;
    openExternal: (url: string) => Promise<boolean>;
    analyzeSourceUrl: (url: string) => Promise<SourceLinkAnalysis>;
  };
}
