const { execFile, spawnSync } = require('child_process');
const fs = require('fs');
const fsPromises = require('fs/promises');
const os = require('os');
const path = require('path');

const DEFAULT_TIMEOUT_MS = 90000;
const MAX_BUFFER = 1024 * 1024 * 12;
const MAX_SOURCE_SECONDS = 15;
const COPYTOK_KEYCHAIN_SERVICE = 'CopyTok';
const FAL_KEYCHAIN_SERVICE = COPYTOK_KEYCHAIN_SERVICE;
const FAL_KEYCHAIN_ACCOUNT = 'FAL_KEY';
const APIFY_KEYCHAIN_SERVICE = COPYTOK_KEYCHAIN_SERVICE;
const APIFY_KEYCHAIN_ACCOUNT = 'APIFY_TOKEN';
const ADVENTURE_PROJECT_ROOT = '/Volumes/Adventure/Andromeda Labs/SaaS/UGC Swap Studio';
const MARKETING_OUTPUT_ROOT = '/Volumes/Adventure/Andromeda Labs/Marketing/CopyTok';
const SCOUT_DB_VERSION = 1;
const DEFAULT_BYTEPLUS_BASE_URL = 'https://ark.ap-southeast.bytepluses.com/api/v3';
const DEFAULT_SEEDANCE_MODEL = 'dreamina-seedance-2-0-260128';
const DEFAULT_KLING_MODEL = 'kling-v3.0-motion-control';
const MAX_INLINE_REFERENCE_VIDEO_BYTES = 96 * 1024 * 1024;

const PROVIDER_SECRETS = {
  klingApiKey: 'KLING_API_KEY',
  klingAccessKey: 'KLING_ACCESS_KEY',
  klingSecretKey: 'KLING_SECRET_KEY',
  klingAiAccessKey: 'KLINGAI_ACCESS_KEY',
  klingAiSecretKey: 'KLINGAI_SECRET_KEY',
  klingBaseUrl: 'KLING_BASE_URL',
  klingModel: 'KLING_MODEL',
  klingCreateUrl: 'KLING_CREATE_URL',
  klingStatusUrlTemplate: 'KLING_STATUS_URL_TEMPLATE',
  arkApiKey: 'ARK_API_KEY',
  seedanceApiKey: 'SEEDANCE_API_KEY',
  seedanceBaseUrl: 'SEEDANCE_API_BASE_URL',
  seedanceCreateUrl: 'SEEDANCE_CREATE_URL',
  seedanceStatusUrlTemplate: 'SEEDANCE_STATUS_URL_TEMPLATE',
  seedanceModel: 'SEEDANCE_MODEL',
  byteplusApiKey: 'BYTEPLUS_API_KEY',
  openAiApiKey: 'OPENAI_API_KEY',
};

const TREND_APP_PROFILES = {
  snapglp: {
    id: 'snapglp',
    name: 'SnapGLP',
    category: 'GLP-1 food logging',
    defaultQuery: 'GLP-1 meal tracking app protein food scanner weight loss TikTok',
    seedQueries: [
      'GLP-1 food tracking app',
      'protein grocery scanner weight loss app',
      'Ozempic meal prep app',
      'calorie deficit app viral hook',
      'weight loss app UGC',
    ],
    hashtags: ['glp1', 'ozempic', 'wegovy', 'weightlossapp', 'protein', 'mealprep'],
    productTruths: [
      'SnapGLP helps users log meals and make GLP-1-aware food choices.',
      'SnapGLP is a coaching and tracking tool, not a medical provider.',
    ],
  },
  toneclone: {
    id: 'toneclone',
    name: 'ToneClone',
    category: 'Guitar tone matching',
    defaultQuery: 'guitar tone app amp simulator pedalboard home recording TikTok',
    seedQueries: [
      'guitar tone app',
      'amp simulator app',
      'pedalboard tone matching',
      'bedroom guitarist recording app',
      'guitar plugin comparison TikTok',
    ],
    hashtags: ['guitartok', 'guitar', 'guitartone', 'pedalboard', 'ampsim', 'homerecording'],
    productTruths: [
      'ToneClone helps guitarists match and explore guitar tones.',
      'ToneClone content should sound musician-native and avoid fake endorsement language.',
    ],
  },
};

const FAL_PROVIDERS = {
  'fal-seedance-reference': {
    label: 'fal Seedance 2.0 Reference',
    model: 'bytedance/seedance-2.0/reference-to-video',
    role: 'Reference-to-video route using avatar image, source action video, and optional audio reference.',
  },
  'fal-pixverse-swap': {
    label: 'fal PixVerse Swap',
    model: 'fal-ai/pixverse/swap',
    role: 'Swap route using target avatar image and normalized source video.',
  },
};

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

function readKeychainSecret(service, account) {
  const result = spawnSync('/usr/bin/security', ['find-generic-password', '-a', account, '-s', service, '-w'], {
    encoding: 'utf8',
  });
  return result.status === 0 ? result.stdout.trim() : '';
}

function resolveSecret(account) {
  return process.env[account] || readKeychainSecret(COPYTOK_KEYCHAIN_SERVICE, account);
}

function firstSecret(accounts) {
  for (const account of accounts) {
    const value = resolveSecret(account);
    if (value) return value;
  }
  return '';
}

function hasSecret(account) {
  return Boolean(resolveSecret(account));
}

function parseCombinedKlingApiKey(value) {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (!trimmed) {
    return { accessKey: '', secretKey: '', format: 'missing' };
  }

  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      const accessKey = String(parsed.accessKey || parsed.access_key || parsed.ak || '').trim();
      const secretKey = String(parsed.secretKey || parsed.secret_key || parsed.sk || '').trim();
      if (accessKey && secretKey) {
        return { accessKey, secretKey, format: 'json-pair' };
      }
    } catch {
      return { accessKey: '', secretKey: '', format: 'single-key' };
    }
  }

  const colonIndex = trimmed.indexOf(':');
  if (colonIndex > 0) {
    const accessKey = trimmed.slice(0, colonIndex).trim();
    const secretKey = trimmed.slice(colonIndex + 1).trim();
    if (accessKey && secretKey) {
      return { accessKey, secretKey, format: 'colon-pair' };
    }
  }

  return { accessKey: '', secretKey: '', format: 'single-key' };
}

function resolveKlingCredentials() {
  const explicitAccessKey = firstSecret([PROVIDER_SECRETS.klingAccessKey, PROVIDER_SECRETS.klingAiAccessKey]);
  const explicitSecretKey = firstSecret([PROVIDER_SECRETS.klingSecretKey, PROVIDER_SECRETS.klingAiSecretKey]);
  if (explicitAccessKey && explicitSecretKey) {
    return { accessKey: explicitAccessKey, secretKey: explicitSecretKey, source: 'split-pair' };
  }

  const combined = parseCombinedKlingApiKey(resolveSecret(PROVIDER_SECRETS.klingApiKey));
  return {
    accessKey: combined.accessKey,
    secretKey: combined.secretKey,
    source: combined.format,
  };
}

function resolveSeedanceApiKey() {
  return firstSecret([PROVIDER_SECRETS.arkApiKey, PROVIDER_SECRETS.seedanceApiKey, PROVIDER_SECRETS.byteplusApiKey]);
}

function resolveFalKey() {
  return process.env.FAL_KEY || readKeychainSecret(FAL_KEYCHAIN_SERVICE, FAL_KEYCHAIN_ACCOUNT);
}

function resolveApifyToken() {
  return process.env.APIFY_TOKEN || readKeychainSecret(APIFY_KEYCHAIN_SERVICE, APIFY_KEYCHAIN_ACCOUNT);
}

function falSecretStatus() {
  return resolveFalKey() ? 'adapter-ready' : 'missing-secret';
}

function resolveHeygenCli() {
  const found = spawnSync('/bin/sh', ['-lc', 'command -v heygen'], { encoding: 'utf8' });
  return found.status === 0 ? found.stdout.trim() : '';
}

function heygenCliStatus() {
  const cliPath = resolveHeygenCli();
  if (!cliPath) return 'missing-secret';
  const result = spawnSync(cliPath, ['auth', 'status'], { encoding: 'utf8', timeout: 15000, maxBuffer: 1024 * 1024 });
  return result.status === 0 ? 'cli-ready' : 'missing-secret';
}

function directKlingStatus() {
  const { accessKey, secretKey, source } = resolveKlingCredentials();
  if (source === 'single-key') return 'needs-config';
  if (!accessKey || !secretKey) return 'missing-secret';
  return 'adapter-ready';
}

function directSeedanceStatus() {
  return resolveSeedanceApiKey() ? 'adapter-ready' : 'missing-secret';
}

function openAiImageStatus() {
  return hasSecret(PROVIDER_SECRETS.openAiApiKey) ? 'adapter-ready' : 'missing-secret';
}

function nextRequiredSecretForProvider(providerId) {
  if (['fal-seedance-reference', 'fal-pixverse-swap'].includes(providerId) && !resolveFalKey()) {
    return 'FAL_KEY in the CopyTok macOS Keychain entry or secure environment';
  }
  if (providerId === 'direct-kling-3') {
    const { accessKey, secretKey, source } = resolveKlingCredentials();
    if (!accessKey || !secretKey) {
      if (source === 'single-key') {
        return 'Kling direct needs KLING_ACCESS_KEY + KLING_SECRET_KEY, or KLING_API_KEY stored as ACCESS_KEY:SECRET_KEY';
      }
      return 'KLING_ACCESS_KEY and KLING_SECRET_KEY in the CopyTok macOS Keychain entry';
    }
  }
  if (providerId === 'direct-seedance-2') {
    if (!resolveSeedanceApiKey()) {
      return 'ARK_API_KEY, SEEDANCE_API_KEY, or BYTEPLUS_API_KEY in the CopyTok macOS Keychain entry';
    }
  }
  if (providerId === 'openai-image-2' && !hasSecret(PROVIDER_SECRETS.openAiApiKey)) {
    return 'OPENAI_API_KEY for in-app GPT Image 2 generation, or use ChatGPT Pro manually';
  }
  if (providerId === 'heygen-cloud' && heygenCliStatus() !== 'cli-ready') {
    return 'Authenticated HeyGen CLI session or HEYGEN_API_KEY-backed CLI auth';
  }
  if (providerId === 'replicate-cloud') return 'REPLICATE_API_TOKEN in a secure backend/host environment';
  return '';
}

function resolveRuntimeDir(options = {}) {
  const explicit = process.env.COPYTOK_RUNTIME_DIR;
  if (explicit && path.isAbsolute(explicit)) return explicit;

  const appRoot = options.appRoot || '';
  if (appRoot.startsWith(ADVENTURE_PROJECT_ROOT) || fs.existsSync(ADVENTURE_PROJECT_ROOT)) {
    return path.join(ADVENTURE_PROJECT_ROOT, '.local-runtime');
  }

  return path.join(options.userDataPath || os.tmpdir(), 'copytok-local-runtime');
}

function scoutDbPath(runtimeDir) {
  return path.join(runtimeDir, 'trend-scout', 'trend-scout-db.json');
}

async function readScoutDb(runtimeDir) {
  const databasePath = scoutDbPath(runtimeDir);
  try {
    const parsed = JSON.parse(await fsPromises.readFile(databasePath, 'utf8'));
    return {
      version: parsed.version ?? SCOUT_DB_VERSION,
      runs: Array.isArray(parsed.runs) ? parsed.runs : [],
      posts: Array.isArray(parsed.posts) ? parsed.posts : [],
      briefs: Array.isArray(parsed.briefs) ? parsed.briefs : [],
    };
  } catch {
    return {
      version: SCOUT_DB_VERSION,
      runs: [],
      posts: [],
      briefs: [],
    };
  }
}

async function writeScoutDb(runtimeDir, db) {
  const databasePath = scoutDbPath(runtimeDir);
  await fsPromises.mkdir(path.dirname(databasePath), { recursive: true });
  const capped = {
    version: SCOUT_DB_VERSION,
    updatedAt: new Date().toISOString(),
    runs: db.runs.slice(-60),
    posts: db.posts.slice(-900),
    briefs: db.briefs.slice(-200),
  };
  const tempPath = `${databasePath}.tmp`;
  await fsPromises.writeFile(tempPath, JSON.stringify(capped, null, 2));
  await fsPromises.rename(tempPath, databasePath);
  return databasePath;
}

function getProfile(profileId) {
  return TREND_APP_PROFILES[profileId] ?? TREND_APP_PROFILES.snapglp;
}

function numeric(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function assertExistingFile(filePath, label) {
  if (typeof filePath !== 'string' || !filePath.trim()) {
    throw new Error(`${label} is missing. Re-select the file in CopyTok and try again.`);
  }
  const resolvedPath = filePath.trim();
  if (!path.isAbsolute(resolvedPath) || !fs.existsSync(resolvedPath)) {
    throw new Error(`${label} is not available to the desktop backend.`);
  }
  return resolvedPath;
}

function mimeTypeForFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (['.jpg', '.jpeg'].includes(ext)) return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.mov') return 'video/quicktime';
  if (ext === '.wav') return 'audio/wav';
  if (ext === '.mp3') return 'audio/mpeg';
  if (ext === '.m4a') return 'audio/mp4';
  return 'video/mp4';
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
        id: 'direct-seedance-2',
        label: 'Direct Seedance 2.0',
        status: directSeedanceStatus(),
        secretEnv: 'ARK_API_KEY / SEEDANCE_API_KEY / BYTEPLUS_API_KEY',
        role: 'Cost-first direct BytePlus ModelArk Seedance route for multimodal video generation.',
      },
      {
        id: 'direct-kling-3',
        label: 'Direct Kling 3.0',
        status: directKlingStatus(),
        secretEnv: 'KLING AK/SK',
        role: 'Cost-first direct Kling route for image-to-video jobs using first-frame avatar stills.',
      },
      {
        id: 'fal-seedance-reference',
        label: FAL_PROVIDERS['fal-seedance-reference'].label,
        status: falSecretStatus(),
        secretEnv: 'FAL_KEY',
        role: FAL_PROVIDERS['fal-seedance-reference'].role,
      },
      {
        id: 'fal-pixverse-swap',
        label: FAL_PROVIDERS['fal-pixverse-swap'].label,
        status: falSecretStatus(),
        secretEnv: 'FAL_KEY',
        role: FAL_PROVIDERS['fal-pixverse-swap'].role,
      },
      {
        id: 'heygen-cloud',
        label: 'HeyGen Video Agent',
        status: heygenCliStatus(),
        secretEnv: 'heygen CLI auth',
        role: 'Talking-head, presenter, and avatar-led UGC through the authenticated HeyGen CLI.',
      },
      {
        id: 'openai-image-2',
        label: 'OpenAI GPT Image 2',
        status: openAiImageStatus(),
        secretEnv: 'OPENAI_API_KEY',
        role: 'High-quality first-frame stills, ad images, keyframes, and carousel source images.',
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

async function getTrendScoutStatus(options = {}) {
  const runtimeDir = resolveRuntimeDir(options);
  const db = await readScoutDb(runtimeDir);
  const apifyReady = Boolean(resolveApifyToken());

  return {
    checkedAt: new Date().toISOString(),
    runtimeDir,
    databasePath: scoutDbPath(runtimeDir),
    providers: [
      {
        id: 'local-demo',
        label: 'Local demo',
        status: 'ready',
        role: 'Offline seed data for UI testing. Not real trend evidence.',
      },
      {
        id: 'apify-tiktok',
        label: 'Apify TikTok',
        status: apifyReady ? 'ready' : 'missing-secret',
        role: 'Real TikTok scrape adapter for searches, hashtags, and app-account discovery.',
        secretName: 'APIFY_TOKEN',
      },
    ],
    cache: {
      runCount: db.runs.length,
      postCount: db.posts.length,
      briefCount: db.briefs.length,
    },
  };
}

function demoTrendPosts(profile, query, fetchedAt) {
  const snapglp = [
    {
      text: 'I thought I was eating enough protein on GLP-1 until I saw this one meal breakdown.',
      views: 2840000,
      likes: 168000,
      comments: 6100,
      shares: 38200,
      hookType: 'confession reveal',
      visualBeat: 'Creator leans toward camera with a held breath, then cuts to a plate close-up.',
      overlay: 'I was making this GLP-1 mistake every day',
      action: 'Point to meal, tap app scan, show one fast correction.',
      productInsertion: 'Show SnapGLP identifying protein and meal balance at second 6.',
      cta: 'Save this before your next grocery run.',
    },
    {
      text: 'POV: your dose day appetite is weird and you still need a real food plan.',
      views: 1210000,
      likes: 74200,
      comments: 2300,
      shares: 19800,
      hookType: 'POV anxiety relief',
      visualBeat: 'Blank stare into fridge, hard cut to phone screen, then relieved nod.',
      overlay: 'Dose day food plan in 20 seconds',
      action: 'Open fridge, scan two options, choose the higher-protein plate.',
      productInsertion: 'SnapGLP recommends a simple protein-first choice.',
      cta: 'Try this before you skip lunch.',
    },
    {
      text: 'The restaurant order that saved me from guessing my way through GLP-1 dinner.',
      views: 760000,
      likes: 39200,
      comments: 1800,
      shares: 12200,
      hookType: 'specific save',
      visualBeat: 'Menu held to camera, finger hovers over two choices, quick app check.',
      overlay: 'Stop guessing at restaurants',
      action: 'Compare two orders, circle the better one, show app summary.',
      productInsertion: 'SnapGLP frames the order as protein, portion, and comfort-friendly.',
      cta: 'Use this next time the menu is chaos.',
    },
  ];

  const toneclone = [
    {
      text: 'I spent 40 minutes chasing this guitar tone and the app got me closer in one take.',
      views: 1940000,
      likes: 132000,
      comments: 4200,
      shares: 28900,
      hookType: 'time-saved reveal',
      visualBeat: 'Frustrated face with guitar in lap, jump cut to tone-match playback.',
      overlay: 'This tone took me 40 minutes to fail',
      action: 'Play dry riff, tap match, replay riff with improved tone.',
      productInsertion: 'ToneClone appears at the moment the tone changes.',
      cta: 'Send this to the friend with 37 pedals.',
    },
    {
      text: 'Bedroom guitarists are lying if they say this amp tone is easy to dial in.',
      views: 1120000,
      likes: 70400,
      comments: 3600,
      shares: 14100,
      hookType: 'hot take challenge',
      visualBeat: 'Raised eyebrow into camera, fast cut to pedalboard and waveform.',
      overlay: 'Nobody tells you this tone secret',
      action: 'Play bad tone, grimace, run ToneClone, react to the match.',
      productInsertion: 'Show ToneClone as the shortcut between bad and usable tone.',
      cta: 'Try this on your next riff.',
    },
    {
      text: 'Guess which one is the real amp and which one is the matched phone tone.',
      views: 890000,
      likes: 51200,
      comments: 8100,
      shares: 9700,
      hookType: 'A/B guessing game',
      visualBeat: 'Split-screen waveform and reaction face, quick A/B playback.',
      overlay: 'Real amp or app match?',
      action: 'Play clip A, play clip B, reveal the app-matched one.',
      productInsertion: 'ToneClone result becomes the reveal at the end.',
      cta: 'Comment A or B before the reveal.',
    },
  ];

  const seeds = profile.id === 'toneclone' ? toneclone : snapglp;
  return seeds.map((seed, index) => normalizeDemoSeed(seed, profile, query, index, fetchedAt));
}

function normalizeDemoSeed(seed, profile, query, index, fetchedAt) {
  const views = numeric(seed.views);
  const likes = numeric(seed.likes);
  const comments = numeric(seed.comments);
  const shares = numeric(seed.shares);
  const stats = { views, likes, comments, shares, saves: 0 };
  const engagementRate = views ? (likes + comments + shares) / views : 0;
  const outlier = Math.min(99, Math.round(72 + index * 6 + engagementRate * 100));
  const fidelity = Math.min(99, 88 + index * 3);
  const composite = Math.round(outlier * 0.48 + fidelity * 0.36 + Math.min(100, engagementRate * 900) * 0.16);

  return {
    id: `demo-${profile.id}-${index + 1}`,
    providerId: 'local-demo',
    sourceKind: 'demo-seed',
    sourceLabel: 'Demo seed, not live TikTok evidence',
    appProfileId: profile.id,
    platform: 'TikTok',
    url: '',
    thumbnail: '',
    author: 'copytok-demo',
    text: seed.text,
    postedAt: new Date(Date.now() - (index + 2) * 86400000).toISOString(),
    durationSeconds: 18 + index * 4,
    music: 'Original sound placeholder',
    hashtags: profile.hashtags.slice(0, 4),
    stats,
    score: {
      composite,
      outlier,
      engagementRate,
      fidelity,
      momentum: 70 + index * 5,
      confidence: 'demo seed',
    },
    format: {
      hookType: seed.hookType,
      firstThreeSeconds: seed.text,
      visualBeat: seed.visualBeat,
      textOverlay: seed.overlay,
      creatorAction: seed.action,
      editPattern: 'Cold open, hard cut, proof moment, app reveal, one-line CTA.',
      audioCue: 'Use the source cadence if licensed, otherwise recreate with a fresh voiceover.',
      productInsertion: seed.productInsertion,
      cta: seed.cta,
    },
    adaptationAngles: [
      `Keep the first line almost identical but swap the product noun to ${profile.name}.`,
      'Copy the facial reaction and first hard cut timing.',
      'Change only the claim-sensitive details that must become product-truthful.',
    ],
    fetchedAt,
    query,
  };
}

function buildApifyInput(input, profile) {
  const query = input.query?.trim() || profile.defaultQuery;
  const seedQueries = [query, ...profile.seedQueries].filter(Boolean);
  const uniqueQueries = [...new Set(seedQueries)].slice(0, 4);
  const maxItems = Math.max(6, Math.min(Number(input.limit) || 24, 60));

  return {
    search: uniqueQueries,
    hashtags: profile.hashtags.slice(0, 8),
    profiles: profile.competitorHandles || [],
    resultsPerPage: maxItems,
    maxProfilesPerQuery: 10,
    shouldDownloadVideos: false,
    shouldDownloadCovers: true,
    shouldDownloadSubtitles: true,
    scrapeRelatedVideos: true,
    excludePinnedPosts: false,
  };
}

async function runApifyTikTokScout(input, profile, fetchedAt) {
  const token = resolveApifyToken();
  if (!token) {
    return {
      ok: false,
      posts: [],
      warnings: ['APIFY_TOKEN is missing. Add it to the CopyTok keychain entry or environment before running live TikTok discovery.'],
      message: 'Apify TikTok discovery is not active yet.',
    };
  }

  const actorInput = buildApifyInput(input, profile);
  const response = await fetch('https://api.apify.com/v2/actors/clockworks~tiktok-scraper/run-sync-get-dataset-items?timeout=300', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(actorInput),
  });

  if (!response.ok) {
    const detail = truncate(await response.text().catch(() => ''), 260);
    return {
      ok: false,
      posts: [],
      warnings: [`Apify returned HTTP ${response.status}. ${detail}`.trim()],
      message: 'Live TikTok discovery failed before results were returned.',
    };
  }

  const payload = await response.json();
  const items = Array.isArray(payload) ? payload : Array.isArray(payload?.items) ? payload.items : [];
  const posts = normalizeApifyPosts(items, profile, input, fetchedAt);
  const filtered = posts.filter((post) => post.stats.views >= (Number(input.minViews) || 0));
  return {
    ok: true,
    posts: scoreTrendPosts(filtered),
    warnings: filtered.length
      ? []
      : ['Apify completed, but no posts matched the current filters. Loosen the search or minimum views.'],
    message: filtered.length ? `Fetched ${filtered.length} live TikTok records through Apify.` : 'No matching TikTok records returned.',
  };
}

function normalizeApifyPosts(items, profile, input, fetchedAt) {
  return items
    .map((item, index) => normalizeApifyPost(item, profile, input, index, fetchedAt))
    .filter(Boolean);
}

function normalizeApifyPost(item, profile, input, index, fetchedAt) {
  const id = String(item.id || item.videoId || item.aweme_id || `apify-${Date.now()}-${index}`);
  const author =
    item.authorMeta?.name ||
    item.authorMeta?.nickName ||
    item['authorMeta.name'] ||
    item.author ||
    item.uploader ||
    '';
  const text = truncate(item.text || item.desc || item.description || item.title || '', 520);
  const stats = {
    views: numeric(item.playCount ?? item.stats?.playCount ?? item.viewCount ?? item.views),
    likes: numeric(item.diggCount ?? item.stats?.diggCount ?? item.likeCount ?? item.likes),
    comments: numeric(item.commentCount ?? item.stats?.commentCount ?? item.comments),
    shares: numeric(item.shareCount ?? item.stats?.shareCount ?? item.shares),
    saves: numeric(item.collectCount ?? item.stats?.collectCount ?? item.saves),
  };
  const createTime = item.createTime || item.create_time || item.createTimeISO || item.createdAt;
  const postedAt =
    typeof createTime === 'number'
      ? new Date(createTime * 1000).toISOString()
      : createTime
        ? new Date(createTime).toISOString()
        : fetchedAt;
  const url =
    item.webVideoUrl ||
    item.url ||
    item.shareUrl ||
    item.videoUrl ||
    (author && id ? `https://www.tiktok.com/@${author}/video/${id}` : '');
  const hashtags = Array.isArray(item.hashtags)
    ? item.hashtags.map((tag) => (typeof tag === 'string' ? tag : tag?.name || tag?.title)).filter(Boolean)
    : [];
  const music =
    item.musicMeta?.musicName ||
    item.musicMeta?.name ||
    item.musicTitle ||
    item.music ||
    '';
  const thumbnail =
    item.videoMeta?.coverUrl ||
    item.videoMeta?.thumbnail ||
    item.covers?.default ||
    item.thumbnail ||
    '';

  if (!text && !url && !stats.views) return null;

  return {
    id: `apify-${id}`,
    providerId: 'apify-tiktok',
    sourceKind: 'real-scrape',
    sourceLabel: 'Live TikTok record via Apify',
    appProfileId: profile.id,
    platform: 'TikTok',
    url,
    thumbnail,
    author,
    text,
    postedAt,
    durationSeconds: numeric(item.videoMeta?.duration ?? item.duration, null),
    music,
    hashtags,
    stats,
    score: {
      composite: 0,
      outlier: 0,
      engagementRate: stats.views ? (stats.likes + stats.comments + stats.shares + stats.saves) / stats.views : 0,
      fidelity: estimateFormatFidelity(text, hashtags, profile),
      momentum: 0,
      confidence: 'real metrics',
    },
    format: inferFormatFingerprint(text, hashtags, profile),
    adaptationAngles: buildAdaptationAngles(text, profile),
    fetchedAt,
    query: input.query?.trim() || profile.defaultQuery,
  };
}

function estimateFormatFidelity(text, hashtags, profile) {
  const lower = `${text} ${hashtags.join(' ')}`.toLowerCase();
  let score = 42;
  for (const token of profile.category.toLowerCase().split(/\W+/).filter(Boolean)) {
    if (lower.includes(token)) score += 7;
  }
  for (const tag of profile.hashtags) {
    if (lower.includes(tag.toLowerCase())) score += 5;
  }
  if (/\bpov\b|stop|nobody|guess|watch|mistake|secret|before|after|wait/i.test(text)) score += 14;
  if (text.length > 24 && text.length < 220) score += 8;
  if (/[?!]/.test(text)) score += 5;
  return Math.max(0, Math.min(99, score));
}

function scoreTrendPosts(posts) {
  const maxViews = Math.max(1, ...posts.map((post) => post.stats.views));
  const maxEngagement = Math.max(0.0001, ...posts.map((post) => post.score.engagementRate));
  const now = Date.now();

  return posts.map((post) => {
    const viewScore = Math.min(100, Math.round((Math.log10(post.stats.views + 10) / Math.log10(maxViews + 10)) * 100));
    const engagementScore = Math.min(100, Math.round((post.score.engagementRate / maxEngagement) * 100));
    const ageDays = Math.max(1, (now - new Date(post.postedAt).getTime()) / 86400000);
    const momentum = Math.min(100, Math.round((post.stats.views / ageDays / Math.max(1, maxViews / 30)) * 100));
    const outlier = Math.round(viewScore * 0.58 + engagementScore * 0.24 + momentum * 0.18);
    const composite = Math.round(outlier * 0.45 + post.score.fidelity * 0.38 + engagementScore * 0.17);
    return {
      ...post,
      score: {
        ...post.score,
        composite,
        outlier,
        momentum,
      },
    };
  });
}

function inferFormatFingerprint(text, hashtags, profile) {
  const lower = `${text} ${hashtags.join(' ')}`.toLowerCase();
  const hookType = lower.includes('pov')
    ? 'POV hook'
    : lower.includes('guess')
      ? 'guessing game'
      : lower.includes('mistake') || lower.includes('stop')
        ? 'mistake correction'
        : lower.includes('secret') || lower.includes('nobody')
          ? 'secret reveal'
          : 'direct confession';

  return {
    hookType,
    firstThreeSeconds: text || `Open with a direct ${profile.name} problem statement.`,
    visualBeat:
      hookType === 'guessing game'
        ? 'Start with a split A/B moment and make the viewer choose before the reveal.'
        : 'Start on a tight face reaction, then hard cut to the proof object or phone screen.',
    textOverlay:
      text.length > 72 ? text.slice(0, 72).replace(/\s+\S*$/, '') : text || `I did not expect ${profile.name} to help with this`,
    creatorAction: 'Hold a reaction for the first beat, point at the source problem, then reveal the app-assisted result.',
    editPattern: 'Cold open, proof cut, app reveal, result comparison, short CTA.',
    audioCue: 'Recreate the cadence with cleared voiceover or licensed audio; do not assume source voice rights.',
    productInsertion: `Introduce ${profile.name} at the first proof moment, not as a generic ad card.`,
    cta: 'Ask for a save, comment, or quick test tied to the exact niche problem.',
  };
}

function buildAdaptationAngles(text, profile) {
  const opening = text || profile.defaultQuery;
  return [
    `Keep the opening structure close: "${truncate(opening, 92)}"`,
    `Swap the proof object into a truthful ${profile.name} moment.`,
    'Preserve the first reaction, edit rhythm, and CTA pressure.',
  ];
}

async function runTrendScout(input = {}, options = {}) {
  const runtimeDir = resolveRuntimeDir(options);
  const profile = getProfile(input.appProfileId);
  const providerId = input.providerId === 'apify-tiktok' ? 'apify-tiktok' : 'local-demo';
  const fetchedAt = new Date().toISOString();
  const runId = `scout-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const query = input.query?.trim() || profile.defaultQuery;
  const result =
    providerId === 'apify-tiktok'
      ? await runApifyTikTokScout({ ...input, query }, profile, fetchedAt)
      : {
          ok: true,
          posts: demoTrendPosts(profile, query, fetchedAt),
          warnings: ['Local demo mode is for interface testing only. These are not live TikTok records.'],
          message: 'Loaded local demo trend seeds.',
        };
  const posts = scoreTrendPosts(result.posts || []);
  const scoutResult = {
    ok: result.ok,
    runId,
    providerId,
    appProfileId: profile.id,
    query,
    fetchedAt,
    posts,
    warnings: result.warnings || [],
    message: result.message || '',
    databasePath: scoutDbPath(runtimeDir),
  };

  const db = await readScoutDb(runtimeDir);
  const databasePath = await writeScoutDb(runtimeDir, {
    ...db,
    runs: [
      ...db.runs,
      {
        runId,
        providerId,
        appProfileId: profile.id,
        query,
        fetchedAt,
        ok: scoutResult.ok,
        postCount: posts.length,
        warnings: scoutResult.warnings,
      },
    ],
    posts: [
      ...db.posts.filter((post) => !posts.some((candidate) => candidate.id === post.id)),
      ...posts,
    ],
  });

  return { ...scoutResult, databasePath };
}

async function createTrendAdaptation(input = {}, options = {}) {
  const runtimeDir = resolveRuntimeDir(options);
  const profile = getProfile(input.appProfileId);
  const post = input.post || {};
  const timestamp = new Date().toISOString();
  const id = `brief-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const title = `${profile.name} adaptation of ${post.format?.hookType || 'trend format'}`;
  const brief = {
    id,
    createdAt: timestamp,
    appProfileId: profile.id,
    appName: profile.name,
    postId: post.id || '',
    sourceUrl: post.url || '',
    sourceLabel: post.sourceLabel || '',
    title,
    mimicPlan: {
      fidelityRule:
        'Preserve the hook, first visual beat, gesture/reaction, pacing, on-screen text structure, and CTA pressure. Change only the app-specific proof and legally sensitive details.',
      openingShot: post.format?.visualBeat || 'Open on a tight reaction shot and cut quickly to product proof.',
      onscreenText: [
        post.format?.textOverlay || `${profile.name} changed this workflow`,
        `${profile.name} version: same format, truthful app proof`,
        'Save this before you make the same mistake',
      ],
      spokenHook: [
        post.format?.firstThreeSeconds || `I did not expect ${profile.name} to solve this.`,
        `${profile.name === 'SnapGLP' ? 'If you are on GLP-1s' : 'If you chase guitar tones'}, this is the shortcut I wish I had earlier.`,
      ],
      beatSheet: [
        '0.0-1.5s: Hold the same face/reaction energy as the source format.',
        '1.5-3.0s: Put the copied hook text on screen with minimal wording changes.',
        `3.0-6.0s: Show the real ${profile.name} use case as the proof moment.`,
        '6.0-10.0s: Match the source cut rhythm and demonstrate one before/after contrast.',
        '10.0-15.0s: End with the same CTA shape, rewritten for our app.',
      ],
      productInsertion: post.format?.productInsertion || `Reveal ${profile.name} at the first proof moment.`,
      avatarDirection: 'Use a natural UGC creator look, direct eye contact, and the same emotional reaction as the winning source.',
      sourcePrep: post.url
        ? 'Send the source URL into CopyTok source analysis, then use only owned/licensed motion, transcript, audio, and voice references.'
        : 'Use this as a creative seed only. Record or supply an owned action template before rendering.',
    },
  };

  const briefsDir = path.join(runtimeDir, 'trend-scout', 'adaptation-briefs');
  await fsPromises.mkdir(briefsDir, { recursive: true });
  const savedPath = path.join(briefsDir, `${id}.json`);
  const savedBrief = { ...brief, savedPath };
  await fsPromises.writeFile(savedPath, JSON.stringify(savedBrief, null, 2));

  const db = await readScoutDb(runtimeDir);
  await writeScoutDb(runtimeDir, {
    ...db,
    briefs: [...db.briefs, savedBrief],
  });

  return savedBrief;
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
  const userDataPath = resolveRuntimeDir(options);
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
    nextAdapters: ['direct-seedance-2', 'direct-kling-3', 'fal-pixverse-swap', 'heygen-cloud', 'openai-image-2'],
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

async function prepareSourceFile(filePath, options = {}) {
  const originalInputPath = assertExistingFile(filePath, 'Source video');
  if (!/\.(mp4|mov|m4v|webm|mkv)$/i.test(originalInputPath)) {
    throw new Error('Source footage must be a video file.');
  }

  const userDataPath = resolveRuntimeDir(options);
  const appRoot = options.appRoot || '';
  const runId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const workspaceDir = path.join(userDataPath, 'source-cache', runId);
  await fsPromises.mkdir(workspaceDir, { recursive: true });

  const originalPath = path.join(workspaceDir, `source${path.extname(originalInputPath).toLowerCase() || '.mp4'}`);
  await fsPromises.copyFile(originalInputPath, originalPath);

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

  const transcript = await extractWhisperTranscript(audioPath, workspaceDir, appRoot);
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
    analysis: null,
    transcript,
    nextAdapters: ['direct-seedance-2', 'direct-kling-3', 'fal-pixverse-swap', 'heygen-cloud', 'openai-image-2'],
    notes: [
      `Local source clipped to the first ${MAX_SOURCE_SECONDS} seconds for predictable cost and provider limits.`,
      'Normalized MP4 is ready for direct provider, fal fallback, or local finishing handoff.',
      transcript.status === 'ready'
        ? `Transcript ready via ${transcript.source}.`
        : 'Transcript unavailable; provider can still render motion/reference video.',
    ],
  };

  await fsPromises.writeFile(path.join(workspaceDir, 'prepared-source.json'), JSON.stringify(prepared, null, 2));
  return prepared;
}

function safeSlug(value, fallback = 'copytok') {
  const slug = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return slug || fallback;
}

function resolveMarketingRoot(input) {
  const root = input.campaign?.marketingRoot;
  if (typeof root === 'string' && root.startsWith(MARKETING_OUTPUT_ROOT)) return root;
  const appName = input.campaign?.name === 'Tone Clone' ? 'ToneClone' : input.campaign?.name || 'Unassigned';
  return path.join(MARKETING_OUTPUT_ROOT, safeSlug(appName, 'unassigned'));
}

function buildGenerationVariants(input) {
  const requested = Math.max(1, Math.min(Number(input.preset?.generationCount) || 1, 3));
  const slots = Array.isArray(input.avatarSlots) ? input.avatarSlots : [];
  const fallback = {
    slot: 1,
    avatarId: 'uploaded-first-frame',
    avatarName: 'Uploaded first-frame image',
    avatarStyle: 'User-supplied',
    avatarPrompt: 'Use the uploaded avatar image as the first frame and identity anchor.',
    localImageName: input.referenceFace || '',
    localImagePath: input.referenceFacePath || '',
  };
  return Array.from({ length: requested }, (_unused, index) => {
    const slot = slots[index] || (index === 0 ? fallback : {});
    return {
      slot: index + 1,
      avatarId: slot.avatarId || (index === 0 ? fallback.avatarId : `avatar-${index + 1}`),
      avatarName: slot.avatarName || (index === 0 ? fallback.avatarName : `Avatar ${index + 1}`),
      avatarStyle: slot.avatarStyle || '',
      avatarPrompt: slot.avatarPrompt || '',
      usageNote: slot.usageNote || '',
      localImageName: slot.localImageName || (index === 0 ? fallback.localImageName : ''),
      localImagePath: slot.localImagePath || (index === 0 ? fallback.localImagePath : ''),
      renderable: Boolean(slot.localImagePath || (index === 0 && fallback.localImagePath)),
    };
  });
}

function campaignContext(input) {
  const campaign = input.campaign || {};
  const formatCategory = input.formatCategory || {};
  const trendPreset = input.trendPreset || {};
  return {
    appName: campaign.name || 'CopyTok campaign',
    appShortName: campaign.shortName || '',
    oneLineTruth: campaign.oneLineTruth || '',
    audience: campaign.audience || [],
    tone: campaign.tone || [],
    approvedCtas: campaign.approvedCtas || [],
    productTruths: campaign.productTruths || [],
    claimBoundaries: campaign.claimBoundaries || [],
    bannedAngles: campaign.bannedAngles || [],
    format: {
      id: formatCategory.id || '',
      name: formatCategory.name || '',
      summary: formatCategory.summary || '',
      bestFor: formatCategory.bestFor || '',
    },
    trend: {
      id: trendPreset.id || '',
      name: trendPreset.name || '',
      hookPattern: trendPreset.hookPattern || '',
      firstThreeSeconds: trendPreset.firstThreeSeconds || '',
      visualBehavior: trendPreset.visualBehavior || '',
      promptTemplate: trendPreset.promptTemplate || '',
    },
  };
}

function providerPrompt(input, variant) {
  const context = campaignContext(input);
  const transcript = input.preparedSource?.transcript?.text
    ? `Reference transcript or caption structure: ${truncate(input.preparedSource.transcript.text, 1100)}`
    : 'No source transcript is available; infer timing from the normalized video only.';
  return [
    `Campaign app: ${context.appName}.`,
    `Product truth: ${context.oneLineTruth}`,
    `Format: ${context.format.name}. ${context.format.summary}`,
    `Saved trend hook: ${context.trend.firstThreeSeconds}`,
    `Visual behavior to mimic: ${context.trend.visualBehavior}`,
    `Avatar: ${variant.avatarName}. ${variant.avatarPrompt}`,
    'Use the avatar image as the first frame and identity anchor. Use the source video as the action, gesture, timing, framing, pacing, and edit reference.',
    'Keep the result realistic, phone-native, and suitable for internal marketing review.',
    'Preserve provider settings such as resolution, duration, aspect ratio, and model outside the prompt.',
    transcript,
    `Avoid: ${(context.bannedAngles || []).join('; ')}`,
  ]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function negativeVideoPrompt(input) {
  const boundaries = input.campaign?.claimBoundaries || [];
  return [
    'No fake celebrity, no protected likeness, no medical claim, no guaranteed result, no brand logo hallucination.',
    ...boundaries,
  ]
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function openAiImageSize(aspectRatio, resolution) {
  if (aspectRatio === '1:1') return resolution === '1080p' ? '1536x1536' : '1024x1024';
  if (aspectRatio === '16:9') return resolution === '1080p' ? '1536x864' : '1280x720';
  return resolution === '1080p' ? '1024x1792' : '1024x1536';
}

function videoResolution(aspectRatio, resolution) {
  if (aspectRatio === '1:1') return resolution === '1080p' ? '1440x1440' : '960x960';
  if (aspectRatio === '16:9') return resolution === '1080p' ? '1920x1080' : '1280x720';
  return resolution === '1080p' ? '1080x1920' : '720x1280';
}

function providerDuration(input, preparedSource) {
  const rawDuration = numeric(preparedSource?.metadata?.durationSeconds ?? preparedSource?.durationSeconds, 7);
  if (!rawDuration) return 7;
  return Math.min(15, Math.max(4, Math.round(rawDuration)));
}

async function readFileData(filePath, label) {
  const resolvedPath = assertExistingFile(filePath, label);
  return fsPromises.readFile(resolvedPath);
}

async function fileToDataUri(filePath, label, maxBytes = MAX_INLINE_REFERENCE_VIDEO_BYTES) {
  const resolvedPath = assertExistingFile(filePath, label);
  const stat = await fsPromises.stat(resolvedPath);
  if (stat.size > maxBytes) {
    throw new Error(`${label} is too large for inline direct-provider upload. Prepare a shorter source clip or use a URL-backed provider route.`);
  }
  const bytes = await fsPromises.readFile(resolvedPath);
  return `data:${mimeTypeForFile(resolvedPath)};base64,${Buffer.from(bytes).toString('base64')}`;
}

function buildHeygenPrompt(input, variant) {
  const context = campaignContext(input);
  const transcript = input.preparedSource?.transcript?.text
    ? `Use this source caption/transcript structure as inspiration, while rewriting for ${context.appName}: ${truncate(input.preparedSource.transcript.text, 900)}`
    : '';
  return [
    `Create a short vertical UGC-style presenter video for ${context.appName}.`,
    `Audience: ${(context.audience || []).join('; ')}`,
    `Tone: ${(context.tone || []).join(', ')}`,
    `Opening hook: ${context.trend.firstThreeSeconds}`,
    `Format: ${context.format.name}. ${context.trend.promptTemplate || context.format.summary}`,
    `Avatar direction: ${variant.avatarPrompt || variant.avatarName}`,
    `Product truth: ${context.oneLineTruth}`,
    `Allowed CTA: ${(context.approvedCtas || [])[0] || 'Try it today.'}`,
    `Avoid these claims: ${(context.bannedAngles || []).join('; ')}`,
    transcript,
    'Keep it phone-native, natural, direct, and under 20 seconds unless the script demands less.',
  ]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildFinishPlan(input, packetId, variants) {
  const captionStyle = input.preset?.captionStyle ?? 'tiktok-bold';
  const dateSlug = new Date().toISOString().slice(0, 10);
  const campaignRoot = resolveMarketingRoot(input);
  const formatSlug = safeSlug(input.formatCategory?.name || input.formatCategory?.id || 'format');
  const outputDir = path.join(campaignRoot, 'Generated Outputs', dateSlug, `${formatSlug}-${packetId}`);
  return {
    engine: 'ffmpeg',
    execution: 'automatic-local-backend',
    outputDir,
    rules: [
      'Use hard visual cuts only.',
      'Align hard audio cuts to visual cuts.',
      'Preserve native source cadence when possible; do not fake frame interpolation.',
      'Final export: MP4, H.264 High Profile, progressive, square pixel, SDR Rec.709, yuv420p, AAC-LC stereo 48 kHz, +faststart.',
      'Default CRF 16-18 with slow preset when time allows.',
    ],
    captions: {
      style: captionStyle,
      burnIn: captionStyle !== 'none',
      source: input.preparedSource?.transcript?.path || 'provider transcript/source captions when available',
    },
    commands: {
      inspect:
        'ffprobe -v error -select_streams v:0 -show_entries stream=width,height,r_frame_rate,avg_frame_rate,pix_fmt,color_space,color_transfer,color_primaries -show_entries format=duration -of json input.mp4',
      finalExport:
        'ffmpeg -f concat -safe 0 -i clips.txt -c:v libx264 -preset slow -crf 16 -pix_fmt yuv420p -colorspace bt709 -color_primaries bt709 -color_trc bt709 -c:a aac -b:a 320k -ar 48000 -movflags +faststart output.mp4',
    },
    variants: variants.map((variant) => ({
      slot: variant.slot,
      avatarName: variant.avatarName,
      outputFile: path.join(outputDir, `variant-${variant.slot}-${safeSlug(variant.avatarName)}.mp4`),
    })),
    agentRecommendation:
      'Marketing/Codex agents should create the script, hook, and shot brief; CopyTok should run the deterministic FFmpeg finish automatically from this plan.',
  };
}

function buildProviderPackets(input, packetId = 'packet') {
  const resolution = input.preset?.resolution ?? '720p';
  const aspectRatio = input.preset?.aspectRatio ?? '9:16';
  const variants = buildGenerationVariants(input);
  const pixverseResolution = falResolution('fal-pixverse-swap', resolution);
  const context = campaignContext(input);
  const finishPlan = buildFinishPlan(input, packetId, variants);
  return {
    campaignContext: context,
    variants,
    finishingPlan: finishPlan,
    directSeedance2: {
      provider: 'byteplus-modelark',
      model: resolveSecret(PROVIDER_SECRETS.seedanceModel) || DEFAULT_SEEDANCE_MODEL,
      secretEnv: 'ARK_API_KEY, SEEDANCE_API_KEY, or BYTEPLUS_API_KEY',
      requiredConfig: ['Optional SEEDANCE_API_BASE_URL override only when not using the default BytePlus global route'],
      mode: 'async-video-generation',
      requestTemplate: {
        model: resolveSecret(PROVIDER_SECRETS.seedanceModel) || DEFAULT_SEEDANCE_MODEL,
        prompt: '<variant-specific prompt>',
        negative_prompt: negativeVideoPrompt(input),
        inputs: {
          first_frame_image: '<upload-or-provider-file-id-for-avatar-image>',
          reference_video: '<upload-or-provider-file-id-for-normalized-source-video>',
          optional_audio_reference: '<upload-or-provider-file-id-for-source-audio>',
        },
        resolution,
        aspect_ratio: aspectRatio,
        duration_seconds: 'auto_or_4_to_15',
        quality: 'high',
        audio: Boolean(input.preparedSource?.files?.audio),
      },
      variants: variants.map((variant) => ({
        slot: variant.slot,
        avatarName: variant.avatarName,
        localImagePath: variant.localImagePath,
        prompt: providerPrompt(input, variant),
      })),
    },
    directKling3: {
      provider: 'kling-open-platform',
      model: resolveSecret(PROVIDER_SECRETS.klingModel) || DEFAULT_KLING_MODEL,
      secretEnv: 'KLING_ACCESS_KEY and KLING_SECRET_KEY, or KLING_API_KEY as ACCESS_KEY:SECRET_KEY',
      requiredConfig: ['Optional KLING_MODEL or KLING_BASE_URL override only when needed'],
      mode: 'motion_control_or_image_to_video',
      requestTemplate: {
        mode: 'motion_control',
        model: resolveSecret(PROVIDER_SECRETS.klingModel) || DEFAULT_KLING_MODEL,
        reference_image: '<upload-or-provider-file-id-for-avatar-image>',
        reference_video: '<normalized-source-video-inline-or-url-reference>',
        prompt: '<variant-specific prompt>',
        negative_prompt: negativeVideoPrompt(input),
        duration_seconds: 'source-video-for-motion-control-or-4-to-15',
        resolution,
        aspect_ratio: aspectRatio,
        fps_preference: 'highest_native',
        audio: false,
      },
      variants: variants.map((variant) => ({
        slot: variant.slot,
        avatarName: variant.avatarName,
        localImagePath: variant.localImagePath,
        prompt: providerPrompt(input, variant),
      })),
    },
    openAiImage2: {
      provider: 'openai',
      model: 'gpt-image-2',
      secretEnv: 'OPENAI_API_KEY',
      mode: 'high-quality-still-generation',
      requestTemplate: {
        model: 'gpt-image-2',
        quality: 'high',
        size: openAiImageSize(aspectRatio, resolution),
        output_format: 'png',
      },
      variants: variants.map((variant) => ({
        slot: variant.slot,
        avatarName: variant.avatarName,
        prompt:
          variant.avatarPrompt ||
          `${context.appName} UGC creator first-frame portrait, photorealistic vertical phone image, premium social ad lighting.`,
      })),
    },
    heygenVideoAgent: {
      provider: 'heygen-cli',
      model: 'video-agent-v3',
      secretEnv: 'heygen CLI auth',
      mode: 'talking-head-or-presenter',
      requestTemplate: {
        orientation: aspectRatio === '16:9' ? 'landscape' : 'portrait',
        prompt: '<campaign-aware video-agent prompt>',
      },
      variants: variants.map((variant) => ({
        slot: variant.slot,
        avatarName: variant.avatarName,
        prompt: buildHeygenPrompt(input, variant),
      })),
    },
    falSeedanceReference: {
      provider: 'fal',
      model: FAL_PROVIDERS['fal-seedance-reference'].model,
      secretEnv: 'FAL_KEY',
      mode: 'queue',
      request: {
        prompt: seedancePrompt(input, {
          imageUrl: '<upload-avatar-image-to-storage-first>',
          videoUrl: '<upload-normalized-source-video-to-storage-first>',
          audioUrl: '<optional-uploaded-source-audio>',
        }),
        image_urls: ['<upload-avatar-image-to-storage-first>'],
        video_urls: ['<upload-normalized-source-video-to-storage-first>'],
        audio_urls: ['<optional-uploaded-source-audio>'],
        resolution,
        duration: 'auto',
        aspect_ratio: aspectRatio,
        generate_audio: true,
        bitrate_mode: 'high',
        end_user_id: 'copytok-local',
      },
    },
    falPixverseSwap: {
      provider: 'fal',
      model: FAL_PROVIDERS['fal-pixverse-swap'].model,
      secretEnv: 'FAL_KEY',
      mode: 'queue',
      request: {
        image_url: '<upload-avatar-image-to-storage-first>',
        video_url: '<upload-normalized-source-video-to-storage-first>',
        mode: 'person',
        resolution: pixverseResolution,
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

function seedancePrompt(input) {
  const variant = input.activeVariant || buildGenerationVariants(input)[0] || {};
  const context = campaignContext(input);
  const transcript = input.preparedSource?.transcript?.text
    ? ` Reference transcript: ${truncate(input.preparedSource.transcript.text, 1600)}`
    : '';
  const audioInstruction = input.preparedSource?.files?.audio
    ? ' Use @Audio1 as the audio, voice, cadence, and timing reference when possible.'
    : '';
  return [
    `Campaign app: ${context.appName}. Product truth: ${context.oneLineTruth}`,
    `Trend hook to preserve: ${context.trend.firstThreeSeconds}`,
    `Avatar direction: ${variant.avatarName || 'uploaded avatar'} ${variant.avatarPrompt || ''}`,
    'Create a vertical social UGC clip using @Image1 as the avatar identity and @Video1 as the action, camera, gesture, timing, framing, and edit reference.',
    'Keep the output realistic, clean, brand-safe, and suitable for internal marketing review.',
    'Preserve the source clip pacing and body performance as closely as the model allows.',
    `Avoid: ${(context.bannedAngles || []).join('; ')}`,
    audioInstruction,
    transcript,
  ]
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function loadFalClient() {
  const falKey = resolveFalKey();
  if (!falKey) {
    throw new Error('FAL_KEY is not available in the CopyTok Keychain entry or environment.');
  }
  const { fal } = await import('@fal-ai/client');
  fal.config({ credentials: falKey });
  return fal;
}

function createUploadFile(bytes, filePath) {
  const fileName = path.basename(filePath);
  const type = mimeTypeForFile(filePath);
  if (typeof File === 'function') {
    return new File([bytes], fileName, { type });
  }
  if (typeof Blob === 'function') {
    const blob = new Blob([bytes], { type });
    blob.name = fileName;
    return blob;
  }
  throw new Error('This Electron runtime cannot create upload files for fal storage.');
}

async function uploadFileToFal(fal, filePath) {
  const bytes = await fsPromises.readFile(filePath);
  return fal.storage.upload(createUploadFile(bytes, filePath));
}

function falResolution(providerId, presetResolution) {
  if (providerId === 'fal-pixverse-swap') {
    return presetResolution === '1080p' ? '720p' : presetResolution;
  }
  return presetResolution ?? '720p';
}

function buildFalRequest(providerId, input, urls) {
  const resolution = falResolution(providerId, input.preset?.resolution ?? '720p');
  const aspectRatio = input.preset?.aspectRatio ?? '9:16';
  if (providerId === 'fal-pixverse-swap') {
    return {
      video_url: urls.videoUrl,
      mode: 'person',
      keyframe_id: 1,
      image_url: urls.imageUrl,
      resolution,
      original_sound_switch: true,
    };
  }

  const request = {
    prompt: seedancePrompt(input),
    image_urls: [urls.imageUrl],
    video_urls: [urls.videoUrl],
    resolution,
    duration: 'auto',
    aspect_ratio: aspectRatio,
    generate_audio: true,
    bitrate_mode: resolution === '1080p' ? 'high' : 'standard',
    end_user_id: 'copytok-local',
  };
  if (urls.audioUrl) {
    request.audio_urls = [urls.audioUrl];
  }
  return request;
}

function extractFalVideoUrl(data) {
  if (data?.video?.url) return data.video.url;
  if (Array.isArray(data?.videos) && data.videos[0]?.url) return data.videos[0].url;
  if (typeof data?.url === 'string') return data.url;
  throw new Error('fal completed the request, but no output video URL was returned.');
}

async function downloadProviderOutput(url, outputDir, providerId, requestId) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Generated video download failed with ${response.status}.`);
  }
  await fsPromises.mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `${providerId}-${requestId || Date.now().toString(36)}.mp4`);
  const bytes = Buffer.from(await response.arrayBuffer());
  await fsPromises.writeFile(outputPath, bytes);
  return outputPath;
}

async function writeProviderPayload(userDataPath, providerId, requestId, payload) {
  const payloadDir = path.join(userDataPath, 'provider-payloads');
  await fsPromises.mkdir(payloadDir, { recursive: true });
  const providerPayloadPath = path.join(payloadDir, `${providerId}-${requestId || Date.now().toString(36)}.json`);
  await fsPromises.writeFile(providerPayloadPath, JSON.stringify(payload, null, 2));
  return providerPayloadPath;
}

function providerOutputDir(input, userDataPath, providerId, requestId) {
  const campaignRoot = resolveMarketingRoot(input);
  const dateSlug = new Date().toISOString().slice(0, 10);
  if (campaignRoot.startsWith(MARKETING_OUTPUT_ROOT)) {
    return path.join(campaignRoot, 'Generated Outputs', dateSlug, `${providerId}-${requestId}`);
  }
  return path.join(userDataPath, 'provider-outputs', `${providerId}-${requestId}`);
}

function providerLabel(providerId) {
  if (FAL_PROVIDERS[providerId]) return FAL_PROVIDERS[providerId].label;
  if (providerId === 'direct-seedance-2') return 'Direct Seedance 2.0';
  if (providerId === 'direct-kling-3') return 'Direct Kling 3.0';
  if (providerId === 'openai-image-2') return 'OpenAI GPT Image 2';
  if (providerId === 'heygen-cloud') return 'HeyGen Video Agent';
  return 'CopyTok Provider';
}

function modelForProvider(providerId) {
  if (FAL_PROVIDERS[providerId]) return FAL_PROVIDERS[providerId].model;
  if (providerId === 'direct-seedance-2') return resolveSecret(PROVIDER_SECRETS.seedanceModel) || DEFAULT_SEEDANCE_MODEL;
  if (providerId === 'direct-kling-3') return resolveSecret(PROVIDER_SECRETS.klingModel) || DEFAULT_KLING_MODEL;
  if (providerId === 'openai-image-2') return 'gpt-image-2';
  if (providerId === 'heygen-cloud') return 'video-agent-v3';
  return '';
}

async function blockedProviderResult(input, options, error, extra = {}) {
  const createdAt = new Date().toISOString();
  const userDataPath = resolveRuntimeDir(options);
  const requestId = `blocked-${Date.now().toString(36)}`;
  const providerPayloadPath = await writeProviderPayload(userDataPath, input.providerId, requestId, {
    createdAt,
    providerId: input.providerId,
    providerName: providerLabel(input.providerId),
    model: modelForProvider(input.providerId),
    status: 'blocked',
    error,
    ...extra,
    packet: buildProviderPackets(input, requestId),
  });
  return {
    ok: false,
    providerId: input.providerId,
    providerName: providerLabel(input.providerId),
    model: modelForProvider(input.providerId),
    status: 'blocked',
    requestId,
    providerPayloadPath,
    error,
    createdAt,
  };
}

function requireRenderableVariants(input, referencePath) {
  const variants = buildGenerationVariants(input);
  const missing = variants.filter((variant) => !variant.localImagePath && !(variant.slot === 1 && referencePath));
  if (missing.length) {
    throw new Error(
      `Attach a first-frame image for ${missing.map((variant) => `Video ${variant.slot}`).join(', ')} before rendering multiple variants.`,
    );
  }
  return variants.map((variant) => ({
    ...variant,
    localImagePath: variant.localImagePath || (variant.slot === 1 ? referencePath : ''),
  }));
}

async function renderWithFalProvider(input, options = {}) {
  const provider = FAL_PROVIDERS[input.providerId];
  const createdAt = new Date().toISOString();
  if (!provider) {
    throw new Error('Select a fal-backed provider before using the fal render adapter.');
  }

  const userDataPath = resolveRuntimeDir(options);
  const appRoot = options.appRoot || '';
  const referencePath = assertExistingFile(input.referenceFacePath, 'Avatar image');
  const variants = requireRenderableVariants(input, referencePath);
  const preparedSource =
    input.preparedSource?.ok
      ? input.preparedSource
      : input.sourceVideoPath
        ? await prepareSourceFile(input.sourceVideoPath, { userDataPath, appRoot })
        : null;
  const sourceVideoPath = preparedSource?.files?.normalizedVideo
    ? assertExistingFile(preparedSource.files.normalizedVideo, 'Prepared source video')
    : assertExistingFile(input.sourceVideoPath, 'Source video');
  const fal = await loadFalClient();
  const logs = [];
  const videoUrl = await uploadFileToFal(fal, sourceVideoPath);
  const audioUrl =
    input.providerId === 'fal-seedance-reference' && preparedSource?.files?.audio && fs.existsSync(preparedSource.files.audio)
      ? await uploadFileToFal(fal, preparedSource.files.audio)
      : '';
  const batchRequestId = `fal-${Date.now().toString(36)}`;
  const outputDir = providerOutputDir(input, userDataPath, input.providerId, batchRequestId);
  const variantResults = [];
  const requests = [];

  for (const variant of variants) {
    const imageUrl = await uploadFileToFal(fal, assertExistingFile(variant.localImagePath, `Video ${variant.slot} avatar image`));
    const request = buildFalRequest(input.providerId, { ...input, preparedSource, activeVariant: variant }, { imageUrl, videoUrl, audioUrl });
    requests.push({ slot: variant.slot, avatarName: variant.avatarName, request });
    const result = await fal.subscribe(provider.model, {
      input: request,
      logs: true,
      onQueueUpdate: (update) => {
        if (Array.isArray(update.logs)) {
          logs.push(...update.logs.map((log) => truncate(log.message ?? String(log), 240)));
        }
      },
    });
    const outputUrl = extractFalVideoUrl(result.data);
    const outputPath = await downloadProviderOutput(
      outputUrl,
      outputDir,
      `variant-${variant.slot}-${safeSlug(variant.avatarName)}`,
      result.requestId,
    );
    variantResults.push({
      slot: variant.slot,
      avatarName: variant.avatarName,
      requestId: result.requestId,
      outputUrl,
      outputPath,
      status: 'complete',
    });
  }

  const providerPayloadPath = await writeProviderPayload(userDataPath, input.providerId, batchRequestId, {
    createdAt,
    providerId: input.providerId,
    providerName: provider.label,
    model: provider.model,
    requestId: batchRequestId,
    requests,
    variants: variantResults,
    outputDir,
    preparedSourceRunId: preparedSource?.runId,
    campaign: campaignContext(input),
    finishingPlan: buildFinishPlan(input, batchRequestId, variants),
  });
  const firstVariant = variantResults[0];

  return {
    ok: true,
    providerId: input.providerId,
    providerName: provider.label,
    model: provider.model,
    status: 'complete',
    requestId: batchRequestId,
    outputUrl: firstVariant?.outputUrl,
    outputPath: firstVariant?.outputPath,
    providerPayloadPath,
    variants: variantResults,
    logs: logs.slice(-20),
    createdAt,
  };
}

async function renderWithHeygenCli(input, options = {}) {
  const createdAt = new Date().toISOString();
  const userDataPath = resolveRuntimeDir(options);
  const cliPath = resolveHeygenCli();
  if (!cliPath || heygenCliStatus() !== 'cli-ready') {
    return blockedProviderResult(input, options, 'HeyGen CLI is not installed or authenticated. Open HeyGen or run heygen auth login first.');
  }
  const requestId = `heygen-${Date.now().toString(36)}`;
  const variants = buildGenerationVariants(input);
  const prompt = buildHeygenPrompt(input, variants[0]);
  const orientation = input.preset?.aspectRatio === '16:9' ? 'landscape' : 'portrait';
  const result = spawnSync(
    cliPath,
    ['video-agent', 'create', '--mode', 'generate', '--orientation', orientation, '--prompt', prompt, '--wait'],
    { encoding: 'utf8', timeout: 1000 * 60 * 22, maxBuffer: MAX_BUFFER },
  );
  const stdout = result.stdout?.trim() || '';
  const stderr = result.stderr?.trim() || '';
  if (result.status !== 0) {
    const error = truncate(stderr || stdout || 'HeyGen video creation failed.', 900);
    return blockedProviderResult(input, options, error, { stdout: truncate(stdout, 1200), stderr: truncate(stderr, 1200) });
  }
  let parsed = null;
  try {
    parsed = stdout ? JSON.parse(stdout) : null;
  } catch {
    parsed = null;
  }
  const videoUrl =
    parsed?.data?.video_url ||
    parsed?.data?.video?.video_url ||
    parsed?.video_url ||
    parsed?.data?.url ||
    '';
  const sessionId = parsed?.data?.session_id || parsed?.session_id || requestId;
  const providerPayloadPath = await writeProviderPayload(userDataPath, input.providerId, sessionId, {
    createdAt,
    providerId: input.providerId,
    providerName: 'HeyGen Video Agent',
    model: 'video-agent-v3',
    requestId: sessionId,
    prompt,
    orientation,
    result: parsed || stdout,
    finishingPlan: buildFinishPlan(input, sessionId, variants),
  });
  return {
    ok: true,
    providerId: input.providerId,
    providerName: 'HeyGen Video Agent',
    model: 'video-agent-v3',
    status: 'complete',
    requestId: sessionId,
    outputUrl: videoUrl,
    providerPayloadPath,
    logs: ['HeyGen CLI completed the video-agent request.'],
    createdAt,
  };
}

async function renderWithOpenAiImage(input, options = {}) {
  const apiKey = resolveSecret(PROVIDER_SECRETS.openAiApiKey);
  if (!apiKey) {
    return blockedProviderResult(input, options, 'OPENAI_API_KEY is missing. Use ChatGPT Pro manually or store an API key in the CopyTok Keychain for in-app image generation.');
  }
  const createdAt = new Date().toISOString();
  const userDataPath = resolveRuntimeDir(options);
  const requestId = `openai-image-${Date.now().toString(36)}`;
  const variants = buildGenerationVariants(input);
  const outputDir = providerOutputDir(input, userDataPath, input.providerId, requestId);
  await fsPromises.mkdir(outputDir, { recursive: true });
  const imageResults = [];
  const requests = [];
  for (const variant of variants) {
    const prompt =
      variant.avatarPrompt ||
      `${input.campaign?.name || 'CopyTok'} UGC first-frame creator portrait, photorealistic, vertical phone-native, premium lighting.`;
    const request = {
      model: 'gpt-image-2',
      prompt,
      size: openAiImageSize(input.preset?.aspectRatio ?? '9:16', input.preset?.resolution ?? '720p'),
      quality: 'high',
      output_format: 'png',
      n: 1,
    };
    requests.push({ slot: variant.slot, avatarName: variant.avatarName, request });
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      const detail = truncate(await response.text().catch(() => ''), 900);
      return blockedProviderResult(input, options, `OpenAI image generation failed with HTTP ${response.status}. ${detail}`.trim(), {
        request,
      });
    }
    const payload = await response.json();
    const image = payload?.data?.[0];
    const outputPath = path.join(outputDir, `variant-${variant.slot}-${safeSlug(variant.avatarName)}.png`);
    if (image?.b64_json) {
      await fsPromises.writeFile(outputPath, Buffer.from(image.b64_json, 'base64'));
    } else if (image?.url) {
      const downloaded = await fetch(image.url);
      if (!downloaded.ok) throw new Error(`OpenAI image download failed with ${downloaded.status}.`);
      await fsPromises.writeFile(outputPath, Buffer.from(await downloaded.arrayBuffer()));
    } else {
      throw new Error('OpenAI image generation returned no image data.');
    }
    imageResults.push({
      slot: variant.slot,
      avatarName: variant.avatarName,
      requestId: payload.id || `${requestId}-${variant.slot}`,
      outputPath,
      status: 'complete',
    });
  }
  const providerPayloadPath = await writeProviderPayload(userDataPath, input.providerId, requestId, {
    createdAt,
    providerId: input.providerId,
    providerName: 'OpenAI GPT Image 2',
    model: 'gpt-image-2',
    requestId,
    requests,
    variants: imageResults,
    outputDir,
  });
  const first = imageResults[0];
  return {
    ok: true,
    providerId: input.providerId,
    providerName: 'OpenAI GPT Image 2',
    model: 'gpt-image-2',
    status: 'complete',
    requestId,
    outputPath: first?.outputPath,
    providerPayloadPath,
    variants: imageResults,
    logs: ['Generated high-quality GPT Image 2 stills for avatar/keyframe use.'],
    createdAt,
  };
}

function generatedVideoBytes(result) {
  const file = result?.video || result?.videos?.[0];
  if (!file?.uint8Array) {
    throw new Error('Provider completed but returned no downloadable video bytes.');
  }
  return Buffer.from(file.uint8Array);
}

function aiSdkTaskId(result, providerKey, fallback) {
  const metadata = result?.providerMetadata?.[providerKey] || {};
  return metadata.taskId || metadata.id || fallback;
}

async function renderWithDirectSeedance(input, options = {}) {
  const apiKey = resolveSeedanceApiKey();
  if (!apiKey) {
    return blockedProviderResult(input, options, 'ARK_API_KEY, SEEDANCE_API_KEY, or BYTEPLUS_API_KEY is missing. Create a BytePlus ModelArk Seedance API key, then store it in the CopyTok Keychain.');
  }
  const createdAt = new Date().toISOString();
  const userDataPath = resolveRuntimeDir(options);
  const appRoot = options.appRoot || '';
  const referencePath = assertExistingFile(input.referenceFacePath, 'Avatar image');
  const variants = requireRenderableVariants(input, referencePath);
  const preparedSource =
    input.preparedSource?.ok
      ? input.preparedSource
      : input.sourceVideoPath
        ? await prepareSourceFile(input.sourceVideoPath, { userDataPath, appRoot })
        : null;
  const sourceVideoPath = preparedSource?.files?.normalizedVideo
    ? assertExistingFile(preparedSource.files.normalizedVideo, 'Prepared source video')
    : input.sourceVideoPath
      ? assertExistingFile(input.sourceVideoPath, 'Source video')
      : '';
  const sourceVideoDataUri = sourceVideoPath ? await fileToDataUri(sourceVideoPath, 'Prepared source video') : '';
  const audioDataUri =
    preparedSource?.files?.audio && fs.existsSync(preparedSource.files.audio)
      ? await fileToDataUri(preparedSource.files.audio, 'Prepared source audio', 24 * 1024 * 1024)
      : '';
  const { experimental_generateVideo: generateVideo } = await import('ai');
  const { createByteDance } = await import('@ai-sdk/bytedance');
  const model = resolveSecret(PROVIDER_SECRETS.seedanceModel) || DEFAULT_SEEDANCE_MODEL;
  const baseURL = resolveSecret(PROVIDER_SECRETS.seedanceBaseUrl) || DEFAULT_BYTEPLUS_BASE_URL;
  const byteDance = createByteDance({ apiKey, baseURL });
  const batchRequestId = `seedance-${Date.now().toString(36)}`;
  const outputDir = providerOutputDir(input, userDataPath, input.providerId, batchRequestId);
  await fsPromises.mkdir(outputDir, { recursive: true });
  const requests = [];
  const variantResults = [];

  try {
    for (const variant of variants) {
      const imageBytes = await readFileData(variant.localImagePath, `Video ${variant.slot} avatar image`);
      const text = seedancePrompt({ ...input, preparedSource, activeVariant: variant });
      const providerOptions = {
        bytedance: {
          watermark: false,
          generateAudio: Boolean(audioDataUri),
          referenceVideos: sourceVideoDataUri ? [sourceVideoDataUri] : [],
          referenceAudio: audioDataUri ? [audioDataUri] : [],
          pollIntervalMs: 5000,
          pollTimeoutMs: 1000 * 60 * 18,
        },
      };
      const requestSummary = {
        slot: variant.slot,
        avatarName: variant.avatarName,
        model,
        baseURL,
        duration: providerDuration(input, preparedSource),
        resolution: videoResolution(input.preset?.aspectRatio ?? '9:16', input.preset?.resolution ?? '720p'),
        aspectRatio: input.preset?.aspectRatio ?? '9:16',
        hasReferenceVideo: Boolean(sourceVideoDataUri),
        hasReferenceAudio: Boolean(audioDataUri),
        prompt: text,
      };
      requests.push(requestSummary);
      const result = await generateVideo({
        model: byteDance.video(model),
        prompt: { image: imageBytes, text },
        duration: requestSummary.duration,
        resolution: requestSummary.resolution,
        aspectRatio: requestSummary.aspectRatio,
        generateAudio: Boolean(audioDataUri),
        providerOptions,
        maxRetries: 1,
      });
      const providerTaskId = aiSdkTaskId(result, 'bytedance', `${batchRequestId}-${variant.slot}`);
      const outputPath = path.join(outputDir, `variant-${variant.slot}-${safeSlug(variant.avatarName)}.mp4`);
      await fsPromises.writeFile(outputPath, generatedVideoBytes(result));
      variantResults.push({
        slot: variant.slot,
        avatarName: variant.avatarName,
        requestId: providerTaskId,
        outputPath,
        status: 'complete',
      });
    }
  } catch (error) {
    return blockedProviderResult(input, options, `Direct Seedance render failed: ${truncate(error?.message || String(error), 900)}`, {
      model,
      baseURL,
      requests,
    });
  }

  const providerPayloadPath = await writeProviderPayload(userDataPath, input.providerId, batchRequestId, {
    createdAt,
    providerId: input.providerId,
    providerName: 'Direct Seedance 2.0',
    model,
    baseURL,
    requestId: batchRequestId,
    requests,
    variants: variantResults,
    outputDir,
    preparedSourceRunId: preparedSource?.runId,
    campaign: campaignContext(input),
    finishingPlan: buildFinishPlan(input, batchRequestId, variants),
  });
  const firstVariant = variantResults[0];
  return {
    ok: true,
    providerId: input.providerId,
    providerName: 'Direct Seedance 2.0',
    model,
    status: 'complete',
    requestId: batchRequestId,
    outputPath: firstVariant?.outputPath,
    providerPayloadPath,
    variants: variantResults,
    logs: ['Direct BytePlus ModelArk Seedance render completed.'],
    createdAt,
  };
}

async function renderWithDirectKling(input, options = {}) {
  const { accessKey, secretKey, source } = resolveKlingCredentials();
  if (!accessKey || !secretKey) {
    if (source === 'single-key') {
      return blockedProviderResult(
        input,
        options,
        'A KLING_API_KEY is present, but the official direct Kling route needs an access-key plus secret-key pair. Store KLING_ACCESS_KEY and KLING_SECRET_KEY, or store KLING_API_KEY as ACCESS_KEY:SECRET_KEY.',
      );
    }
    return blockedProviderResult(
      input,
      options,
      'KLING_ACCESS_KEY and KLING_SECRET_KEY are missing. Create direct Kling API credentials, then store both in the CopyTok Keychain.',
    );
  }
  const createdAt = new Date().toISOString();
  const userDataPath = resolveRuntimeDir(options);
  const appRoot = options.appRoot || '';
  const referencePath = assertExistingFile(input.referenceFacePath, 'Avatar image');
  const variants = requireRenderableVariants(input, referencePath);
  const preparedSource =
    input.preparedSource?.ok
      ? input.preparedSource
      : input.sourceVideoPath
        ? await prepareSourceFile(input.sourceVideoPath, { userDataPath, appRoot })
        : null;
  const sourceVideoPath = preparedSource?.files?.normalizedVideo
    ? assertExistingFile(preparedSource.files.normalizedVideo, 'Prepared source video')
    : input.sourceVideoPath
      ? assertExistingFile(input.sourceVideoPath, 'Source video')
      : '';
  const sourceVideoDataUri = sourceVideoPath ? await fileToDataUri(sourceVideoPath, 'Prepared source video') : '';
  const { experimental_generateVideo: generateVideo } = await import('ai');
  const { createKlingAI } = await import('@ai-sdk/klingai');
  const model = resolveSecret(PROVIDER_SECRETS.klingModel) || (sourceVideoDataUri ? DEFAULT_KLING_MODEL : 'kling-v3.0-i2v');
  const baseURL = resolveSecret(PROVIDER_SECRETS.klingBaseUrl) || undefined;
  const klingai = createKlingAI({ accessKey, secretKey, ...(baseURL ? { baseURL } : {}) });
  const batchRequestId = `kling-${Date.now().toString(36)}`;
  const outputDir = providerOutputDir(input, userDataPath, input.providerId, batchRequestId);
  await fsPromises.mkdir(outputDir, { recursive: true });
  const requests = [];
  const variantResults = [];

  try {
    for (const variant of variants) {
      const imageBytes = await readFileData(variant.localImagePath, `Video ${variant.slot} avatar image`);
      const text = providerPrompt({ ...input, preparedSource }, variant);
      const isMotionControl = model.includes('motion-control');
      const providerOptions = {
        klingai: isMotionControl
          ? {
              mode: 'pro',
              videoUrl: sourceVideoDataUri,
              characterOrientation: 'image',
              keepOriginalSound: 'yes',
              watermarkEnabled: false,
              pollIntervalMs: 5000,
              pollTimeoutMs: 1000 * 60 * 18,
            }
          : {
              mode: input.preset?.resolution === '1080p' ? 'pro' : 'std',
              negativePrompt: negativeVideoPrompt(input),
              sound: 'off',
              watermarkEnabled: false,
              pollIntervalMs: 5000,
              pollTimeoutMs: 1000 * 60 * 18,
            },
      };
      if (isMotionControl && !sourceVideoDataUri) {
        throw new Error('Kling motion-control route needs a source action video. Add a source video or set KLING_MODEL to an image-to-video model.');
      }
      const requestSummary = {
        slot: variant.slot,
        avatarName: variant.avatarName,
        model,
        baseURL: baseURL || 'default',
        duration: isMotionControl ? 'source-video' : providerDuration(input, preparedSource),
        resolution: videoResolution(input.preset?.aspectRatio ?? '9:16', input.preset?.resolution ?? '720p'),
        aspectRatio: input.preset?.aspectRatio ?? '9:16',
        hasReferenceVideo: Boolean(sourceVideoDataUri),
        prompt: text,
      };
      requests.push(requestSummary);
      const result = await generateVideo({
        model: klingai.video(model),
        prompt: { image: imageBytes, text },
        duration: isMotionControl ? undefined : requestSummary.duration,
        resolution: requestSummary.resolution,
        aspectRatio: requestSummary.aspectRatio,
        providerOptions,
        maxRetries: 1,
      });
      const providerTaskId = aiSdkTaskId(result, 'klingai', `${batchRequestId}-${variant.slot}`);
      const outputPath = path.join(outputDir, `variant-${variant.slot}-${safeSlug(variant.avatarName)}.mp4`);
      await fsPromises.writeFile(outputPath, generatedVideoBytes(result));
      variantResults.push({
        slot: variant.slot,
        avatarName: variant.avatarName,
        requestId: providerTaskId,
        outputPath,
        status: 'complete',
      });
    }
  } catch (error) {
    return blockedProviderResult(input, options, `Direct Kling render failed: ${truncate(error?.message || String(error), 900)}`, {
      model,
      baseURL: baseURL || 'default',
      requests,
    });
  }

  const providerPayloadPath = await writeProviderPayload(userDataPath, input.providerId, batchRequestId, {
    createdAt,
    providerId: input.providerId,
    providerName: 'Direct Kling 3.0',
    model,
    baseURL: baseURL || 'default',
    requestId: batchRequestId,
    requests,
    variants: variantResults,
    outputDir,
    preparedSourceRunId: preparedSource?.runId,
    campaign: campaignContext(input),
    finishingPlan: buildFinishPlan(input, batchRequestId, variants),
  });
  const firstVariant = variantResults[0];
  return {
    ok: true,
    providerId: input.providerId,
    providerName: 'Direct Kling 3.0',
    model,
    status: 'complete',
    requestId: batchRequestId,
    outputPath: firstVariant?.outputPath,
    providerPayloadPath,
    variants: variantResults,
    logs: ['Direct Kling render completed.'],
    createdAt,
  };
}

async function renderWithProvider(input, options = {}) {
  if (!input.compliance?.faceConsent || !input.compliance?.sourceRights || !input.compliance?.aiDisclosure) {
    throw new Error('Complete the rights and AI disclosure checks before rendering.');
  }

  if (FAL_PROVIDERS[input.providerId]) return renderWithFalProvider(input, options);
  if (input.providerId === 'heygen-cloud') return renderWithHeygenCli(input, options);
  if (input.providerId === 'openai-image-2') return renderWithOpenAiImage(input, options);
  if (input.providerId === 'direct-seedance-2') return renderWithDirectSeedance(input, options);
  if (input.providerId === 'direct-kling-3') return renderWithDirectKling(input, options);
  if (input.providerId === 'mock-local') {
    return blockedProviderResult(input, options, 'Mock local provider writes packets only and does not call a video model.');
  }
  return blockedProviderResult(input, options, 'Selected provider does not have a live CopyTok adapter yet.');
}

async function createRenderPacket(input, options = {}) {
  const userDataPath = resolveRuntimeDir(options);
  const packetId = `packet-${Date.now().toString(36)}`;
  const packetDir = path.join(userDataPath, 'render-packets');
  await fsPromises.mkdir(packetDir, { recursive: true });
  const providerPackets = buildProviderPackets(input, packetId);
  const finishDir = providerPackets.finishingPlan?.outputDir;
  if (finishDir) {
    await fsPromises.mkdir(finishDir, { recursive: true });
  }
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
    providerPackets,
    nextRequiredSecret: nextRequiredSecretForProvider(input.providerId),
  };
  const packetPath = path.join(packetDir, `${packetId}.json`);
  await fsPromises.writeFile(packetPath, JSON.stringify(packet, null, 2));
  return { ...packet, packetPath };
}

module.exports = {
  analyzeSourceUrl,
  createTrendAdaptation,
  createRenderPacket,
  getEngineCapabilities,
  getTrendScoutStatus,
  prepareSourceFile,
  prepareSourceUrl,
  renderWithProvider,
  runTrendScout,
  truncate,
};
