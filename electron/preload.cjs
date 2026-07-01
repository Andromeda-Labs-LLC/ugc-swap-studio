const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('studioHost', {
  getHostInfo: () => ipcRenderer.invoke('studio:get-host-info'),
  openExternal: (url) => ipcRenderer.invoke('studio:open-external', url),
});
