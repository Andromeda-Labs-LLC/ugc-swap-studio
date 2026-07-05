export type TrendScoutProviderId = 'local-demo' | 'apify-tiktok'
export type TrendScoutSort = 'score' | 'views' | 'engagement' | 'newest' | 'fidelity'
export type TrendAppProfileId = 'snapglp' | 'toneclone'

export interface TrendAppProfile {
  id: TrendAppProfileId
  name: string
  shortName: string
  category: string
  accent: string
  description: string
  defaultQuery: string
  seedQueries: string[]
  hashtags: string[]
  competitorHandles: string[]
  productTruths: string[]
  claimBoundaries: string[]
}

export interface TrendScoutProviderStatus {
  id: TrendScoutProviderId
  label: string
  status: 'ready' | 'missing-secret' | 'offline'
  role: string
  secretName?: string
}

export interface TrendScoutStatus {
  checkedAt: string
  runtimeDir: string
  databasePath: string
  providers: TrendScoutProviderStatus[]
  cache: {
    runCount: number
    postCount: number
    briefCount: number
  }
}

export interface TrendScoutRequest {
  appProfileId: TrendAppProfileId
  providerId: TrendScoutProviderId
  query: string
  sort: TrendScoutSort
  limit: number
  minViews: number
}

export interface TrendPostStats {
  views: number
  likes: number
  comments: number
  shares: number
  saves: number
}

export interface TrendFormatFingerprint {
  hookType: string
  firstThreeSeconds: string
  visualBeat: string
  textOverlay: string
  creatorAction: string
  editPattern: string
  audioCue: string
  productInsertion: string
  cta: string
}

export interface TrendScore {
  composite: number
  outlier: number
  engagementRate: number
  fidelity: number
  momentum: number
  confidence: 'real metrics' | 'demo seed' | 'estimated'
}

export interface TrendPost {
  id: string
  providerId: TrendScoutProviderId
  sourceKind: 'real-scrape' | 'demo-seed'
  sourceLabel: string
  appProfileId: TrendAppProfileId
  platform: 'TikTok'
  url: string
  thumbnail: string
  author: string
  text: string
  postedAt: string
  durationSeconds: number | null
  music: string
  hashtags: string[]
  stats: TrendPostStats
  score: TrendScore
  format: TrendFormatFingerprint
  adaptationAngles: string[]
  fetchedAt: string
}

export interface TrendScoutResult {
  ok: boolean
  runId: string
  providerId: TrendScoutProviderId
  appProfileId: TrendAppProfileId
  query: string
  fetchedAt: string
  posts: TrendPost[]
  warnings: string[]
  message: string
  databasePath?: string
}

export interface TrendAdaptationBrief {
  id: string
  createdAt: string
  appProfileId: TrendAppProfileId
  appName: string
  postId: string
  sourceUrl: string
  sourceLabel: string
  title: string
  savedPath?: string
  mimicPlan: {
    fidelityRule: string
    openingShot: string
    onscreenText: string[]
    spokenHook: string[]
    beatSheet: string[]
    productInsertion: string
    avatarDirection: string
    sourcePrep: string
  }
}

export const trendAppProfiles: TrendAppProfile[] = [
  {
    id: 'snapglp',
    name: 'SnapGLP',
    shortName: 'GLP',
    category: 'GLP-1 food logging',
    accent: '#5C7282',
    description: 'Food, protein, dose-day trust, grocery scanning, restaurant choices, and weight-loss app UGC.',
    defaultQuery: 'GLP-1 meal tracking app protein food scanner weight loss TikTok',
    seedQueries: [
      'GLP-1 food tracking app',
      'protein grocery scanner weight loss app',
      'Ozempic meal prep app',
      'calorie deficit app viral hook',
      'weight loss app UGC',
    ],
    hashtags: ['glp1', 'ozempic', 'wegovy', 'weightlossapp', 'protein', 'mealprep'],
    competitorHandles: [],
    productTruths: [
      'SnapGLP helps users log meals and make GLP-1-aware food choices.',
      'SnapGLP is a coaching and tracking tool, not a medical provider.',
      'Premium claims should stay focused on convenience, awareness, and food guidance.',
    ],
    claimBoundaries: [
      'Do not claim diagnosis, treatment, guaranteed weight loss, or medication advice.',
      'Avoid before-and-after claims unless Commander supplies approved evidence.',
    ],
  },
  {
    id: 'toneclone',
    name: 'ToneClone',
    shortName: 'Tone',
    category: 'Guitar tone matching',
    accent: '#D7AE56',
    description: 'Guitarists, amp tone, pedals, bedroom recording, plugin comparison, and riff reaction UGC.',
    defaultQuery: 'guitar tone app amp simulator pedalboard home recording TikTok',
    seedQueries: [
      'guitar tone app',
      'amp simulator app',
      'pedalboard tone matching',
      'bedroom guitarist recording app',
      'guitar plugin comparison TikTok',
    ],
    hashtags: ['guitartok', 'guitar', 'guitartone', 'pedalboard', 'ampsim', 'homerecording'],
    competitorHandles: [],
    productTruths: [
      'ToneClone helps guitarists match and explore guitar tones.',
      'ToneClone content should sound musician-native and avoid fake endorsement language.',
      'Premium claims should focus on speed, tone discovery, and creative workflow.',
    ],
    claimBoundaries: [
      'Do not imply affiliation with artists, brands, amp makers, or creators.',
      'Avoid using protected songs or artist likeness without rights.',
    ],
  },
]

export const trendScoutProviderOptions: TrendScoutProviderStatus[] = [
  {
    id: 'local-demo',
    label: 'Local demo',
    status: 'ready',
    role: 'Offline seed data for UI testing. Not real trend evidence.',
  },
  {
    id: 'apify-tiktok',
    label: 'Apify TikTok',
    status: 'missing-secret',
    role: 'Real TikTok scrape adapter for searches, hashtags, and account posts.',
    secretName: 'APIFY_TOKEN',
  },
]

export const trendSortOptions: Array<{ id: TrendScoutSort; label: string }> = [
  { id: 'score', label: 'Best score' },
  { id: 'views', label: 'Most views' },
  { id: 'engagement', label: 'Engagement' },
  { id: 'newest', label: 'Newest' },
  { id: 'fidelity', label: 'Format fit' },
]

export function getTrendAppProfile(id: TrendAppProfileId) {
  return trendAppProfiles.find((profile) => profile.id === id) ?? trendAppProfiles[0]
}

export function sortTrendPosts(posts: TrendPost[], sort: TrendScoutSort) {
  const sorted = [...posts]
  return sorted.sort((a, b) => {
    if (sort === 'views') return b.stats.views - a.stats.views
    if (sort === 'engagement') return b.score.engagementRate - a.score.engagementRate
    if (sort === 'newest') return new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime()
    if (sort === 'fidelity') return b.score.fidelity - a.score.fidelity
    return b.score.composite - a.score.composite
  })
}

export function formatMetric(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '0'
  if (value >= 1_000_000_000) return `${trimMetric(value / 1_000_000_000)}B`
  if (value >= 1_000_000) return `${trimMetric(value / 1_000_000)}M`
  if (value >= 1_000) return `${trimMetric(value / 1_000)}K`
  return String(Math.round(value))
}

function trimMetric(value: number) {
  return value >= 10 ? value.toFixed(0) : value.toFixed(1).replace(/\.0$/, '')
}

export function engagementPercent(post: TrendPost) {
  return `${Math.max(0, post.score.engagementRate * 100).toFixed(1)}%`
}

export function profileQueryValue(profileId: TrendAppProfileId) {
  return getTrendAppProfile(profileId).defaultQuery
}
