const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('studioHost', {
  getHostInfo: () => ipcRenderer.invoke('studio:get-host-info'),
  getEngineCapabilities: () => ipcRenderer.invoke('studio:get-engine-capabilities'),
  openExternal: (url) => ipcRenderer.invoke('studio:open-external', url),
  analyzeSourceUrl: (url) => ipcRenderer.invoke('studio:analyze-source-url', url),
  prepareSourceUrl: (url) => ipcRenderer.invoke('studio:prepare-source-url', url),
  createRenderPacket: (input) => ipcRenderer.invoke('studio:create-render-packet', input),
});
