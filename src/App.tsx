import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  ArrowDownToLine,
  CheckCircle2,
  CircleAlert,
  Clock3,
  ExternalLink,
  FileText,
  FolderKanban,
  HelpCircle,
  Image,
  Link,
  List,
  Mic2,
  Play,
  RefreshCw,
  Settings,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  User,
  WandSparkles,
} from 'lucide-react'
import appIcon from './assets/app-icon.png'
import './App.css'
import {
  advanceJob,
  createMockRenderJob,
  downloadManifest,
  providerOptions,
  starterJobs,
  type ComplianceState,
  type ProviderId,
  type RenderJob,
  type RenderPreset,
  type SourceReferenceSummary,
} from './domain'

const defaultPreset: RenderPreset = {
  resolution: '720p',
  watermark: false,
  provenance: true,
  faceRestore: true,
  urlImport: true,
}

const defaultCompliance: ComplianceState = {
  faceConsent: false,
  sourceRights: false,
  aiDisclosure: true,
}

const navItems = [
  { label: 'Projects', icon: FolderKanban },
  { label: 'Queue', icon: List },
  { label: 'Settings', icon: Settings },
]

function App() {
  const [activeNav, setActiveNav] = useState('Projects')
  const [providerId, setProviderId] = useState<ProviderId>('mock-local')
  const [preset, setPreset] = useState<RenderPreset>(defaultPreset)
  const [compliance, setCompliance] = useState<ComplianceState>(defaultCompliance)
  const [jobs, setJobs] = useState<RenderJob[]>(starterJobs)
  const [referenceFace, setReferenceFace] = useState('')
  const [sourceVideo, setSourceVideo] = useState('')
  const [referencePreview, setReferencePreview] = useState<string | null>(null)
  const [sourcePreview, setSourcePreview] = useState<string | null>(null)
  const [sourceUrl, setSourceUrl] = useState('')
  const [sourceAnalysis, setSourceAnalysis] = useState<SourceLinkAnalysis | null>(null)
  const [preparedSource, setPreparedSource] = useState<PreparedSource | null>(null)
  const [renderPacket, setRenderPacket] = useState<RenderPacket | null>(null)
  const [engineCapabilities, setEngineCapabilities] = useState<EngineCapabilities | null>(null)
  const [isAnalyzingSource, setIsAnalyzingSource] = useState(false)
  const [isPreparingSource, setIsPreparingSource] = useState(false)
  const [isCreatingPacket, setIsCreatingPacket] = useState(false)
  const [hostInfo, setHostInfo] = useState<StudioHostInfo | null>(null)

  useEffect(() => {
    window.studioHost?.getHostInfo().then(setHostInfo).catch(() => setHostInfo(null))
    window.studioHost?.getEngineCapabilities().then(setEngineCapabilities).catch(() => setEngineCapabilities(null))
  }, [])

  useEffect(() => {
    const interval = window.setInterval(() => {
      setJobs((currentJobs) => currentJobs.map(advanceJob))
    }, 1200)

    return () => window.clearInterval(interval)
  }, [])

  const selectedProvider = useMemo(
    () => providerOptions.find((provider) => provider.id === providerId) ?? providerOptions[0],
    [providerId],
  )

  const activeJob = jobs[0]
  const sourceLabel = sourceVideo || sourceAnalysis?.title || sourceUrl
  const readyToRender =
    Boolean(referenceFace) &&
    Boolean(sourceVideo || (sourceUrl && sourceAnalysis?.ok)) &&
    compliance.faceConsent &&
    compliance.sourceRights &&
    compliance.aiDisclosure

  function handleReferenceUpload(fileList: FileList | null) {
    const file = fileList?.[0]
    if (!file) return
    setReferenceFace(file.name)
    setReferencePreview((existingPreview) => {
      if (existingPreview) URL.revokeObjectURL(existingPreview)
      return URL.createObjectURL(file)
    })
  }

  function handleSourceUpload(fileList: FileList | null) {
    const file = fileList?.[0]
    if (!file) return
    setSourceVideo(file.name)
    setSourceUrl('')
    setSourceAnalysis(null)
    setPreparedSource(null)
    setRenderPacket(null)
    setSourcePreview((existingPreview) => {
      if (existingPreview) URL.revokeObjectURL(existingPreview)
      return URL.createObjectURL(file)
    })
  }

  function generateAvatarStub() {
    setReferenceFace('generated-avatar-reference.png')
    setReferencePreview(null)
  }

  function handleSourceUrlChange(value: string) {
    setSourceUrl(value)
    setSourceAnalysis(null)
    setPreparedSource(null)
    setRenderPacket(null)
    if (value) setSourceVideo('')
  }

  async function analyzeSourceLink() {
    if (!sourceUrl.trim() || !window.studioHost?.analyzeSourceUrl) return
    setIsAnalyzingSource(true)
    setSourceAnalysis(null)
    try {
      const analysis = await window.studioHost.analyzeSourceUrl(sourceUrl.trim())
      setSourceAnalysis(analysis)
      setPreparedSource(null)
      setRenderPacket(null)
    } catch (error) {
      setSourceAnalysis({
        ok: false,
        fetchedAt: new Date().toISOString(),
        message: error instanceof Error ? error.message : String(error),
      })
    } finally {
      setIsAnalyzingSource(false)
    }
  }

  function sourceReferenceSummary(preparedOverride: PreparedSource | null = preparedSource): SourceReferenceSummary | undefined {
    if (!sourceAnalysis?.ok) return undefined
    return {
      title: sourceAnalysis.title ?? 'Analyzed source post',
      platform: sourceAnalysis.platform ?? 'Unknown platform',
      url: sourceAnalysis.url ?? sourceUrl,
      durationSeconds: preparedOverride?.media?.durationSeconds ?? sourceAnalysis.durationSeconds ?? null,
      transcriptStatus: sourceAnalysis.transcript?.status ?? 'missing',
      transcriptLines: preparedOverride?.transcript?.lineCount ?? sourceAnalysis.transcript?.lineCount ?? 0,
      voiceStatus: sourceAnalysis.voice?.status ?? 'Audio status unknown.',
      preparedRunId: preparedOverride?.runId,
    }
  }

  async function prepareSourceLink() {
    if (!sourceUrl.trim() || !sourceAnalysis?.ok || !window.studioHost?.prepareSourceUrl) return null
    setIsPreparingSource(true)
    try {
      const prepared = await window.studioHost.prepareSourceUrl(sourceUrl.trim())
      setPreparedSource(prepared)
      return prepared
    } catch (error) {
      const failed: PreparedSource = {
        ok: false,
        runId: 'failed',
        preparedAt: new Date().toISOString(),
        notes: [error instanceof Error ? error.message : String(error)],
      }
      setPreparedSource(failed)
      return null
    } finally {
      setIsPreparingSource(false)
    }
  }

  async function startRenderJob() {
    if (!readyToRender) return
    setIsCreatingPacket(true)
    try {
      const prepared = sourceUrl && !sourceVideo ? preparedSource ?? (await prepareSourceLink()) : preparedSource
      const packet =
        window.studioHost?.createRenderPacket
          ? await window.studioHost.createRenderPacket({
              providerId,
              referenceFace,
              sourceVideo: sourceLabel,
              sourceReference: sourceReferenceSummary(prepared),
              preparedSource: prepared,
              preset,
              compliance,
            })
          : null
      if (packet) setRenderPacket(packet)

      const job = createMockRenderJob({
        providerId,
        referenceFace,
        sourceVideo: sourceLabel,
        sourceReference: sourceReferenceSummary(prepared),
        enginePacket: packet
          ? {
              id: packet.id,
              status: packet.status,
              packetPath: packet.packetPath,
              nextRequiredSecret: packet.nextRequiredSecret,
            }
          : undefined,
        preset,
        compliance,
      })
      setJobs((currentJobs) => [job, ...currentJobs])
    } finally {
      setIsCreatingPacket(false)
    }
  }

  return (
    <main className="studio-shell">
      <header className="app-header">
        <div className="brand">
          <img src={appIcon} alt="" />
          <strong>CopyTok</strong>
        </div>
        <nav aria-label="Studio navigation">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.label}
                className={activeNav === item.label ? 'active' : ''}
                type="button"
                onClick={() => setActiveNav(item.label)}
              >
                <Icon size={17} />
                {item.label}
              </button>
            )
          })}
        </nav>
        <div className="header-actions">
          <button type="button" aria-label="Help">
            <HelpCircle size={18} />
          </button>
          <button type="button" aria-label="Account">
            <User size={18} />
          </button>
        </div>
      </header>

      <section className="hero-flow">
        <p className="micro-label">Local AI UGC workflow</p>
        <h1>Any avatar. Any action template.</h1>
        <p className="hero-copy">
          Generate a persona, fetch a permitted source post, and route the action clone through your chosen engine.
        </p>

        <section className="swap-cards" aria-label="Swap inputs">
          <UploadCard
            accent="teal"
            title="Avatar photo"
            subtitle="Upload or generate the face you want in the video"
            dropLabel="Drop image here"
            dropMeta="PNG, JPG up to 20MB"
            accept="image/*"
            icon={<Image size={24} />}
            fileName={referenceFace}
            preview={referencePreview}
            onFile={handleReferenceUpload}
            footer={
              <button className="ghost-button" type="button" onClick={generateAvatarStub}>
                <WandSparkles size={15} />
                Generate AI avatar
              </button>
            }
          />

          <div className="swap-arrow" aria-hidden="true">
            ⇄
          </div>

          <UploadCard
            accent="violet"
            title="Source video"
            subtitle="Upload an acted-out template or analyze a permitted social link"
            dropLabel="Drop video here"
            dropMeta="MP4, MOV up to 500MB"
            accept="video/mp4,video/quicktime,video/*"
            icon={<Play size={24} />}
            fileName={sourceVideo}
            preview={sourcePreview}
            onFile={handleSourceUpload}
            footer={
              <div className="link-input">
                <span>OR PASTE LINK</span>
                <label>
                  <Link size={15} />
                  <input
                    value={sourceUrl}
                    onChange={(event) => handleSourceUrlChange(event.target.value)}
                    placeholder="TikTok, Instagram, YouTube Short, or source URL"
                  />
                </label>
                <button
                  className="analyze-button"
                  type="button"
                  disabled={!sourceUrl.trim() || isAnalyzingSource}
                  onClick={analyzeSourceLink}
                >
                  <RefreshCw size={14} className={isAnalyzingSource ? 'spinning' : ''} />
                  {isAnalyzingSource ? 'Fetching post' : 'Analyze link'}
                </button>
              </div>
            }
          />
        </section>

        <SourceInsight
          analysis={sourceAnalysis}
          sourceUrl={sourceUrl}
          isAnalyzing={isAnalyzingSource}
          isPreparing={isPreparingSource}
          preparedSource={preparedSource}
          onPrepare={prepareSourceLink}
        />

        <section className="control-panel" aria-label="Render controls">
          <div className="guardrail-block">
            <strong>Rights & disclosure</strong>
            <CheckRow
              label="I own or have permission for the avatar image."
              checked={compliance.faceConsent}
              onChange={(value) => setCompliance((current) => ({ ...current, faceConsent: value }))}
            />
            <CheckRow
              label="I own or have permission for the source action, transcript, audio, and voice reference."
              checked={compliance.sourceRights}
              onChange={(value) => setCompliance((current) => ({ ...current, sourceRights: value }))}
            />
            <CheckRow
              label="I will disclose AI usage where appropriate."
              checked={compliance.aiDisclosure}
              onChange={(value) => setCompliance((current) => ({ ...current, aiDisclosure: value }))}
            />
          </div>

          <div className="provider-block">
            <label htmlFor="provider">Provider</label>
            <select
              id="provider"
              value={providerId}
              onChange={(event) => setProviderId(event.target.value as ProviderId)}
            >
              {providerOptions.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.name}
                </option>
              ))}
            </select>
            <small>{selectedProvider.bestFor}</small>
          </div>

          <div className="output-block">
            <span>Output</span>
            <SegmentedControl
              options={['720p', '1080p']}
              value={preset.resolution}
              onChange={(resolution) => setPreset((current) => ({ ...current, resolution }))}
            />
            <label className="mini-toggle">
              <input
                type="checkbox"
                checked={preset.provenance}
                onChange={(event) =>
                  setPreset((current) => ({ ...current, provenance: event.target.checked }))
                }
              />
              Provenance
            </label>
          </div>

          <button
            className="generate-button"
            type="button"
            disabled={!readyToRender || isPreparingSource || isCreatingPacket}
            onClick={startRenderJob}
          >
            <Sparkles size={18} />
            {isPreparingSource || isCreatingPacket ? 'Preparing Engine Packet' : 'Generate Swap'}
          </button>
          {!readyToRender && (
            <p className="render-hint">
              <CircleAlert size={15} />
              Add an avatar, upload a video or analyze a link, and complete the checks.
            </p>
          )}
        </section>

        <EngineStackPanel capabilities={engineCapabilities} renderPacket={renderPacket} />

        <QueuePanel job={activeJob} jobs={jobs} sourcePreview={sourcePreview} hostInfo={hostInfo} />
      </section>
    </main>
  )
}

function UploadCard({
  accent,
  title,
  subtitle,
  dropLabel,
  dropMeta,
  accept,
  icon,
  fileName,
  preview,
  onFile,
  footer,
}: {
  accent: 'teal' | 'violet'
  title: string
  subtitle: string
  dropLabel: string
  dropMeta: string
  accept: string
  icon: ReactNode
  fileName: string
  preview: string | null
  onFile: (files: FileList | null) => void
  footer: ReactNode
}) {
  return (
    <article className={`upload-card ${accent}`}>
      <div className="card-icon">{icon}</div>
      <h2>{title}</h2>
      <p>{subtitle}</p>
      <label className={preview ? 'drop-zone has-preview' : 'drop-zone'}>
        <input type="file" accept={accept} onChange={(event) => onFile(event.target.files)} />
        {preview ? (
          title === 'Source video' ? (
            <video src={preview} muted />
          ) : (
            <img src={preview} alt="" />
          )
        ) : (
          <>
            <UploadCloud size={28} />
            <strong>{dropLabel}</strong>
            <span>{dropMeta}</span>
          </>
        )}
      </label>
      {fileName ? <span className="file-chip">{fileName}</span> : null}
      {footer}
    </article>
  )
}

function SourceInsight({
  analysis,
  sourceUrl,
  isAnalyzing,
  isPreparing,
  preparedSource,
  onPrepare,
}: {
  analysis: SourceLinkAnalysis | null
  sourceUrl: string
  isAnalyzing: boolean
  isPreparing: boolean
  preparedSource: PreparedSource | null
  onPrepare: () => Promise<PreparedSource | null>
}) {
  if (!sourceUrl && !analysis && !isAnalyzing) return null

  if (isAnalyzing) {
    return (
      <section className="source-insight pending" aria-live="polite">
        <RefreshCw size={18} className="spinning" />
        <div>
          <strong>Fetching the source post</strong>
          <span>CopyTok is checking the post, captions, audio track, timing, and adapter readiness.</span>
        </div>
      </section>
    )
  }

  if (isPreparing) {
    return (
      <section className="source-insight pending" aria-live="polite">
        <RefreshCw size={18} className="spinning" />
        <div>
          <strong>Preparing source video</strong>
          <span>CopyTok is downloading, clipping, normalizing, extracting audio, and building the provider handoff.</span>
        </div>
      </section>
    )
  }

  if (analysis && !analysis.ok) {
    return (
      <section className="source-insight warning" aria-live="polite">
        <CircleAlert size={18} />
        <div>
          <strong>Source link could not be analyzed</strong>
          <span>{analysis.message || analysis.installHint || 'Try another permitted post URL.'}</span>
        </div>
      </section>
    )
  }

  if (!analysis?.ok) {
    return (
      <section className="source-insight neutral" aria-live="polite">
        <Link size={18} />
        <div>
          <strong>Analyze the pasted source link</strong>
          <span>Fetching is required before a URL can become a render-ready action template.</span>
        </div>
      </section>
    )
  }

  const transcript = analysis.transcript
  const transcriptReady = transcript?.status === 'ready'
  const preparedTranscriptReady = preparedSource?.transcript?.status === 'ready'
  const duration = formatDuration(analysis.durationSeconds)
  const preparedDuration = formatDuration(preparedSource?.media?.durationSeconds)

  return (
    <section className="source-insight success" aria-label="Analyzed source post">
      {analysis.thumbnail ? <img src={analysis.thumbnail} alt="" /> : <div className="source-thumb-fallback"><Play size={22} /></div>}
      <div className="source-copy">
        <span className="source-kicker">
          <ShieldCheck size={14} />
          Source fetched for reference
        </span>
        <strong>{analysis.title || 'Analyzed source post'}</strong>
        <span>
          {[analysis.platform, analysis.author, duration].filter(Boolean).join(' · ')}
        </span>
      </div>
      <div className="source-badges">
        <SourceBadge
          icon={<FileText size={15} />}
          label={
            preparedTranscriptReady
              ? `${preparedSource?.transcript?.lineCount ?? 0} transcript lines`
              : transcriptReady
                ? `${transcript?.lineCount ?? 0} transcript lines`
                : 'Transcript unavailable'
          }
          tone={preparedTranscriptReady || transcriptReady ? 'ready' : 'muted'}
        />
        <SourceBadge
          icon={<Mic2 size={15} />}
          label={analysis.voice?.hasAudio ? 'Audio detected' : 'No audio track'}
          tone={analysis.voice?.hasAudio ? 'ready' : 'muted'}
        />
        {analysis.url ? (
          <button
            className="source-link-button"
            type="button"
            onClick={() => window.studioHost?.openExternal(analysis.url ?? '')}
          >
            <ExternalLink size={15} />
            Open
          </button>
        ) : null}
        {preparedSource?.ok ? (
          <SourceBadge icon={<CheckCircle2 size={15} />} label="Normalized MP4" tone="ready" />
        ) : (
          <button className="source-link-button prepare" type="button" onClick={onPrepare}>
            <RefreshCw size={15} />
            Prepare
          </button>
        )}
      </div>
      <p>
        {preparedSource && !preparedSource.ok
          ? `Preparation failed: ${preparedSource.notes?.[0] ?? 'Try a different permitted source link.'}`
          : preparedSource?.ok
          ? `Prepared ${preparedDuration || 'short-form'} source for fal/PixVerse adapter packets.`
          : 'Use only owned, licensed, or explicitly permitted posts. Reusing a real voice requires separate consent.'}
      </p>
    </section>
  )
}

function EngineStackPanel({
  capabilities,
  renderPacket,
}: {
  capabilities: EngineCapabilities | null
  renderPacket: RenderPacket | null
}) {
  const visibleTools = capabilities?.tools.filter((tool) =>
    ['ytDlp', 'ffmpeg', 'ffprobe', 'whisperCli'].includes(tool.id),
  )

  return (
    <section className="engine-strip" aria-label="Engine harness">
      <div>
        <span>Engine harness</span>
        <strong>{capabilities?.ready ? 'Local ingest stack ready' : 'Checking local ingest stack'}</strong>
      </div>
      <div className="engine-tools">
        {(visibleTools ?? []).map((tool) => (
          <span key={tool.id} className={tool.status === 'ready' ? 'ready' : 'missing'} title={tool.role}>
            {tool.status === 'ready' ? <CheckCircle2 size={14} /> : <CircleAlert size={14} />}
            {tool.label}
          </span>
        ))}
      </div>
      <div className="packet-pill">
        {renderPacket ? (
          <>
            <CheckCircle2 size={15} />
            Packet {renderPacket.id}
          </>
        ) : (
          <>
            <Sparkles size={15} />
            fal/PixVerse packet slot
          </>
        )}
      </div>
    </section>
  )
}

function SourceBadge({
  icon,
  label,
  tone,
}: {
  icon: ReactNode
  label: string
  tone: 'ready' | 'muted'
}) {
  return (
    <span className={`source-badge ${tone}`}>
      {icon}
      {label}
    </span>
  )
}

function formatDuration(durationSeconds: number | null | undefined) {
  if (!durationSeconds) return ''
  const minutes = Math.floor(durationSeconds / 60)
  const seconds = durationSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function CheckRow({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="check-row">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
    </label>
  )
}

function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: Array<RenderPreset['resolution']>
  value: RenderPreset['resolution']
  onChange: (value: RenderPreset['resolution']) => void
}) {
  return (
    <div className="resolution-control">
      {options.map((option) => (
        <button
          key={option}
          className={value === option ? 'selected' : ''}
          type="button"
          onClick={() => onChange(option)}
        >
          {option}
        </button>
      ))}
    </div>
  )
}

function QueuePanel({
  job,
  jobs,
  sourcePreview,
  hostInfo,
}: {
  job?: RenderJob
  jobs: RenderJob[]
  sourcePreview: string | null
  hostInfo: StudioHostInfo | null
}) {
  if (!job) return null

  return (
    <section className="queue-strip" aria-label="Queue and output">
      <div className="queue-heading">
        <div>
          <span>Queue</span>
          <h2>{job.title}</h2>
        </div>
        <strong>{job.progress}%</strong>
      </div>
      <div className="queue-preview">
        {sourcePreview ? (
          <video src={sourcePreview} muted controls />
        ) : (
          <div>
            <Play size={28} />
            <span>{job.status === 'complete' ? 'Mock output ready' : 'Renderer preview pending'}</span>
          </div>
        )}
      </div>
      <div className="queue-details">
        <div className="progress-track">
          <div style={{ width: `${job.progress}%` }} />
        </div>
        <div className="queue-meta">
          <span>{jobs.length} local job{jobs.length === 1 ? '' : 's'}</span>
          <span>{hostInfo?.packaged ? 'Installed app' : 'Dev build'}</span>
          <JobStatusIcon status={job.status} />
        </div>
        <ul>
          {job.audit.slice(-3).map((entry) => (
            <li key={entry}>{entry}</li>
          ))}
        </ul>
        <button
          className="download-button"
          type="button"
          disabled={job.status !== 'complete'}
          onClick={() => downloadManifest(job)}
        >
          <ArrowDownToLine size={16} />
          Download manifest
        </button>
      </div>
    </section>
  )
}

function JobStatusIcon({ status }: { status: RenderJob['status'] }) {
  if (status === 'complete') return <CheckCircle2 className="status-complete" size={18} />
  if (status === 'blocked') return <CircleAlert className="status-blocked" size={18} />
  return <Clock3 className="status-running" size={18} />
}

export default App
