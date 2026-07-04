/// <reference types="vite/client" />

interface StudioHostInfo {
  userDataPath: string;
  appVersion: string;
  packaged: boolean;
}

interface EngineToolState {
  id: string;
  label: string;
  role: string;
  license: string;
  sourceProject: string;
  status: 'ready' | 'missing';
  path: string;
}

interface EngineProviderState {
  id: string;
  label: string;
  status: 'adapter-ready' | 'cli-ready' | 'needs-config' | 'evaluation-only' | 'missing-secret';
  secretEnv: string;
  role: string;
}

interface EngineCapabilities {
  checkedAt: string;
  ready: boolean;
  tools: EngineToolState[];
  whisperModel: string;
  providers: EngineProviderState[];
}

interface SourceTranscript {
  status: 'ready' | 'empty' | 'missing' | 'unavailable' | 'skipped';
  source?: string;
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

interface PreparedSourceMedia {
  durationSeconds: number;
  width: number | null;
  height: number | null;
  videoCodec: string;
  audioCodec: string;
  format: string;
  sizeBytes: number;
}

interface PreparedSource {
  ok: boolean;
  runId: string;
  preparedAt: string;
  workspaceDir?: string;
  files?: {
    originalVideo: string;
    normalizedVideo: string;
    audio: string;
  };
  media?: PreparedSourceMedia | null;
  analysis?: SourceLinkAnalysis;
  transcript?: SourceTranscript & {
    reason?: string;
    path?: string;
  };
  nextAdapters?: string[];
  notes?: string[];
}

interface ProviderRenderResult {
  ok: boolean;
  providerId:
    | 'direct-seedance-2'
    | 'direct-kling-3'
    | 'openai-image-2'
    | 'fal-seedance-reference'
    | 'fal-pixverse-swap'
    | 'mock-local'
    | 'facefusion-local'
    | 'heygen-cloud'
    | 'replicate-cloud';
  providerName: string;
  model?: string;
  status: 'complete' | 'blocked';
  requestId?: string;
  outputUrl?: string;
  outputPath?: string;
  providerPayloadPath?: string;
  error?: string;
  logs?: string[];
  variants?: Array<{
    slot: number;
    avatarName: string;
    requestId?: string;
    outputUrl?: string;
    outputPath?: string;
    status: 'complete' | 'blocked';
    error?: string;
  }>;
  createdAt: string;
}

interface RenderPacket {
  id: string;
  createdAt: string;
  app: 'CopyTok';
  status: 'provider-ready';
  packetPath: string;
  nextRequiredSecret: string;
  providerPackets: Record<string, unknown>;
}

interface TrendScoutStatus {
  checkedAt: string;
  runtimeDir: string;
  databasePath: string;
  providers: Array<{
    id: 'local-demo' | 'apify-tiktok';
    label: string;
    status: 'ready' | 'missing-secret' | 'offline';
    role: string;
    secretName?: string;
  }>;
  cache: {
    runCount: number;
    postCount: number;
    briefCount: number;
  };
}

interface TrendScoutRunResult {
  ok: boolean;
  runId: string;
  providerId: 'local-demo' | 'apify-tiktok';
  appProfileId: 'snapglp' | 'toneclone';
  query: string;
  fetchedAt: string;
  posts: unknown[];
  warnings: string[];
  message: string;
  databasePath?: string;
}

interface TrendAdaptationHostResult {
  id: string;
  createdAt: string;
  appProfileId: 'snapglp' | 'toneclone';
  appName: string;
  postId: string;
  sourceUrl: string;
  sourceLabel: string;
  title: string;
  savedPath?: string;
  mimicPlan: Record<string, unknown>;
}

interface Window {
  studioHost?: {
    getHostInfo: () => Promise<StudioHostInfo>;
    getEngineCapabilities: () => Promise<EngineCapabilities>;
    getFilePath: (file: File) => string;
    openExternal: (url: string) => Promise<boolean>;
    openChatGPTPro: () => Promise<boolean>;
    getTrendScoutStatus: () => Promise<TrendScoutStatus>;
    runTrendScout: (input: unknown) => Promise<TrendScoutRunResult>;
    createTrendAdaptation: (input: unknown) => Promise<TrendAdaptationHostResult>;
    analyzeSourceUrl: (url: string) => Promise<SourceLinkAnalysis>;
    prepareSourceUrl: (url: string) => Promise<PreparedSource>;
    prepareSourceFile: (filePath: string) => Promise<PreparedSource>;
    createRenderPacket: (input: unknown) => Promise<RenderPacket>;
    renderWithProvider: (input: unknown) => Promise<ProviderRenderResult>;
  };
}
