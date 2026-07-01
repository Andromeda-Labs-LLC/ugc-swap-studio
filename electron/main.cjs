const { app, BrowserWindow, ipcMain, shell } = require('electron');
const { execFile } = require('child_process');
const fs = require('fs');
const fsPromises = require('fs/promises');
const os = require('os');
const path = require('path');

const isDev = !app.isPackaged;
const YT_DLP_TIMEOUT_MS = 90000;
const YT_DLP_CANDIDATES = [
  '/opt/homebrew/bin/yt-dlp',
  '/usr/local/bin/yt-dlp',
  '/usr/bin/yt-dlp',
  'yt-dlp',
];

function resolveYtDlpPath() {
  return YT_DLP_CANDIDATES.find((candidate) => {
    if (candidate === 'yt-dlp') return true;
    return fs.existsSync(candidate);
  });
}

function assertHttpUrl(rawUrl) {
  if (typeof rawUrl !== 'string') {
    throw new Error('Paste a valid social post URL first.');
  }

  const parsed = new URL(rawUrl.trim());
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only http and https links can be analyzed.');
  }
  return parsed.toString();
}

function runYtDlp(args, options = {}) {
  const ytDlpPath = resolveYtDlpPath();

  return new Promise((resolve, reject) => {
    execFile(
      ytDlpPath,
      args,
      {
        timeout: options.timeout ?? YT_DLP_TIMEOUT_MS,
        maxBuffer: options.maxBuffer ?? 1024 * 1024 * 8,
        windowsHide: true,
      },
      (error, stdout, stderr) => {
        if (error) {
          const detail = stderr?.trim() || error.message;
          reject(new Error(detail));
          return;
        }
        resolve({ stdout, stderr, ytDlpPath });
      },
    );
  });
}

function truncate(value, maxLength) {
  if (typeof value !== 'string') return '';
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;
}

function bestThumbnail(metadata) {
  if (metadata.thumbnail) return metadata.thumbnail;
  if (!Array.isArray(metadata.thumbnails)) return '';
  const thumbnail = metadata.thumbnails
    .filter((item) => item?.url)
    .sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0];
  return thumbnail?.url ?? '';
}

function hasAudioTrack(metadata) {
  if (metadata.acodec && metadata.acodec !== 'none') return true;
  if (!Array.isArray(metadata.formats)) return false;
  return metadata.formats.some((format) => format?.acodec && format.acodec !== 'none');
}

function captionTrackCount(captionMap) {
  if (!captionMap || typeof captionMap !== 'object') return 0;
  return Object.values(captionMap).reduce((count, tracks) => {
    if (!Array.isArray(tracks)) return count;
    return count + tracks.length;
  }, 0);
}

function stripVtt(content) {
  const seen = new Set();
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line)
    .filter((line) => !line.startsWith('WEBVTT'))
    .filter((line) => !line.startsWith('Kind:'))
    .filter((line) => !line.startsWith('Language:'))
    .filter((line) => !line.includes('-->'))
    .filter((line) => !/^\d+$/.test(line))
    .map((line) => line.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim())
    .filter((line) => {
      if (!line || seen.has(line)) return false;
      seen.add(line);
      return true;
    })
    .join('\n');
}

async function collectCaptionText(url) {
  const tempDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'copytok-captions-'));

  try {
    await runYtDlp(
      [
        '--skip-download',
        '--write-auto-subs',
        '--write-subs',
        '--sub-langs',
        'en.*,en',
        '--sub-format',
        'vtt',
        '--paths',
        tempDir,
        '--output',
        'source.%(ext)s',
        '--no-playlist',
        url,
      ],
      { timeout: YT_DLP_TIMEOUT_MS, maxBuffer: 1024 * 1024 * 2 },
    );

    const files = await fsPromises.readdir(tempDir);
    const captionFile = files.find((file) => file.endsWith('.vtt'));
    if (!captionFile) {
      return { status: 'missing', language: '', text: '', lineCount: 0 };
    }

    const captionText = stripVtt(await fsPromises.readFile(path.join(tempDir, captionFile), 'utf8'));
    const lines = captionText.split('\n').filter(Boolean);
    return {
      status: captionText ? 'ready' : 'empty',
      language: captionFile.match(/\.([a-z]{2}(?:-[A-Z]{2})?)\.vtt$/)?.[1] ?? 'en',
      text: truncate(captionText, 4000),
      lineCount: lines.length,
    };
  } catch (error) {
    return {
      status: 'unavailable',
      language: '',
      text: '',
      lineCount: 0,
      error: truncate(error instanceof Error ? error.message : String(error), 240),
    };
  } finally {
    await fsPromises.rm(tempDir, { recursive: true, force: true });
  }
}

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

  ipcMain.handle('studio:analyze-source-url', async (_event, rawUrl) => {
    try {
      const url = assertHttpUrl(rawUrl);
      const { stdout, ytDlpPath } = await runYtDlp([
        '--dump-single-json',
        '--skip-download',
        '--no-playlist',
        '--no-warnings',
        url,
      ]);
      const metadata = JSON.parse(stdout);
      const transcript = await collectCaptionText(url);
      const manualCaptionTracks = captionTrackCount(metadata.subtitles);
      const automaticCaptionTracks = captionTrackCount(metadata.automatic_captions);
      const audioDetected = hasAudioTrack(metadata);

      return {
        ok: true,
        fetchedAt: new Date().toISOString(),
        analyzer: path.basename(ytDlpPath),
        url: metadata.webpage_url || url,
        originalUrl: url,
        title: metadata.title || 'Untitled source post',
        platform: metadata.extractor_key || metadata.extractor || 'Unknown platform',
        author: metadata.uploader || metadata.channel || metadata.creator || metadata.artist || '',
        durationSeconds: Number.isFinite(metadata.duration) ? Math.round(metadata.duration) : null,
        thumbnail: bestThumbnail(metadata),
        description: truncate(metadata.description, 900),
        transcript: {
          ...transcript,
          manualTrackCount: manualCaptionTracks,
          automaticTrackCount: automaticCaptionTracks,
        },
        voice: {
          hasAudio: audioDetected,
          status: audioDetected
            ? 'Audio track detected. Voice reuse requires explicit rights or consent.'
            : 'No downloadable audio track was detected in the source metadata.',
          consentRequired: true,
        },
        action: {
          status: 'Reference post fetched. Motion, timing, framing, captions, and audio metadata can be passed to the render adapter.',
          readyForAdapter: true,
        },
      };
    } catch (error) {
      return {
        ok: false,
        fetchedAt: new Date().toISOString(),
        message: truncate(error instanceof Error ? error.message : String(error), 360),
        installHint: 'Install yt-dlp on this Mac to enable social post analysis.',
      };
    }
  });

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
