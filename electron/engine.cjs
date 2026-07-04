const { execFile, spawnSync } = require('child_process');
const fs = require('fs');
const fsPromises = require('fs/promises');
const os = require('os');
const path = require('path');

const DEFAULT_TIMEOUT_MS = 90000;
const MAX_BUFFER = 1024 * 1024 * 12;
const MAX_SOURCE_SECONDS = 15;
const FAL_KEYCHAIN_SERVICE = 'CopyTok';
const FAL_KEYCHAIN_ACCOUNT = 'FAL_KEY';
const APIFY_KEYCHAIN_SERVICE = 'CopyTok';
const APIFY_KEYCHAIN_ACCOUNT = 'APIFY_TOKEN';
const ADVENTURE_PROJECT_ROOT = '/Volumes/Adventure/Andromeda Labs/SaaS/UGC Swap Studio';
const SCOUT_DB_VERSION = 1;

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

function resolveFalKey() {
  return process.env.FAL_KEY || readKeychainSecret(FAL_KEYCHAIN_SERVICE, FAL_KEYCHAIN_ACCOUNT);
}

function resolveApifyToken() {
  return process.env.APIFY_TOKEN || readKeychainSecret(APIFY_KEYCHAIN_SERVICE, APIFY_KEYCHAIN_ACCOUNT);
}

function falSecretStatus() {
  return resolveFalKey() ? 'adapter-ready' : 'missing-secret';
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
    nextAdapters: ['fal-seedance-reference', 'fal-pixverse-swap', 'pixverse-direct-swap', 'local-faceswap-lab'],
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
    nextAdapters: ['fal-seedance-reference', 'fal-pixverse-swap'],
    notes: [
      `Local source clipped to the first ${MAX_SOURCE_SECONDS} seconds for predictable cost and provider limits.`,
      'Normalized MP4 is ready for upload to fal storage.',
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
  const aspectRatio = input.preset?.aspectRatio ?? '9:16';
  const pixverseResolution = falResolution('fal-pixverse-swap', resolution);
  return {
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
  const transcript = input.preparedSource?.transcript?.text
    ? ` Reference transcript: ${truncate(input.preparedSource.transcript.text, 1600)}`
    : '';
  const audioInstruction = input.preparedSource?.files?.audio
    ? ' Use @Audio1 as the audio, voice, cadence, and timing reference when possible.'
    : '';
  return [
    'Create a vertical social UGC clip using @Image1 as the avatar identity and @Video1 as the action, camera, gesture, timing, framing, and edit reference.',
    'Keep the output realistic, clean, brand-safe, and suitable for internal marketing review.',
    'Preserve the source clip pacing and body performance as closely as the model allows.',
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

async function renderWithProvider(input, options = {}) {
  const provider = FAL_PROVIDERS[input.providerId];
  const createdAt = new Date().toISOString();
  if (!provider) {
    throw new Error('Select Seedance or PixVerse before rendering.');
  }
  if (!input.compliance?.faceConsent || !input.compliance?.sourceRights || !input.compliance?.aiDisclosure) {
    throw new Error('Complete the rights and AI disclosure checks before rendering.');
  }

  const userDataPath = resolveRuntimeDir(options);
  const appRoot = options.appRoot || '';
  const referencePath = assertExistingFile(input.referenceFacePath, 'Avatar image');
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
  const imageUrl = await uploadFileToFal(fal, referencePath);
  const videoUrl = await uploadFileToFal(fal, sourceVideoPath);
  const audioUrl =
    input.providerId === 'fal-seedance-reference' && preparedSource?.files?.audio && fs.existsSync(preparedSource.files.audio)
      ? await uploadFileToFal(fal, preparedSource.files.audio)
      : '';
  const request = buildFalRequest(input.providerId, { ...input, preparedSource }, { imageUrl, videoUrl, audioUrl });
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
  const outputDir = path.join(userDataPath, 'provider-outputs');
  const outputPath = await downloadProviderOutput(outputUrl, outputDir, input.providerId, result.requestId);
  const payloadDir = path.join(userDataPath, 'provider-payloads');
  await fsPromises.mkdir(payloadDir, { recursive: true });
  const providerPayloadPath = path.join(payloadDir, `${input.providerId}-${result.requestId || Date.now().toString(36)}.json`);
  await fsPromises.writeFile(
    providerPayloadPath,
    JSON.stringify(
      {
        createdAt,
        providerId: input.providerId,
        providerName: provider.label,
        model: provider.model,
        requestId: result.requestId,
        request,
        outputUrl,
        outputPath,
        preparedSourceRunId: preparedSource?.runId,
      },
      null,
      2,
    ),
  );

  return {
    ok: true,
    providerId: input.providerId,
    providerName: provider.label,
    model: provider.model,
    status: 'complete',
    requestId: result.requestId,
    outputUrl,
    outputPath,
    providerPayloadPath,
    logs: logs.slice(-20),
    createdAt,
  };
}

async function createRenderPacket(input, options = {}) {
  const userDataPath = resolveRuntimeDir(options);
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
      ['fal-seedance-reference', 'fal-pixverse-swap'].includes(input.providerId) && !resolveFalKey()
        ? 'FAL_KEY in the CopyTok macOS Keychain entry or secure environment'
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
