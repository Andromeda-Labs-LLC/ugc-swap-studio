/// <reference types="vite/client" />

interface StudioHostInfo {
  userDataPath: string;
  appVersion: string;
  packaged: boolean;
}

interface Window {
  studioHost?: {
    getHostInfo: () => Promise<StudioHostInfo>;
    openExternal: (url: string) => Promise<boolean>;
  };
}
