const { execFile } = require('child_process');
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const {
  analyzeSourceUrl,
  createTrendAdaptation,
  createRenderPacket,
  getEngineCapabilities,
  getTrendScoutStatus,
  prepareSourceFile,
  prepareSourceUrl,
  renderWithProvider,
  runTrendScout,
} = require('./engine.cjs');

const isDev = !app.isPackaged;

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 930,
    minWidth: 1120,
    minHeight: 760,
    title: 'CopyTok',
    backgroundColor: '#fbfbfa',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 18, y: 18 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://127.0.0.1:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  ipcMain.handle('studio:get-host-info', () => ({
    userDataPath: app.getPath('userData'),
    appVersion: app.getVersion(),
    packaged: app.isPackaged,
  }));

  ipcMain.handle('studio:open-external', (_event, url) => {
    if (typeof url === 'string' && /^https?:\/\//.test(url)) {
      return shell.openExternal(url);
    }
    return false;
  });

  ipcMain.handle('studio:open-chatgpt-pro', () => {
    execFile('/usr/bin/open', ['-a', 'Google Chrome', 'https://chatgpt.com/']);
    return true;
  });

  ipcMain.handle('studio:get-engine-capabilities', () => getEngineCapabilities(path.join(__dirname, '..')));

  ipcMain.handle('studio:get-trend-scout-status', () =>
    getTrendScoutStatus({
      userDataPath: app.getPath('userData'),
      appRoot: path.join(__dirname, '..'),
    }),
  );

  ipcMain.handle('studio:analyze-source-url', (_event, rawUrl) => analyzeSourceUrl(rawUrl));

  ipcMain.handle('studio:prepare-source-url', (_event, rawUrl) =>
    prepareSourceUrl(rawUrl, {
      userDataPath: app.getPath('userData'),
      appRoot: path.join(__dirname, '..'),
    }),
  );

  ipcMain.handle('studio:prepare-source-file', (_event, filePath) =>
    prepareSourceFile(filePath, {
      userDataPath: app.getPath('userData'),
      appRoot: path.join(__dirname, '..'),
    }),
  );

  ipcMain.handle('studio:create-render-packet', (_event, input) =>
    createRenderPacket(input, {
      userDataPath: app.getPath('userData'),
    }),
  );

  ipcMain.handle('studio:render-with-provider', (_event, input) =>
    renderWithProvider(input, {
      userDataPath: app.getPath('userData'),
      appRoot: path.join(__dirname, '..'),
    }),
  );

  ipcMain.handle('studio:run-trend-scout', (_event, input) =>
    runTrendScout(input, {
      userDataPath: app.getPath('userData'),
      appRoot: path.join(__dirname, '..'),
    }),
  );

  ipcMain.handle('studio:create-trend-adaptation', (_event, input) =>
    createTrendAdaptation(input, {
      userDataPath: app.getPath('userData'),
      appRoot: path.join(__dirname, '..'),
    }),
  );

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
