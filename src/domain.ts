import type { ComponentType } from 'react'
import {
  Bot,
  Boxes,
  BrainCircuit,
  Clapperboard,
  Flame,
  Film,
  ImagePlus,
  Laptop,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'

export type ProviderId =
  | 'direct-seedance-2'
  | 'direct-kling-3'
  | 'openai-image-2'
  | 'fal-seedance-reference'
  | 'fal-pixverse-swap'
  | 'mock-local'
  | 'facefusion-local'
  | 'heygen-cloud'
  | 'replicate-cloud'

export type JobStatus = 'queued' | 'ingesting' | 'rendering' | 'review' | 'complete' | 'blocked'

export interface ProviderOption {
  id: ProviderId
  name: string
  shortName: string
  mode: 'Local' | 'Cloud'
  icon: ComponentType<{ size?: number; strokeWidth?: number }>
  bestFor: string
  status: 'Live fal route' | 'Ready mock' | 'Adapter slot' | 'Recommended candidate'
}

export interface ProviderRenderResult {
  ok: boolean
  providerId: ProviderId
  providerName: string
  model?: string
  status: 'complete' | 'blocked'
  requestId?: string
  outputUrl?: string
  outputPath?: string
  providerPayloadPath?: string
  error?: string
  logs?: string[]
  variants?: Array<{
    slot: number
    avatarName: string
    requestId?: string
    outputUrl?: string
    outputPath?: string
    status: 'complete' | 'blocked'
    error?: string
  }>
  createdAt: string
}

export interface RenderPreset {
  resolution: '720p' | '1080p'
  aspectRatio: '9:16' | '1:1' | '16:9'
  generationCount: 1 | 2 | 3
  captionStyle: 'none' | 'tiktok-bold' | 'karaoke' | 'clean-minimal' | 'high-contrast' | 'creator-bubble' | 'lower-third' | 'big-hook'
  watermark: boolean
  provenance: boolean
  faceRestore: boolean
  urlImport: boolean
}

export interface ComplianceState {
  faceConsent: boolean
  sourceRights: boolean
  aiDisclosure: boolean
}

export interface SourceReferenceSummary {
  title: string
  platform: string
  url: string
  durationSeconds: number | null
  transcriptStatus: string
  transcriptLines: number
  voiceStatus: string
  preparedRunId?: string
}

export interface EnginePacketSummary {
  id: string
  status: string
  packetPath?: string
  nextRequiredSecret?: string
}

export interface RenderJob {
  id: string
  title: string
  providerId: ProviderId
  status: JobStatus
  progress: number
  createdAt: string
  updatedAt: string
  referenceFace: string
  sourceVideo: string
  sourceReference?: SourceReferenceSummary
  enginePacket?: EnginePacketSummary
  providerRender?: ProviderRenderResult
  preset: RenderPreset
  compliance: ComplianceState
  audit: string[]
}

export const providerOptions: ProviderOption[] = [
  {
    id: 'direct-seedance-2',
    name: 'Direct Seedance 2.0',
    shortName: 'Seedance',
    mode: 'Cloud',
    icon: Sparkles,
    bestFor: 'Cost-first direct Seedance route when BytePlus/ModelArk credentials are configured.',
    status: 'Recommended candidate',
  },
  {
    id: 'direct-kling-3',
    name: 'Direct Kling 3.0',
    shortName: 'Kling',
    mode: 'Cloud',
    icon: Flame,
    bestFor: 'Cheaper direct image-to-video route for first-frame avatar motion and short reaction hooks.',
    status: 'Recommended candidate',
  },
  {
    id: 'openai-image-2',
    name: 'OpenAI GPT Image 2',
    shortName: 'Image',
    mode: 'Cloud',
    icon: ImagePlus,
    bestFor: 'Highest-quality still images, first-frame keyframes, ad images, and carousel slides.',
    status: 'Recommended candidate',
  },
  {
    id: 'fal-seedance-reference',
    name: 'fal Seedance 2.0 Reference',
    shortName: 'Seedance',
    mode: 'Cloud',
    icon: Sparkles,
    bestFor: 'Highest-quality reference-to-video generation using avatar image, source video, and optional audio reference.',
    status: 'Live fal route',
  },
  {
    id: 'fal-pixverse-swap',
    name: 'fal PixVerse Swap',
    shortName: 'PixVerse',
    mode: 'Cloud',
    icon: Clapperboard,
    bestFor: 'Closest one-click face/body swap route for preserving original source movement and audio.',
    status: 'Live fal route',
  },
  {
    id: 'mock-local',
    name: 'Mock Local Renderer',
    shortName: 'Mock',
    mode: 'Local',
    icon: Laptop,
    bestFor: 'UI testing, queue behavior, job manifests, and offline demos before real model wiring.',
    status: 'Ready mock',
  },
  {
    id: 'facefusion-local',
    name: 'FaceFusion Local Worker',
    shortName: 'FaceFusion',
    mode: 'Local',
    icon: Boxes,
    bestFor: 'Private local rendering on the Mac Mini once model weights and licenses are explicitly accepted.',
    status: 'Adapter slot',
  },
  {
    id: 'heygen-cloud',
    name: 'HeyGen Avatar Video',
    shortName: 'HeyGen',
    mode: 'Cloud',
    icon: Bot,
    bestFor: 'Talking-avatar UGC, presenter clips, scripts, voice, and brand-safe avatar workflows.',
    status: 'Adapter slot',
  },
  {
    id: 'replicate-cloud',
    name: 'Replicate Video Models',
    shortName: 'Replicate',
    mode: 'Cloud',
    icon: BrainCircuit,
    bestFor: 'Flexible experiment routing across hosted open models while provider choice is still fluid.',
    status: 'Adapter slot',
  },
]

export const generationProviderOptions = providerOptions.filter((provider) =>
  [
    'direct-seedance-2',
    'direct-kling-3',
    'fal-pixverse-swap',
    'heygen-cloud',
    'openai-image-2',
  ].includes(provider.id),
)

export const starterJobs: RenderJob[] = [
  {
    id: 'job-demo-001',
    title: 'SnapGLP hook variant',
    providerId: 'mock-local',
    status: 'complete',
    progress: 100,
    createdAt: '2026-07-01T15:38:00.000Z',
    updatedAt: '2026-07-01T15:41:00.000Z',
    referenceFace: 'owned-avatar-selfie.jpg',
    sourceVideo: 'ugc-hook-template.mp4',
    preset: {
      resolution: '720p',
      aspectRatio: '9:16',
      generationCount: 1,
      captionStyle: 'tiktok-bold',
      watermark: false,
      provenance: true,
      faceRestore: true,
      urlImport: false,
    },
    compliance: {
      faceConsent: true,
      sourceRights: true,
      aiDisclosure: true,
    },
    audit: [
      'Reference face marked owned or consented.',
      'Source video marked owned/licensed.',
      'AI disclosure overlay enabled.',
      'Mock manifest exported for provider handoff.',
    ],
  },
]

export const workflowStats = [
  { label: 'Provider routes', value: '5', icon: BrainCircuit },
  { label: 'Guardrail checks', value: '3', icon: ShieldCheck },
  { label: 'Queue mode', value: 'Local', icon: Clapperboard },
  { label: 'Export target', value: 'MP4', icon: Film },
]

export function createMockRenderJob(input: {
  providerId: ProviderId
  referenceFace: string
  sourceVideo: string
  sourceReference?: SourceReferenceSummary
  enginePacket?: EnginePacketSummary
  providerRender?: ProviderRenderResult
  preset: RenderPreset
  compliance: ComplianceState
}): RenderJob {
  const timestamp = new Date().toISOString()
  const providerRender = input.providerRender
  return {
    id: `job-${Date.now().toString(36)}`,
    title: `${input.sourceVideo.replace(/\.[a-z0-9]+$/i, '') || 'UGC source'} swap`,
    providerId: input.providerId,
    status: providerRender ? (providerRender.ok ? 'complete' : 'blocked') : 'queued',
    progress: providerRender ? (providerRender.ok ? 100 : 0) : 2,
    createdAt: timestamp,
    updatedAt: timestamp,
    referenceFace: input.referenceFace,
    sourceVideo: input.sourceVideo,
    sourceReference: input.sourceReference,
    enginePacket: input.enginePacket,
    providerRender,
    preset: input.preset,
    compliance: input.compliance,
    audit: [
      'Job created in local queue.',
      `Provider route selected: ${providerOptions.find((provider) => provider.id === input.providerId)?.name ?? input.providerId}.`,
      `Export preset: ${input.preset.resolution}.`,
      input.sourceReference
        ? `Source link analyzed: ${input.sourceReference.platform}, ${input.sourceReference.transcriptLines} transcript lines.`
        : 'Source came from a local file or unanalyzed placeholder.',
      input.sourceReference?.preparedRunId
        ? `Source prepared locally: ${input.sourceReference.preparedRunId}.`
        : 'Source preparation will run in the provider adapter later.',
      input.enginePacket
        ? `Provider packet created: ${input.enginePacket.id}.`
        : 'Provider packet pending.',
      providerRender?.ok && providerRender.outputPath
        ? `Provider render complete: ${providerRender.outputPath}.`
        : providerRender && !providerRender.ok
          ? `Provider render blocked: ${providerRender.error ?? 'Unknown provider error'}.`
          : 'Provider render not started yet.',
      input.preset.provenance ? 'Provenance manifest requested.' : 'Provenance manifest disabled.',
    ],
  }
}

export function advanceJob(job: RenderJob): RenderJob {
  if (job.status === 'complete' || job.status === 'blocked') {
    return job
  }

  const nextProgress = Math.min(100, job.progress + (job.status === 'queued' ? 14 : 9))
  const status: JobStatus =
    nextProgress >= 100
      ? 'complete'
      : nextProgress >= 74
        ? 'review'
        : nextProgress >= 26
          ? 'rendering'
          : 'ingesting'

  const nextAudit =
    status !== job.status
      ? [...job.audit, `Stage changed to ${status}.`]
      : job.audit

  return {
    ...job,
    progress: nextProgress,
    status,
    updatedAt: new Date().toISOString(),
    audit: nextAudit,
  }
}

export function downloadManifest(job: RenderJob) {
  const payload = {
    app: 'CopyTok',
    generatedAt: new Date().toISOString(),
    note: 'This is a provider-neutral mock render manifest. Replace the mock provider with a real adapter to generate video artifacts.',
    job,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const href = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = href
  anchor.download = `${job.id}-manifest.json`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(href)
}
