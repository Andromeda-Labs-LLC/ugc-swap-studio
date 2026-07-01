const { execFile, spawnSync } = require('child_process');
const fs = require('fs');
const fsPromises = require('fs/promises');
const os = require('os');
const path = require('path');

const DEFAULT_TIMEOUT_MS = 90000;
const MAX_BUFFER = 1024 * 1024 * 12;
const MAX_SOURCE_SECONDS = 30;

const TOOL_CANDIDATES = {
  ytDlp: ['/opt/homebrew/bin/yt-dlp', '/usr/local/bin/yt-dlp', '/usr/bin/yt-dlp', 'yt-dlp'],
  ffmpeg: ['/opt/homebrew/bin/ffmpeg', '/usr/local/bin/ffmpeg', '/usr/bin/ffmpeg', 'ffmpeg'],
  ffprobe: ['/opt/homebrew/bin/ffprobe', '/usr/local/bin/ffprobe', '/usr/bin/ffprobe', 'ffprobe'],
  whisperCli: [
    '/opt/homebrew/bin/whisper-cli',
    '/usr/local/bin/whisper-cli',
    '/usr/bin/whisper-cli',
    'whisper-cli',
  ],
  realEsrgan: [
    '/opt/homebrew/bin/realesrgan-ncnn-vulkan',
    '/usr/local/bin/realesrgan-ncnn-vulkan',
    'realesrgan-ncnn-vulkan',
  ],
  rembg: ['/opt/homebrew/bin/rembg', '/usr/local/bin/rembg', 'rembg'],
};

function resolveTool(toolId) {
  for (const candidate of TOOL_CANDIDATES[toolId] ?? []) {
    if (candidate.includes('/') && fs.existsSync(candidate)) {
      return candidate;
    }
    if (!candidate.includes('/')) {
      const found = spawnSync('/bin/sh', ['-lc', `command -v ${candidate}`], { encoding: 'utf8' });
      if (found.status === 0 && found.stdout.trim()) {
        return found.stdout.trim();
      }
    }
  }
  return '';
}

function toolState(toolId, label, role, license, sourceProject) {
  const toolPath = resolveTool(toolId);
  return {
    id: toolId,
    label,
    role,
    license,
    sourceProject,
    status: toolPath ? 'ready' : 'missing',
    path: toolPath && toolPath.includes('/') ? toolPath : toolPath ? label : '',
  };
}

function resolveWhisperModel(appRoot) {
  const candidates = [
    process.env.WHISPER_MODEL,
    appRoot ? path.join(appRoot, 'models', 'ggml-base.en.bin') : '',
    path.join(os.homedir(), '.cache', 'whisper', 'ggml-base.en.bin'),
    '/opt/homebrew/share/whisper-cpp/models/ggml-base.en.bin',
    '/opt/homebrew/Cellar/whisper-cpp/1.8.4/share/whisper-cpp/for-tests-ggml-tiny.bin',
  ].filter(Boolean);

  return candidates.find((candidate) => fs.existsSync(candidate)) || '';
}

function getEngineCapabilities(appRoot) {
  const tools = [
    toolState('ytDlp', 'yt-dlp', 'Fetch permitted social/source videos and captions.', 'Unlicense', 'yt-dlp'),
    toolState('ffmpeg', 'FFmpeg', 'Trim, normalize, encode, and extract audio.', 'External binary', 'FFmpeg'),
    toolState('ffprobe', 'FFprobe', 'Inspect source media duration, dimensions, and codecs.', 'External binary', 'FFmpeg'),
    toolState('whisperCli', 'whisper.cpp', 'Local transcript fallback when captions are missing.', 'MIT', 'whisper.cpp'),
    toolState('realEsrgan', 'Real-ESRGAN', 'Optional post-render upscale/restoration hook.', 'BSD-3', 'Real-ESRGAN'),
    toolState('rembg', 'rembg', 'Optional avatar/background cleanup hook.', 'MIT', 'rembg'),
  ];
  const whisperModel = resolveWhisperModel(appRoot);

  return {
    checkedAt: new Date().toISOString(),
    ready: tools.filter((tool) => ['ytDlp', 'ffmpeg', 'ffprobe'].includes(tool.id)).every((tool) => tool.status === 'ready'),
    tools,
    whisperModel: whisperModel ? path.basename(whisperModel) : '',
    providers: [
      {
        id: 'fal-pixverse-swap',
        label: 'fal PixVerse Swap',
        status: 'adapter-ready',
        secretEnv: 'FAL_KEY',
        role: 'Primary high-quality still-image plus source-video swap route.',
      },
      {
        id: 'pixverse-direct-swap',
        label: 'PixVerse Direct Swap',
        status: 'adapter-ready',
        secretEnv: 'PIXVERSE_API_KEY',
        role: 'Direct PixVerse route after cost and quality validation.',
      },
      {
        id: 'local-faceswap-lab',
        label: 'Local Face Swap Lab',
        status: 'evaluation-only',
        secretEnv: '',
        role: 'Future local benchmark using permissive or cleared engines.',
      },
    ],
  };
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

function runTool(toolId, args, options = {}) {
  const toolPath = resolveTool(toolId);
  if (!toolPath) {
    return Promise.reject(new Error(`${toolId} is not installed on this Mac.`));
  }

  return new Promise((resolve, reject) => {
    execFile(
      toolPath,
      args,
      {
        cwd: options.cwd,
        timeout: options.timeout ?? DEFAULT_TIMEOUT_MS,
        maxBuffer: options.maxBuffer ?? MAX_BUFFER,
        windowsHide: true,
      },
      (error, stdout, stderr) => {
        if (error) {
          const detail = stderr?.trim() || error.message;
          reject(new Error(detail));
          return;
        }
        resolve({ stdout, stderr, toolPath });
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
    await runTool(
      'ytDlp',
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
      { timeout: DEFAULT_TIMEOUT_MS, maxBuffer: 1024 * 1024 * 2 },
    );

    const files = await fsPromises.readdir(tempDir);
    const captionFile = files.find((file) => file.endsWith('.vtt'));
    if (!captionFile) {
      return { status: 'missing', language: '', text: '', lineCount: 0, source: 'captions' };
    }

    const captionText = stripVtt(await fsPromises.readFile(path.join(tempDir, captionFile), 'utf8'));
    const lines = captionText.split('\n').filter(Boolean);
    return {
      status: captionText ? 'ready' : 'empty',
      source: 'captions',
      language: captionFile.match(/\.([a-z]{2}(?:-[A-Z]{2})?)\.vtt$/)?.[1] ?? 'en',
      text: truncate(captionText, 4000),
      lineCount: lines.length,
    };
  } catch (error) {
    return {
      status: 'unavailable',
      source: 'captions',
      language: '',
      text: '',
      lineCount: 0,
      error: truncate(error instanceof Error ? error.message : String(error), 240),
    };
  } finally {
    await fsPromises.rm(tempDir, { recursive: true, force: true });
  }
}

async function fetchSourceMetadata(url) {
  const { stdout, toolPath } = await runTool('ytDlp', [
    '--dump-single-json',
    '--skip-download',
    '--no-playlist',
    '--no-warnings',
    url,
  ]);
  return { metadata: JSON.parse(stdout), ytDlpPath: toolPath };
}

async function analyzeSourceUrl(rawUrl) {
  try {
    const url = assertHttpUrl(rawUrl);
    const { metadata, ytDlpPath } = await fetchSourceMetadata(url);
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
}

async function ffprobe(filePath) {
  const { stdout } = await runTool('ffprobe', [
    '-v',
    'quiet',
    '-print_format',
    'json',
    '-show_format',
    '-show_streams',
    filePath,
  ]);
  const payload = JSON.parse(stdout);
  const videoStream = payload.streams?.find((stream) => stream.codec_type === 'video') ?? {};
  const audioStream = payload.streams?.find((stream) => stream.codec_type === 'audio') ?? {};
  return {
    durationSeconds: Math.round(Number(payload.format?.duration ?? videoStream.duration ?? 0)),
    width: videoStream.width ?? null,
    height: videoStream.height ?? null,
    videoCodec: videoStream.codec_name ?? '',
    audioCodec: audioStream.codec_name ?? '',
    format: payload.format?.format_name ?? '',
    sizeBytes: Number(payload.format?.size ?? 0),
  };
}

async function findFirstVideo(workspaceDir) {
  const files = await fsPromises.readdir(workspaceDir);
  const candidates = files
    .filter((file) => /\.(mp4|mov|m4v|webm|mkv)$/i.test(file))
    .filter((file) => !file.startsWith('normalized'));
  return candidates[0] ? path.join(workspaceDir, candidates[0]) : '';
}

async function extractWhisperTranscript(audioPath, workspaceDir, appRoot) {
  const whisperPath = resolveTool('whisperCli');
  const modelPath = resolveWhisperModel(appRoot);
  if (!whisperPath || !modelPath || !fs.existsSync(audioPath)) {
    return {
      status: 'skipped',
      source: 'whisper.cpp',
      text: '',
      lineCount: 0,
      reason: modelPath ? 'Audio track unavailable.' : 'Whisper model unavailable.',
    };
  }

  const outputBase = path.join(workspaceDir, 'transcript-whisper');
  await runTool(
    'whisperCli',
    ['-m', modelPath, '-f', audioPath, '-l', 'auto', '-otxt', '-of', outputBase, '-np'],
    { timeout: 1000 * 60 * 8, maxBuffer: MAX_BUFFER },
  );
  const transcriptPath = `${outputBase}.txt`;
  const text = fs.existsSync(transcriptPath)
    ? truncate(await fsPromises.readFile(transcriptPath, 'utf8'), 4000).trim()
    : '';
  return {
    status: text ? 'ready' : 'empty',
    source: 'whisper.cpp',
    text,
    lineCount: text.split('\n').filter(Boolean).length,
    path: transcriptPath,
  };
}

async function prepareSourceUrl(rawUrl, options = {}) {
  const url = assertHttpUrl(rawUrl);
  const userDataPath = options.userDataPath || os.tmpdir();
  const appRoot = options.appRoot || '';
  const runId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const workspaceDir = path.join(userDataPath, 'source-cache', runId);
  await fsPromises.mkdir(workspaceDir, { recursive: true });

  const analysis = await analyzeSourceUrl(url);
  if (!analysis.ok) {
    return { ok: false, runId, preparedAt: new Date().toISOString(), analysis };
  }

  await fsPromises.writeFile(path.join(workspaceDir, 'source-analysis.json'), JSON.stringify(analysis, null, 2));

  const downloadArgs = [
    '--no-playlist',
    '--no-warnings',
    '--merge-output-format',
    'mp4',
    '--download-sections',
    `*0-${MAX_SOURCE_SECONDS}`,
    '--paths',
    workspaceDir,
    '--output',
    'source.%(ext)s',
    url,
  ];
  await runTool('ytDlp', downloadArgs, { timeout: 1000 * 60 * 6, maxBuffer: MAX_BUFFER });

  const originalPath = await findFirstVideo(workspaceDir);
  if (!originalPath) {
    throw new Error('The source post was fetched, but no video file was produced.');
  }

  const originalProbe = resolveTool('ffprobe') ? await ffprobe(originalPath) : null;
  const normalizedPath = path.join(workspaceDir, 'normalized.mp4');
  let normalizedProbe = originalProbe;

  if (resolveTool('ffmpeg')) {
    await runTool(
      'ffmpeg',
      [
        '-y',
        '-i',
        originalPath,
        '-t',
        String(MAX_SOURCE_SECONDS),
        '-vf',
        "scale='if(gt(iw,1080),1080,iw)':-2,fps=30,format=yuv420p",
        '-c:v',
        'libx264',
        '-preset',
        'medium',
        '-crf',
        '20',
        '-c:a',
        'aac',
        '-b:a',
        '160k',
        '-movflags',
        '+faststart',
        normalizedPath,
      ],
      { timeout: 1000 * 60 * 6, maxBuffer: MAX_BUFFER },
    );
    normalizedProbe = await ffprobe(normalizedPath);
  }

  const audioPath = path.join(workspaceDir, 'source-audio-16k.wav');
  if (resolveTool('ffmpeg')) {
    await runTool(
      'ffmpeg',
      ['-y', '-i', fs.existsSync(normalizedPath) ? normalizedPath : originalPath, '-vn', '-ac', '1', '-ar', '16000', audioPath],
      { timeout: 1000 * 60 * 3, maxBuffer: MAX_BUFFER },
    ).catch(() => null);
  }

  const transcript =
    analysis.transcript?.status === 'ready'
      ? { ...analysis.transcript, source: 'captions' }
      : await extractWhisperTranscript(audioPath, workspaceDir, appRoot);

  const prepared = {
    ok: true,
    runId,
    preparedAt: new Date().toISOString(),
    workspaceDir,
    files: {
      originalVideo: originalPath,
      normalizedVideo: fs.existsSync(normalizedPath) ? normalizedPath : originalPath,
      audio: fs.existsSync(audioPath) ? audioPath : '',
    },
    media: normalizedProbe,
    analysis,
    transcript,
    nextAdapters: ['fal-pixverse-swap', 'pixverse-direct-swap', 'local-faceswap-lab'],
    notes: [
      `Source clipped to the first ${MAX_SOURCE_SECONDS} seconds for predictable cost and provider limits.`,
      'Normalized MP4 is ready for upload to provider storage.',
      transcript.status === 'ready'
        ? `Transcript ready via ${transcript.source}.`
        : 'Transcript unavailable; provider can still render motion/reference video.',
    ],
  };

  await fsPromises.writeFile(path.join(workspaceDir, 'prepared-source.json'), JSON.stringify(prepared, null, 2));
  return prepared;
}

function buildProviderPackets(input) {
  const resolution = input.preset?.resolution ?? '720p';
  return {
    falPixverseSwap: {
      provider: 'fal',
      model: 'fal-ai/pixverse/swap',
      secretEnv: 'FAL_KEY',
      mode: 'queue',
      request: {
        image_url: '<upload-avatar-image-to-storage-first>',
        video_url: '<upload-normalized-source-video-to-storage-first>',
        mode: 'person',
        resolution,
        original_sound_switch: true,
      },
    },
    pixverseDirectSwap: {
      provider: 'pixverse',
      endpoint: '/v1/video/swap',
      secretEnv: 'PIXVERSE_API_KEY',
      mode: 'queue',
      request: {
        image: '<uploaded-avatar-image>',
        video: '<uploaded-normalized-source-video>',
        mode: 'person',
        resolution,
        keep_audio: true,
      },
    },
    localFaceSwapLab: {
      provider: 'local',
      mode: 'evaluation-only',
      request: {
        sourceImage: input.referenceFace,
        targetVideo: input.preparedSource?.files?.normalizedVideo ?? input.sourceVideo,
        output: '<workspace>/local-render.mp4',
      },
    },
  };
}

async function createRenderPacket(input, options = {}) {
  const userDataPath = options.userDataPath || os.tmpdir();
  const packetId = `packet-${Date.now().toString(36)}`;
  const packetDir = path.join(userDataPath, 'render-packets');
  await fsPromises.mkdir(packetDir, { recursive: true });
  const packet = {
    id: packetId,
    createdAt: new Date().toISOString(),
    app: 'CopyTok',
    status: 'provider-ready',
    source: input.sourceReference ?? null,
    preparedSource: input.preparedSource ?? null,
    referenceFace: input.referenceFace,
    selectedProvider: input.providerId,
    preset: input.preset,
    compliance: input.compliance,
    openSourceStack: {
      ytDlp: 'source URL fetch, metadata, captions',
      ffmpeg: 'trim, normalize, encode, audio extraction',
      whisperCpp: 'local transcript fallback when a model is present',
      realEsrgan: 'optional post-render upscale hook',
      rembg: 'optional avatar cleanup hook',
    },
    providerPackets: buildProviderPackets(input),
    nextRequiredSecret:
      input.providerId === 'pixverse-cloud'
        ? 'PIXVERSE_API_KEY or FAL_KEY in a secure backend/host environment'
        : input.providerId === 'replicate-cloud'
          ? 'REPLICATE_API_TOKEN in a secure backend/host environment'
          : input.providerId === 'heygen-cloud'
            ? 'HEYGEN_API_KEY in a secure backend/host environment'
            : '',
  };
  const packetPath = path.join(packetDir, `${packetId}.json`);
  await fsPromises.writeFile(packetPath, JSON.stringify(packet, null, 2));
  return { ...packet, packetPath };
}

module.exports = {
  analyzeSourceUrl,
  createRenderPacket,
  getEngineCapabilities,
  prepareSourceUrl,
  truncate,
};
