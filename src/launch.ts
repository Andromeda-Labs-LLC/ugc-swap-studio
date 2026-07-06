import type { CampaignAppId } from './campaigns'
import type { RenderJob } from './domain'

export type SocialPlatformId = 'tiktok' | 'instagram' | 'facebook' | 'youtube'
export type LaunchStatus = 'ready' | 'scheduled' | 'published' | 'needs-review'
export type LaunchFieldType = 'text' | 'textarea' | 'select' | 'toggle'
export type LaunchMediaType = 'video' | 'photo' | 'carousel'

export interface LaunchFieldOption {
  id: string
  label: string
}

export interface LaunchField {
  id: string
  label: string
  type: LaunchFieldType
  required?: boolean
  maxLength?: number
  placeholder?: string
  options?: LaunchFieldOption[]
}

export interface SocialPlatform {
  id: SocialPlatformId
  name: string
  shortName: string
  color: string
  supportsMedia: LaunchMediaType[]
  defaultMediaType: LaunchMediaType
  fields: LaunchField[]
  constraints: string[]
}

export interface LaunchAsset {
  id: string
  appId: CampaignAppId
  title: string
  format: string
  campaign: string
  durationSeconds: number
  aspectRatio: '9:16' | '1:1' | '16:9'
  source: 'generated' | 'seed' | 'imported'
  status: LaunchStatus
  createdAt: string
  previewUrl?: string | null
  outputPath?: string
  jobId?: string
}

export interface ScheduledPost {
  id: string
  assetId: string
  assetTitle: string
  assetFormat: string
  appId: CampaignAppId
  platformId: SocialPlatformId
  mediaType: LaunchMediaType
  scheduledAt: string
  status: 'draft' | 'scheduled' | 'posted' | 'blocked'
  fields: Record<string, string | boolean>
  createdAt: string
}

export type PlatformDrafts = Record<SocialPlatformId, Record<string, string | boolean>>

export const socialPlatforms: SocialPlatform[] = [
  {
    id: 'tiktok',
    name: 'TikTok',
    shortName: 'TikTok',
    color: '#D7AE56',
    supportsMedia: ['video', 'photo', 'carousel'],
    defaultMediaType: 'video',
    fields: [
      {
        id: 'caption',
        label: 'Caption',
        type: 'textarea',
        required: true,
        maxLength: 2200,
        placeholder: 'Hook line, benefit, CTA, hashtags.',
      },
      {
        id: 'privacy',
        label: 'Privacy',
        type: 'select',
        options: [
          { id: 'public', label: 'Public' },
          { id: 'friends', label: 'Friends' },
          { id: 'private', label: 'Private' },
        ],
      },
      { id: 'coverText', label: 'Cover text', type: 'text', maxLength: 80, placeholder: 'Short cover label' },
      { id: 'allowComments', label: 'Allow comments', type: 'toggle' },
      { id: 'aiDisclosure', label: 'AI disclosure', type: 'toggle' },
    ],
    constraints: ['Caption limit 2,200 characters.', 'Use vertical 9:16 video by default.', 'Disclosure may be required for AI-generated media.'],
  },
  {
    id: 'instagram',
    name: 'Instagram Reels',
    shortName: 'Instagram',
    color: '#979A75',
    supportsMedia: ['video', 'photo', 'carousel'],
    defaultMediaType: 'video',
    fields: [
      {
        id: 'caption',
        label: 'Caption',
        type: 'textarea',
        required: true,
        maxLength: 2200,
        placeholder: 'Caption, hook, CTA, hashtags.',
      },
      { id: 'hashtags', label: 'Hashtags', type: 'text', maxLength: 300, placeholder: '#app #ugc #reels' },
      {
        id: 'placement',
        label: 'Placement',
        type: 'select',
        options: [
          { id: 'reel', label: 'Reel' },
          { id: 'feed', label: 'Feed' },
          { id: 'story', label: 'Story' },
        ],
      },
      { id: 'shareToFacebook', label: 'Share to Facebook', type: 'toggle' },
      { id: 'aiDisclosure', label: 'AI disclosure', type: 'toggle' },
    ],
    constraints: ['Caption limit 2,200 characters.', 'Keep hashtag sets tight and reusable.', 'Stories use a different creative frame than Reels/feed.'],
  },
  {
    id: 'facebook',
    name: 'Facebook',
    shortName: 'Facebook',
    color: '#A6B4B9',
    supportsMedia: ['video', 'photo', 'carousel'],
    defaultMediaType: 'video',
    fields: [
      {
        id: 'message',
        label: 'Post copy',
        type: 'textarea',
        required: true,
        maxLength: 63206,
        placeholder: 'Shorter is better, but Facebook allows longer copy.',
      },
      {
        id: 'placement',
        label: 'Placement',
        type: 'select',
        options: [
          { id: 'reel', label: 'Reel' },
          { id: 'page-post', label: 'Page post' },
          { id: 'story', label: 'Story' },
        ],
      },
      { id: 'headline', label: 'Headline', type: 'text', maxLength: 100, placeholder: 'Optional headline' },
      { id: 'allowComments', label: 'Allow comments', type: 'toggle' },
    ],
    constraints: ['Supports longer copy, but CopyTok should still keep posts short.', 'Use Reels for short-form video first.'],
  },
  {
    id: 'youtube',
    name: 'YouTube Shorts',
    shortName: 'YouTube',
    color: '#D1CEC5',
    supportsMedia: ['video'],
    defaultMediaType: 'video',
    fields: [
      { id: 'title', label: 'Title', type: 'text', required: true, maxLength: 100, placeholder: 'Shorts title' },
      {
        id: 'description',
        label: 'Description',
        type: 'textarea',
        maxLength: 5000,
        placeholder: 'Description, CTA, links, hashtags.',
      },
      {
        id: 'visibility',
        label: 'Visibility',
        type: 'select',
        options: [
          { id: 'public', label: 'Public' },
          { id: 'unlisted', label: 'Unlisted' },
          { id: 'private', label: 'Private' },
        ],
      },
      { id: 'madeForKids', label: 'Made for kids', type: 'toggle' },
    ],
    constraints: ['Title limit 100 characters.', 'Use vertical video for Shorts.', 'Made-for-kids status must be set deliberately.'],
  },
]

export const starterLaunchAssets: LaunchAsset[] = [
  {
    id: 'asset-snapglp-hook',
    appId: 'snapglp',
    title: 'SnapGLP hook variant',
    format: 'Reaction Hook',
    campaign: 'Launch baseline',
    durationSeconds: 14,
    aspectRatio: '9:16',
    source: 'seed',
    status: 'ready',
    createdAt: '2026-07-05T17:40:00.000Z',
  },
  {
    id: 'asset-toneclone-demo',
    appId: 'toneclone',
    title: 'ToneClone A/B demo',
    format: 'Faceless App Demo',
    campaign: 'Guitar tone proof',
    durationSeconds: 18,
    aspectRatio: '9:16',
    source: 'seed',
    status: 'ready',
    createdAt: '2026-07-05T17:45:00.000Z',
  },
]

export const starterScheduledPosts: ScheduledPost[] = [
  {
    id: 'scheduled-seed-001',
    assetId: 'asset-snapglp-hook',
    assetTitle: 'SnapGLP hook variant',
    assetFormat: 'Reaction Hook',
    appId: 'snapglp',
    platformId: 'tiktok',
    mediaType: 'video',
    scheduledAt: nextLocalSlot(1, 9),
    status: 'scheduled',
    fields: {
      caption: 'POV: lunch feels different now and you still need one sane next move. #glp1 #mealtracking',
      privacy: 'public',
      coverText: 'One calmer next move',
      allowComments: true,
      aiDisclosure: true,
    },
    createdAt: new Date().toISOString(),
  },
]

export function getSocialPlatform(platformId: SocialPlatformId) {
  return socialPlatforms.find((platform) => platform.id === platformId) ?? socialPlatforms[0]
}

export function createDefaultDrafts(): PlatformDrafts {
  return socialPlatforms.reduce((drafts, platform) => {
    drafts[platform.id] = platform.fields.reduce<Record<string, string | boolean>>((fields, field) => {
      if (field.type === 'toggle') fields[field.id] = field.id === 'aiDisclosure' || field.id === 'allowComments'
      else if (field.type === 'select') fields[field.id] = field.options?.[0]?.id ?? ''
      else fields[field.id] = ''
      return fields
    }, {})
    return drafts
  }, {} as PlatformDrafts)
}

export function jobToLaunchAsset(job: RenderJob): LaunchAsset {
  return {
    id: `job-asset-${job.id}`,
    appId: job.title.toLowerCase().includes('tone') ? 'toneclone' : 'snapglp',
    title: job.title,
    format: job.sourceReference?.platform ? `${job.sourceReference.platform} clone` : 'Generated video',
    campaign: 'Generated queue',
    durationSeconds: job.sourceReference?.durationSeconds ?? 15,
    aspectRatio: job.preset.aspectRatio,
    source: 'generated',
    status: job.status === 'complete' ? 'ready' : 'needs-review',
    createdAt: job.createdAt,
    previewUrl: job.providerRender?.outputUrl ?? null,
    outputPath: job.providerRender?.outputPath,
    jobId: job.id,
  }
}

export function mergeLaunchAssets(assets: LaunchAsset[]) {
  const seen = new Set<string>()
  const seenTitles = new Set<string>()
  return [...starterLaunchAssets, ...assets].filter((asset) => {
    if (seen.has(asset.id)) return false
    const titleKey = `${asset.appId}:${asset.title.toLowerCase()}`
    if (seenTitles.has(titleKey)) return false
    seen.add(asset.id)
    seenTitles.add(titleKey)
    return true
  })
}

export function validatePlatformDraft(platform: SocialPlatform, draft: Record<string, string | boolean>) {
  const warnings: string[] = []
  const blockers: string[] = []

  for (const field of platform.fields) {
    const value = draft[field.id]
    const text = typeof value === 'string' ? value : ''
    if (field.required && !text.trim()) blockers.push(`${field.label} is required for ${platform.shortName}.`)
    if (field.maxLength && text.length > field.maxLength) {
      blockers.push(`${field.label} is ${text.length - field.maxLength} characters over ${platform.shortName}'s limit.`)
    }
  }

  if (platform.id === 'instagram') {
    const hashtags = String(draft.hashtags ?? '')
      .split(/\s+/)
      .filter((item) => item.startsWith('#'))
    if (hashtags.length > 30) blockers.push('Instagram allows up to 30 hashtags.')
  }

  if (platform.id === 'youtube' && draft.madeForKids === true) {
    warnings.push('Made-for-kids is enabled. Confirm this is intentional before publishing.')
  }

  return {
    ok: blockers.length === 0,
    blockers,
    warnings,
  }
}

export function formatScheduleTime(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso))
}

export function dayKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

export function buildWeek(start = new Date()) {
  const first = new Date(start)
  first.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(first)
    day.setDate(first.getDate() + index)
    return day
  })
}

export function nextLocalSlot(daysFromNow: number, hour: number) {
  const date = new Date()
  date.setDate(date.getDate() + daysFromNow)
  date.setHours(hour, 0, 0, 0)
  return date.toISOString()
}
