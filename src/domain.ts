import type { ComponentType } from 'react'
import {
  Bot,
  Boxes,
  BrainCircuit,
  Clapperboard,
  Film,
  Laptop,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'

export type ProviderId =
  | 'mock-local'
  | 'facefusion-local'
  | 'pixverse-cloud'
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
  status: 'Ready mock' | 'Adapter slot' | 'Recommended candidate'
}

export interface RenderPreset {
  resolution: '720p' | '1080p'
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
  preset: RenderPreset
  compliance: ComplianceState
  audit: string[]
}

export const providerOptions: ProviderOption[] = [
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
    id: 'pixverse-cloud',
    name: 'Pixverse / SWAP Cloud',
    shortName: 'Pixverse',
    mode: 'Cloud',
    icon: Sparkles,
    bestFor: 'Closest conceptual match to SwapTok-style video swap behavior if API access is available.',
    status: 'Recommended candidate',
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
  preset: RenderPreset
  compliance: ComplianceState
}): RenderJob {
  const timestamp = new Date().toISOString()
  return {
    id: `job-${Date.now().toString(36)}`,
    title: `${input.sourceVideo.replace(/\.[a-z0-9]+$/i, '') || 'UGC source'} swap`,
    providerId: input.providerId,
    status: 'queued',
    progress: 2,
    createdAt: timestamp,
    updatedAt: timestamp,
    referenceFace: input.referenceFace,
    sourceVideo: input.sourceVideo,
    sourceReference: input.sourceReference,
    enginePacket: input.enginePacket,
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
