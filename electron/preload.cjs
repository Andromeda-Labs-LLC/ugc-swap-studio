const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('studioHost', {
  getHostInfo: () => ipcRenderer.invoke('studio:get-host-info'),
  getEngineCapabilities: () => ipcRenderer.invoke('studio:get-engine-capabilities'),
  getFilePath: (file) => webUtils.getPathForFile(file),
  openExternal: (url) => ipcRenderer.invoke('studio:open-external', url),
  openChatGPTPro: () => ipcRenderer.invoke('studio:open-chatgpt-pro'),
  analyzeSourceUrl: (url) => ipcRenderer.invoke('studio:analyze-source-url', url),
  prepareSourceUrl: (url) => ipcRenderer.invoke('studio:prepare-source-url', url),
  prepareSourceFile: (filePath) => ipcRenderer.invoke('studio:prepare-source-file', filePath),
  createRenderPacket: (input) => ipcRenderer.invoke('studio:create-render-packet', input),
  renderWithProvider: (input) => ipcRenderer.invoke('studio:render-with-provider', input),
});
