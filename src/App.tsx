import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Activity,
  ArrowDownToLine,
  AudioWaveform,
  BarChart3,
  CheckCircle2,
  CircleAlert,
  Clock3,
  CopyCheck,
  Database,
  ExternalLink,
  FileText,
  FolderKanban,
  Gauge,
  HelpCircle,
  HeartPulse,
  Image,
  Link,
  List,
  Mic2,
  MousePointerClick,
  Play,
  RefreshCw,
  Search,
  Settings,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
  TrendingUp,
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
  falProviderOptions,
  providerOptions,
  starterJobs,
  type ComplianceState,
  type ProviderId,
  type ProviderRenderResult,
  type RenderJob,
  type RenderPreset,
  type SourceReferenceSummary,
} from './domain'
import {
  engagementPercent,
  formatMetric,
  getTrendAppProfile,
  profileQueryValue,
  sortTrendPosts,
  trendAppProfiles,
  trendScoutProviderOptions,
  trendSortOptions,
  type TrendAdaptationBrief,
  type TrendAppProfileId,
  type TrendPost,
  type TrendScoutProviderId,
  type TrendScoutResult,
  type TrendScoutSort,
  type TrendScoutStatus,
} from './trendScout'

const defaultPreset: RenderPreset = {
  resolution: '720p',
  aspectRatio: '9:16',
  watermark: false,
  provenance: true,
  faceRestore: true,
  urlImport: true,
}

const defaultCompliance: ComplianceState = {
  faceConsent: true,
  sourceRights: true,
  aiDisclosure: true,
}

const navItems = [
  { label: 'Projects', icon: FolderKanban },
  { label: 'Trend Scout', icon: Search },
  { label: 'Queue', icon: List },
  { label: 'Settings', icon: Settings },
]

function App() {
  const [activeNav, setActiveNav] = useState('Projects')
  const [providerId, setProviderId] = useState<ProviderId>('fal-seedance-reference')
  const [preset, setPreset] = useState<RenderPreset>(defaultPreset)
  const [compliance] = useState<ComplianceState>(defaultCompliance)
  const [jobs, setJobs] = useState<RenderJob[]>(starterJobs)
  const [referenceFace, setReferenceFace] = useState('')
  const [sourceVideo, setSourceVideo] = useState('')
  const [referenceFacePath, setReferenceFacePath] = useState('')
  const [sourceVideoPath, setSourceVideoPath] = useState('')
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
  const [isRenderingProvider, setIsRenderingProvider] = useState(false)
  const [renderError, setRenderError] = useState('')
  const [providerResult, setProviderResult] = useState<ProviderRenderResult | null>(null)
  const [hostInfo, setHostInfo] = useState<StudioHostInfo | null>(null)
  const [trendStatus, setTrendStatus] = useState<TrendScoutStatus | null>(null)
  const [trendProfileId, setTrendProfileId] = useState<TrendAppProfileId>('snapglp')
  const [trendProviderId, setTrendProviderId] = useState<TrendScoutProviderId>('apify-tiktok')
  const [trendQuery, setTrendQuery] = useState(profileQueryValue('snapglp'))
  const [trendSort, setTrendSort] = useState<TrendScoutSort>('score')
  const [trendMinViews, setTrendMinViews] = useState(50000)
  const [trendLimit, setTrendLimit] = useState(24)
  const [trendResult, setTrendResult] = useState<TrendScoutResult | null>(null)
  const [selectedTrendPostId, setSelectedTrendPostId] = useState('')
  const [trendBrief, setTrendBrief] = useState<TrendAdaptationBrief | null>(null)
  const [isTrendLoading, setIsTrendLoading] = useState(false)
  const [trendError, setTrendError] = useState('')

  useEffect(() => {
    window.studioHost?.getHostInfo().then(setHostInfo).catch(() => setHostInfo(null))
    window.studioHost?.getEngineCapabilities().then(setEngineCapabilities).catch(() => setEngineCapabilities(null))
    window.studioHost?.getTrendScoutStatus?.().then(setTrendStatus).catch(() => setTrendStatus(null))
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
    Boolean(referenceFacePath) &&
    Boolean(sourceVideoPath || (sourceUrl && sourceAnalysis?.ok))
  const sortedTrendPosts = useMemo(
    () => sortTrendPosts((trendResult?.posts ?? []) as TrendPost[], trendSort),
    [trendResult, trendSort],
  )
  const selectedTrendPost =
    sortedTrendPosts.find((post) => post.id === selectedTrendPostId) ?? sortedTrendPosts[0] ?? null

  function refreshTrendStatus() {
    window.studioHost?.getTrendScoutStatus?.().then(setTrendStatus).catch(() => setTrendStatus(null))
  }

  function handleTrendProfileChange(profileId: TrendAppProfileId) {
    setTrendProfileId(profileId)
    setTrendQuery(profileQueryValue(profileId))
    setTrendResult(null)
    setSelectedTrendPostId('')
    setTrendBrief(null)
    setTrendError('')
  }

  async function runTrendSearch() {
    if (!window.studioHost?.runTrendScout) {
      setTrendError('This CopyTok build does not expose the Trend Scout backend yet.')
      return
    }
    setIsTrendLoading(true)
    setTrendError('')
    setTrendBrief(null)
    try {
      const result = (await window.studioHost.runTrendScout({
        appProfileId: trendProfileId,
        providerId: trendProviderId,
        query: trendQuery,
        sort: trendSort,
        limit: trendLimit,
        minViews: trendMinViews,
      })) as TrendScoutResult
      setTrendResult(result)
      setSelectedTrendPostId(result.posts[0]?.id ?? '')
      if (!result.ok) setTrendError(result.message || 'Trend Scout could not return live results.')
      refreshTrendStatus()
    } catch (error) {
      setTrendError(error instanceof Error ? error.message : String(error))
    } finally {
      setIsTrendLoading(false)
    }
  }

  async function createTrendBrief(post: TrendPost) {
    if (!window.studioHost?.createTrendAdaptation) return
    setTrendError('')
    try {
      const brief = (await window.studioHost.createTrendAdaptation({
        appProfileId: trendProfileId,
        post,
      })) as TrendAdaptationBrief
      setTrendBrief(brief)
      setSelectedTrendPostId(post.id)
      refreshTrendStatus()
    } catch (error) {
      setTrendError(error instanceof Error ? error.message : String(error))
    }
  }

  function sendTrendToComposer(post: TrendPost) {
    if (!post.url) {
      setTrendError('This demo seed does not have a real source URL. Use a live result or paste your own source post.')
      return
    }
    setSourceUrl(post.url)
    setSourceVideo('')
    setSourceVideoPath('')
    setSourcePreview((existingPreview) => {
      if (existingPreview) URL.revokeObjectURL(existingPreview)
      return null
    })
    setSourceAnalysis(null)
    setPreparedSource(null)
    setRenderPacket(null)
    setProviderResult(null)
    setRenderError('')
    setActiveNav('Projects')
  }

  function desktopFilePath(file: File) {
    return (window.studioHost?.getFilePath?.(file) || (file as File & { path?: string }).path || '').trim()
  }

  function handleReferenceUpload(fileList: FileList | null) {
    const file = fileList?.[0]
    if (!file) return
    setReferenceFace(file.name)
    setReferenceFacePath(desktopFilePath(file))
    setRenderError('')
    setReferencePreview((existingPreview) => {
      if (existingPreview) URL.revokeObjectURL(existingPreview)
      return URL.createObjectURL(file)
    })
  }

  function handleSourceUpload(fileList: FileList | null) {
    const file = fileList?.[0]
    if (!file) return
    setSourceVideo(file.name)
    setSourceVideoPath(desktopFilePath(file))
    setSourceUrl('')
    setSourceAnalysis(null)
    setPreparedSource(null)
    setRenderPacket(null)
    setRenderError('')
    setProviderResult(null)
    setSourcePreview((existingPreview) => {
      if (existingPreview) URL.revokeObjectURL(existingPreview)
      return URL.createObjectURL(file)
    })
  }

  async function openAvatarGenerator() {
    setRenderError('')
    await window.studioHost?.openChatGPTPro?.()
  }

  function handleSourceUrlChange(value: string) {
    setSourceUrl(value)
    setSourceVideoPath('')
    setSourceAnalysis(null)
    setPreparedSource(null)
    setRenderPacket(null)
    setProviderResult(null)
    setRenderError('')
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

  async function prepareLocalSourceFile() {
    if (!sourceVideoPath || !window.studioHost?.prepareSourceFile) return null
    setIsPreparingSource(true)
    try {
      const prepared = await window.studioHost.prepareSourceFile(sourceVideoPath)
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
    setIsRenderingProvider(false)
    setRenderError('')
    setProviderResult(null)
    try {
      if (!referenceFacePath) {
        throw new Error('Upload a saved avatar image before running fal. Generated avatar stubs are not files yet.')
      }

      const prepared =
        sourceUrl && !sourceVideo
          ? preparedSource ?? (await prepareSourceLink())
          : sourceVideoPath
            ? preparedSource ?? (await prepareLocalSourceFile())
            : preparedSource

      if (!prepared?.ok) {
        throw new Error('Prepare the source footage before sending it to the selected provider.')
      }

      const packet =
        window.studioHost?.createRenderPacket
          ? await window.studioHost.createRenderPacket({
              providerId,
              referenceFace,
              referenceFacePath,
              sourceVideo: sourceLabel,
              sourceVideoPath,
              sourceReference: sourceReferenceSummary(prepared),
              preparedSource: prepared,
              preset,
              compliance,
            })
          : null
      if (packet) setRenderPacket(packet)

      const jobInput: Parameters<typeof createMockRenderJob>[0] = {
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
      }

      let providerRender: ProviderRenderResult | undefined
      if (providerId === 'fal-seedance-reference' || providerId === 'fal-pixverse-swap') {
        if (!window.studioHost?.renderWithProvider) {
          throw new Error('This CopyTok build does not expose the fal render adapter yet.')
        }
        setIsRenderingProvider(true)
        providerRender = await window.studioHost.renderWithProvider({
          providerId,
          referenceFace,
          referenceFacePath,
          sourceVideo: sourceLabel,
          sourceVideoPath,
          sourceReference: sourceReferenceSummary(prepared),
          preparedSource: prepared,
          preset,
          compliance,
        })
        if (providerRender) setProviderResult(providerRender)
        jobInput.providerRender = providerRender
      }

      const job = createMockRenderJob(jobInput)
      setJobs((currentJobs) => [job, ...currentJobs])
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setRenderError(message)
    } finally {
      setIsCreatingPacket(false)
      setIsRenderingProvider(false)
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

      <section className={activeNav === 'Trend Scout' ? 'hero-flow trend-flow' : 'hero-flow'}>
        {activeNav === 'Trend Scout' ? (
          <TrendScoutWorkspace
            status={trendStatus}
            profileId={trendProfileId}
            providerId={trendProviderId}
            query={trendQuery}
            sort={trendSort}
            minViews={trendMinViews}
            limit={trendLimit}
            result={trendResult}
            posts={sortedTrendPosts}
            selectedPost={selectedTrendPost}
            brief={trendBrief}
            error={trendError}
            isLoading={isTrendLoading}
            onProfileChange={handleTrendProfileChange}
            onProviderChange={setTrendProviderId}
            onQueryChange={setTrendQuery}
            onSortChange={setTrendSort}
            onMinViewsChange={setTrendMinViews}
            onLimitChange={setTrendLimit}
            onRun={runTrendSearch}
            onSelectPost={setSelectedTrendPostId}
            onCreateBrief={createTrendBrief}
            onSendToComposer={sendTrendToComposer}
          />
        ) : (
          <>
            <p className="micro-label">Local AI UGC workflow</p>
            <h1>Clone any social post.</h1>
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
                  <button className="ghost-button" type="button" onClick={openAvatarGenerator}>
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
              <div className="provider-block">
                <ProviderChips
                  providerId={providerId}
                  capabilities={engineCapabilities}
                  onChange={setProviderId}
                />
                <small>{selectedProvider.bestFor}</small>
              </div>

              <div className="output-block">
                <span>Output</span>
                <label className="control-label">Aspect ratio</label>
                <SegmentedControl
                  options={['9:16', '1:1', '16:9']}
                  value={preset.aspectRatio}
                  onChange={(aspectRatio) =>
                    setPreset((current) => ({ ...current, aspectRatio: aspectRatio as RenderPreset['aspectRatio'] }))
                  }
                />
                <label className="control-label">Resolution</label>
                <SegmentedControl
                  options={['720p', '1080p']}
                  value={preset.resolution}
                  onChange={(resolution) =>
                    setPreset((current) => ({ ...current, resolution: resolution as RenderPreset['resolution'] }))
                  }
                />
              </div>

              <button
                className="generate-button"
                type="button"
                disabled={!readyToRender || isPreparingSource || isCreatingPacket || isRenderingProvider}
                onClick={startRenderJob}
              >
                <Sparkles size={18} />
                {isRenderingProvider
                  ? 'Rendering on fal'
                  : isPreparingSource || isCreatingPacket
                    ? 'Preparing Engine Packet'
                    : 'Generate Swap'}
              </button>
              {!readyToRender && (
                <p className="render-hint">
                  <CircleAlert size={15} />
                  Add an avatar and upload a video or analyze a link.
                </p>
              )}
              {renderError && (
                <p className="render-error">
                  <CircleAlert size={15} />
                  {renderError}
                </p>
              )}
            </section>

            <EngineStackPanel capabilities={engineCapabilities} renderPacket={renderPacket} />

            <QueuePanel
              job={activeJob}
              jobs={jobs}
              sourcePreview={sourcePreview}
              outputPreview={providerResult?.outputUrl ?? activeJob?.providerRender?.outputUrl ?? null}
              hostInfo={hostInfo}
            />
          </>
        )}
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
  afterDrop,
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
  afterDrop?: ReactNode
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
      {afterDrop}
      {footer}
    </article>
  )
}

function ProviderChips({
  providerId,
  capabilities,
  onChange,
}: {
  providerId: ProviderId
  capabilities: EngineCapabilities | null
  onChange: (providerId: ProviderId) => void
}) {
  return (
    <div className="provider-chips" aria-label="fal provider">
      <span>PROVIDER</span>
      <div>
        {falProviderOptions.map((provider) => {
          const Icon = provider.icon
          const capability = capabilities?.providers.find((item) => item.id === provider.id)
          const missingSecret = capability?.status === 'missing-secret'
          return (
            <button
              key={provider.id}
              className={providerId === provider.id ? 'selected' : ''}
              type="button"
              title={missingSecret ? 'FAL_KEY is missing from the CopyTok Keychain.' : provider.bestFor}
              onClick={() => onChange(provider.id)}
            >
              <Icon size={15} />
              <strong>{provider.shortName}</strong>
              <small>{missingSecret ? 'Needs key' : provider.id === 'fal-seedance-reference' ? 'Best quality' : 'Fast swap'}</small>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function TrendScoutWorkspace({
  status,
  profileId,
  providerId,
  query,
  sort,
  minViews,
  limit,
  result,
  posts,
  selectedPost,
  brief,
  error,
  isLoading,
  onProfileChange,
  onProviderChange,
  onQueryChange,
  onSortChange,
  onMinViewsChange,
  onLimitChange,
  onRun,
  onSelectPost,
  onCreateBrief,
  onSendToComposer,
}: {
  status: TrendScoutStatus | null
  profileId: TrendAppProfileId
  providerId: TrendScoutProviderId
  query: string
  sort: TrendScoutSort
  minViews: number
  limit: number
  result: TrendScoutResult | null
  posts: TrendPost[]
  selectedPost: TrendPost | null
  brief: TrendAdaptationBrief | null
  error: string
  isLoading: boolean
  onProfileChange: (profileId: TrendAppProfileId) => void
  onProviderChange: (providerId: TrendScoutProviderId) => void
  onQueryChange: (query: string) => void
  onSortChange: (sort: TrendScoutSort) => void
  onMinViewsChange: (minViews: number) => void
  onLimitChange: (limit: number) => void
  onRun: () => void
  onSelectPost: (postId: string) => void
  onCreateBrief: (post: TrendPost) => void
  onSendToComposer: (post: TrendPost) => void
}) {
  const profile = getTrendAppProfile(profileId)
  const liveProvider = status?.providers.find((item) => item.id === 'apify-tiktok')
  const providerOptions = trendScoutProviderOptions.map((provider) => ({
    ...provider,
    ...(status?.providers.find((item) => item.id === provider.id) ?? {}),
  }))

  return (
    <>
      <p className="micro-label">Trend intelligence</p>
      <h1>Find proven formats.</h1>
      <p className="hero-copy">
        Search real TikTok trend evidence, rank useful formats, and turn winners into CopyTok production briefs.
      </p>

      <section className="trend-console" aria-label="Trend Scout">
        <div className="trend-control-panel">
          <div className="trend-control-heading">
            <div>
              <span>App lane</span>
              <strong>{profile.name}</strong>
            </div>
            <div className="trend-status-pill">
              <Database size={15} />
              {status?.cache.postCount ?? 0} saved posts
            </div>
          </div>

          <div className="app-profile-chips" aria-label="Andromeda app profiles">
            {trendAppProfiles.map((appProfile) => (
              <button
                key={appProfile.id}
                className={profileId === appProfile.id ? 'selected' : ''}
                type="button"
                onClick={() => onProfileChange(appProfile.id)}
              >
                {appProfile.id === 'snapglp' ? <HeartPulse size={18} /> : <AudioWaveform size={18} />}
                <strong>{appProfile.name}</strong>
                <span>{appProfile.category}</span>
              </button>
            ))}
          </div>

          <div className="trend-provider-row" aria-label="Trend provider">
            {providerOptions.map((provider) => (
              <button
                key={provider.id}
                className={providerId === provider.id ? 'selected' : ''}
                type="button"
                onClick={() => onProviderChange(provider.id)}
                title={provider.role}
              >
                {provider.id === 'apify-tiktok' ? <TrendingUp size={16} /> : <Activity size={16} />}
                <strong>{provider.label}</strong>
                <span>{provider.status === 'ready' ? 'Ready' : provider.secretName ? `Needs ${provider.secretName}` : provider.status}</span>
              </button>
            ))}
          </div>

          <label className="trend-search-box">
            <span>Search brief</span>
            <div>
              <Search size={17} />
              <input
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder="guitar tone app, GLP-1 meal tracking, viral hook..."
              />
            </div>
          </label>

          <div className="trend-filter-row">
            <TrendSelect
              icon={<SlidersHorizontal size={15} />}
              label="Sort"
              value={sort}
              options={trendSortOptions}
              onChange={(value) => onSortChange(value as TrendScoutSort)}
            />
            <TrendSelect
              icon={<BarChart3 size={15} />}
              label="Min views"
              value={String(minViews)}
              options={[
                { id: '0', label: 'Any' },
                { id: '50000', label: '50K+' },
                { id: '100000', label: '100K+' },
                { id: '500000', label: '500K+' },
                { id: '1000000', label: '1M+' },
              ]}
              onChange={(value) => onMinViewsChange(Number(value))}
            />
            <TrendSelect
              icon={<Gauge size={15} />}
              label="Limit"
              value={String(limit)}
              options={[
                { id: '12', label: '12' },
                { id: '24', label: '24' },
                { id: '48', label: '48' },
              ]}
              onChange={(value) => onLimitChange(Number(value))}
            />
          </div>

          <button className="trend-run-button" type="button" disabled={isLoading} onClick={onRun}>
            <Sparkles size={18} className={isLoading ? 'spinning' : ''} />
            {isLoading ? 'Searching Trends' : 'Run Trend Scout'}
          </button>

          <div className={liveProvider?.status === 'ready' ? 'trend-provider-note ready' : 'trend-provider-note'}>
            <ShieldCheck size={15} />
            <span>
              {liveProvider?.status === 'ready'
                ? 'Live TikTok discovery is active. Results are saved to the local Adventure runtime database.'
                : 'Live discovery needs APIFY_TOKEN. Demo mode is labeled and should not be treated as market evidence.'}
            </span>
          </div>
        </div>

        <div className="trend-results-panel">
          <div className="trend-results-heading">
            <div>
              <span>Results</span>
              <strong>{posts.length ? `${posts.length} formats found` : 'No run yet'}</strong>
            </div>
            {result?.databasePath ? (
              <div className="trend-path-pill" title={result.databasePath}>
                <Database size={14} />
                Local DB
              </div>
            ) : null}
          </div>

          {error ? (
            <p className="trend-alert">
              <CircleAlert size={15} />
              {error}
            </p>
          ) : null}

          {result?.warnings?.map((warning) => (
            <p className="trend-alert subtle" key={warning}>
              <CircleAlert size={15} />
              {warning}
            </p>
          ))}

          {posts.length ? (
            <div className="trend-grid">
              {posts.map((post) => (
                <TrendResultCard
                  key={post.id}
                  post={post}
                  selected={selectedPost?.id === post.id}
                  onSelect={() => onSelectPost(post.id)}
                  onCreateBrief={() => onCreateBrief(post)}
                />
              ))}
            </div>
          ) : (
            <div className="trend-empty">
              <Target size={28} />
              <strong>Choose an app lane and run a scout pass.</strong>
              <span>Apify returns live TikTok evidence once the token is present. Local demo mode only tests the workflow.</span>
            </div>
          )}
        </div>

        <TrendBriefPanel
          post={selectedPost}
          brief={brief}
          onCreateBrief={onCreateBrief}
          onSendToComposer={onSendToComposer}
        />
      </section>
    </>
  )
}

function TrendSelect({
  icon,
  label,
  value,
  options,
  onChange,
}: {
  icon: ReactNode
  label: string
  value: string
  options: Array<{ id: string; label: string }>
  onChange: (value: string) => void
}) {
  return (
    <label className="trend-select">
      <span>
        {icon}
        {label}
      </span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function TrendResultCard({
  post,
  selected,
  onSelect,
  onCreateBrief,
}: {
  post: TrendPost
  selected: boolean
  onSelect: () => void
  onCreateBrief: () => void
}) {
  return (
    <article className={selected ? 'trend-card selected' : 'trend-card'} onClick={onSelect}>
      <div className="trend-card-top">
        <span className={post.sourceKind === 'real-scrape' ? 'source-kind live' : 'source-kind demo'}>
          {post.sourceKind === 'real-scrape' ? 'Live source' : 'Demo seed'}
        </span>
        <strong>{post.score.composite}</strong>
      </div>
      <h2>{post.format.hookType}</h2>
      <p>{post.text || post.format.firstThreeSeconds}</p>
      <div className="trend-metrics">
        <span>
          <TrendingUp size={14} />
          {formatMetric(post.stats.views)}
        </span>
        <span>
          <MousePointerClick size={14} />
          {engagementPercent(post)}
        </span>
        <span>
          <Share2 size={14} />
          {formatMetric(post.stats.shares)}
        </span>
      </div>
      <div className="trend-fingerprint">
        <span>{post.format.textOverlay}</span>
        <small>{post.format.visualBeat}</small>
      </div>
      <div className="trend-card-actions">
        <button type="button" onClick={(event) => { event.stopPropagation(); onCreateBrief() }}>
          <CopyCheck size={15} />
          Adapt
        </button>
        {post.url ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              window.studioHost?.openExternal(post.url)
            }}
          >
            <ExternalLink size={15} />
            Open
          </button>
        ) : null}
      </div>
    </article>
  )
}

function TrendBriefPanel({
  post,
  brief,
  onCreateBrief,
  onSendToComposer,
}: {
  post: TrendPost | null
  brief: TrendAdaptationBrief | null
  onCreateBrief: (post: TrendPost) => void
  onSendToComposer: (post: TrendPost) => void
}) {
  if (!post) {
    return (
      <aside className="trend-brief-panel">
        <span>Adaptation brief</span>
        <div className="trend-empty brief">
          <FileText size={25} />
          <strong>Select a format.</strong>
          <small>The brief will keep the winning structure tight while swapping in the Andromeda app truth.</small>
        </div>
      </aside>
    )
  }

  const activeBrief = brief?.postId === post.id ? brief : null

  return (
    <aside className="trend-brief-panel">
      <span>Adaptation brief</span>
      <h2>{activeBrief?.title ?? post.format.hookType}</h2>
      <p>{post.format.firstThreeSeconds}</p>

      <div className="brief-score-row">
        <BriefScore label="Score" value={post.score.composite} />
        <BriefScore label="Outlier" value={post.score.outlier} />
        <BriefScore label="Fit" value={post.score.fidelity} />
      </div>

      {activeBrief ? (
        <>
          <div className="brief-block">
            <strong>Fidelity rule</strong>
            <span>{activeBrief.mimicPlan.fidelityRule}</span>
          </div>
          <div className="brief-block">
            <strong>On-screen text</strong>
            {activeBrief.mimicPlan.onscreenText.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </div>
          <div className="brief-block">
            <strong>Beat sheet</strong>
            {activeBrief.mimicPlan.beatSheet.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </div>
          <div className="brief-actions">
            <button type="button" disabled={!post.url} onClick={() => onSendToComposer(post)}>
              <Play size={15} />
              Use source
            </button>
            {activeBrief.savedPath ? <small title={activeBrief.savedPath}>Saved locally</small> : null}
          </div>
        </>
      ) : (
        <>
          <div className="brief-block">
            <strong>Copy tightly</strong>
            <span>{post.format.visualBeat}</span>
            <span>{post.format.creatorAction}</span>
            <span>{post.format.productInsertion}</span>
          </div>
          <div className="brief-actions">
            <button type="button" onClick={() => onCreateBrief(post)}>
              <CopyCheck size={15} />
              Create brief
            </button>
            <button type="button" disabled={!post.url} onClick={() => onSendToComposer(post)}>
              <Play size={15} />
              Use source
            </button>
          </div>
        </>
      )}
    </aside>
  )
}

function BriefScore({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <strong>{Math.round(value)}</strong>
      <span>{label}</span>
    </div>
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

function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: string[]
  value: string
  onChange: (value: string) => void
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
  outputPreview,
  hostInfo,
}: {
  job?: RenderJob
  jobs: RenderJob[]
  sourcePreview: string | null
  outputPreview: string | null
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
        {outputPreview ? (
          <video src={outputPreview} controls />
        ) : sourcePreview ? (
          <video src={sourcePreview} muted controls />
        ) : (
          <div>
            <Play size={28} />
            <span>{job.status === 'complete' ? 'Output ready' : 'Renderer preview pending'}</span>
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
