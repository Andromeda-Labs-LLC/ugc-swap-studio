import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDownToLine,
  CheckCircle2,
  CircleAlert,
  Clock3,
  FileVideo,
  FolderKanban,
  Gauge,
  Image,
  Layers3,
  Link,
  Play,
  Plus,
  Settings,
  ShieldCheck,
  Sparkles,
  Upload,
  WandSparkles,
} from 'lucide-react'
import './App.css'
import {
  advanceJob,
  createMockRenderJob,
  downloadManifest,
  providerOptions,
  starterJobs,
  workflowStats,
  type ComplianceState,
  type ProviderId,
  type RenderJob,
  type RenderPreset,
} from './domain'

const navItems = [
  { label: 'Projects', icon: FolderKanban },
  { label: 'Face Library', icon: Image },
  { label: 'Source Videos', icon: FileVideo },
  { label: 'Render Queue', icon: Layers3 },
  { label: 'Settings', icon: Settings },
]

const defaultPreset: RenderPreset = {
  resolution: '720p',
  watermark: false,
  provenance: true,
  faceRestore: true,
  urlImport: false,
}

const defaultCompliance: ComplianceState = {
  faceConsent: false,
  sourceRights: false,
  aiDisclosure: true,
}

function App() {
  const [activeNav, setActiveNav] = useState('Projects')
  const [providerId, setProviderId] = useState<ProviderId>('mock-local')
  const [preset, setPreset] = useState<RenderPreset>(defaultPreset)
  const [compliance, setCompliance] = useState<ComplianceState>(defaultCompliance)
  const [jobs, setJobs] = useState<RenderJob[]>(starterJobs)
  const [referenceFace, setReferenceFace] = useState('owned-avatar-selfie.jpg')
  const [sourceVideo, setSourceVideo] = useState('ugc-hook-template.mp4')
  const [referencePreview, setReferencePreview] = useState<string | null>(null)
  const [sourcePreview, setSourcePreview] = useState<string | null>(null)
  const [sourceUrl, setSourceUrl] = useState('')
  const [hostInfo, setHostInfo] = useState<StudioHostInfo | null>(null)

  useEffect(() => {
    window.studioHost?.getHostInfo().then(setHostInfo).catch(() => setHostInfo(null))
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

  const readyToRender =
    Boolean(referenceFace) &&
    Boolean(sourceVideo || sourceUrl) &&
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
    setSourcePreview((existingPreview) => {
      if (existingPreview) URL.revokeObjectURL(existingPreview)
      return URL.createObjectURL(file)
    })
  }

  function startRenderJob() {
    if (!readyToRender) return
    const job = createMockRenderJob({
      providerId,
      referenceFace,
      sourceVideo: sourceUrl || sourceVideo,
      preset,
      compliance,
    })
    setJobs((currentJobs) => [job, ...currentJobs])
  }

  const activeJob = jobs[0]

  return (
    <main className="studio-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <WandSparkles size={21} />
          </div>
          <div>
            <strong>UGC Swap Studio</strong>
            <span>Local creator ops</span>
          </div>
        </div>

        <nav aria-label="Studio sections">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.label}
                className={activeNav === item.label ? 'nav-item active' : 'nav-item'}
                type="button"
                onClick={() => setActiveNav(item.label)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        <section className="sidebar-card">
          <span className="section-label">Render routing</span>
          <strong>{selectedProvider.name}</strong>
          <p>{selectedProvider.bestFor}</p>
        </section>

        <section className="host-card">
          <span>Workspace</span>
          <strong>{hostInfo?.packaged ? 'Packaged app' : 'Development build'}</strong>
          <small>{hostInfo?.userDataPath ?? 'Electron host pending'}</small>
        </section>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <h1>Generate AI UGC swaps</h1>
            <p>Upload an owned face, attach an owned source clip, route the job, and export with disclosure metadata.</p>
          </div>
          <button className="secondary-action" type="button">
            <Plus size={18} />
            New project
          </button>
        </header>

        <section className="stat-row" aria-label="Workflow status">
          {workflowStats.map((stat) => {
            const Icon = stat.icon
            return (
              <article className="stat" key={stat.label}>
                <Icon size={18} />
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
              </article>
            )
          })}
        </section>

        <section className="composer-grid">
          <div className="composer-main">
            <section className="panel">
              <PanelHeading
                icon={<Upload size={19} />}
                label="Inputs"
                title="Reference face and source video"
                detail="Keep v1 narrow: one face, one short video, one render."
              />
              <div className="upload-grid">
                <UploadTile
                  title="Reference face"
                  description="Owned avatar, founder clip, licensed creator, or consented talent."
                  accept="image/*"
                  fileName={referenceFace}
                  preview={referencePreview}
                  icon={<Image size={24} />}
                  onFile={handleReferenceUpload}
                />
                <UploadTile
                  title="Source video"
                  description="Upload-first by default. URL import stays gated for rights review."
                  accept="video/mp4,video/quicktime,video/*"
                  fileName={sourceVideo}
                  preview={sourcePreview}
                  icon={<FileVideo size={24} />}
                  onFile={handleSourceUpload}
                />
              </div>

              <div className="url-row">
                <label htmlFor="source-url">
                  <Link size={16} />
                  Optional public URL
                </label>
                <input
                  id="source-url"
                  disabled={!preset.urlImport}
                  value={sourceUrl}
                  onChange={(event) => {
                    setSourceUrl(event.target.value)
                    if (event.target.value) setSourceVideo('')
                  }}
                  placeholder={preset.urlImport ? 'Paste licensed source URL' : 'Enable URL import in preset controls'}
                />
              </div>
            </section>

            <section className="panel">
              <PanelHeading
                icon={<ShieldCheck size={19} />}
                label="Guardrails"
                title="Rights and disclosure checks"
                detail="Required before any provider can receive media."
              />
              <div className="check-list">
                <CheckRow
                  label="Reference face is owned, generated, licensed, or consented."
                  checked={compliance.faceConsent}
                  onChange={(value) => setCompliance((current) => ({ ...current, faceConsent: value }))}
                />
                <CheckRow
                  label="Source video is owned, licensed, or approved for derivative use."
                  checked={compliance.sourceRights}
                  onChange={(value) => setCompliance((current) => ({ ...current, sourceRights: value }))}
                />
                <CheckRow
                  label="Export should include AI disclosure/provenance metadata."
                  checked={compliance.aiDisclosure}
                  onChange={(value) => setCompliance((current) => ({ ...current, aiDisclosure: value }))}
                />
              </div>
            </section>

            <section className="panel">
              <PanelHeading
                icon={<Gauge size={19} />}
                label="Preset"
                title="Provider and export controls"
                detail="All cloud integrations route through adapters, never UI code."
              />
              <div className="provider-grid">
                {providerOptions.map((provider) => {
                  const Icon = provider.icon
                  return (
                    <button
                      key={provider.id}
                      className={provider.id === providerId ? 'provider-card selected' : 'provider-card'}
                      type="button"
                      onClick={() => setProviderId(provider.id)}
                    >
                      <span className="provider-icon">
                        <Icon size={18} />
                      </span>
                      <strong>{provider.shortName}</strong>
                      <small>{provider.mode}</small>
                    </button>
                  )
                })}
              </div>

              <div className="control-grid">
                <SegmentedControl
                  label="Resolution"
                  options={['720p', '1080p']}
                  value={preset.resolution}
                  onChange={(resolution) => setPreset((current) => ({ ...current, resolution }))}
                />
                <Toggle
                  label="Watermark"
                  checked={preset.watermark}
                  onChange={(watermark) => setPreset((current) => ({ ...current, watermark }))}
                />
                <Toggle
                  label="Provenance"
                  checked={preset.provenance}
                  onChange={(provenance) => setPreset((current) => ({ ...current, provenance }))}
                />
                <Toggle
                  label="Face restore"
                  checked={preset.faceRestore}
                  onChange={(faceRestore) => setPreset((current) => ({ ...current, faceRestore }))}
                />
                <Toggle
                  label="URL import"
                  checked={preset.urlImport}
                  onChange={(urlImport) => setPreset((current) => ({ ...current, urlImport }))}
                />
              </div>

              <button
                className="primary-action"
                type="button"
                disabled={!readyToRender}
                onClick={startRenderJob}
              >
                <Sparkles size={19} />
                Generate swap
              </button>
              {!readyToRender && (
                <p className="blocked-note">
                  <CircleAlert size={15} />
                  Add inputs and complete all guardrail checks to enable rendering.
                </p>
              )}
            </section>
          </div>

          <aside className="queue-panel">
            <PanelHeading
              icon={<Clock3 size={19} />}
              label="Queue"
              title="Render jobs"
              detail={`${jobs.length} job${jobs.length === 1 ? '' : 's'} in local history`}
            />

            {activeJob && (
              <article className="active-job">
                <div className="active-job-top">
                  <div>
                    <span className="pill">{activeJob.status}</span>
                    <h2>{activeJob.title}</h2>
                  </div>
                  <strong>{activeJob.progress}%</strong>
                </div>
                <div className="progress-track">
                  <div style={{ width: `${activeJob.progress}%` }} />
                </div>
                <div className="preview-frame">
                  {sourcePreview ? (
                    <video src={sourcePreview} muted controls />
                  ) : (
                    <div className="mock-preview">
                      <Play size={30} />
                      <span>{activeJob.status === 'complete' ? 'Mock output ready' : 'Renderer preview pending'}</span>
                    </div>
                  )}
                </div>
                <button
                  className="download-action"
                  type="button"
                  disabled={activeJob.status !== 'complete'}
                  onClick={() => downloadManifest(activeJob)}
                >
                  <ArrowDownToLine size={17} />
                  Download manifest
                </button>
              </article>
            )}

            <div className="job-list">
              {jobs.map((job) => (
                <article className="job-row" key={job.id}>
                  <div>
                    <strong>{job.title}</strong>
                    <span>{job.sourceVideo}</span>
                  </div>
                  <JobStatusIcon status={job.status} />
                </article>
              ))}
            </div>

            {activeJob && (
              <section className="audit-box">
                <span className="section-label">Latest audit</span>
                <ul>
                  {activeJob.audit.slice(-4).map((entry) => (
                    <li key={entry}>{entry}</li>
                  ))}
                </ul>
              </section>
            )}
          </aside>
        </section>
      </section>
    </main>
  )
}

function PanelHeading({
  icon,
  label,
  title,
  detail,
}: {
  icon: React.ReactNode
  label: string
  title: string
  detail: string
}) {
  return (
    <div className="panel-heading">
      <div className="heading-icon">{icon}</div>
      <div>
        <span className="section-label">{label}</span>
        <h2>{title}</h2>
        <p>{detail}</p>
      </div>
    </div>
  )
}

function UploadTile({
  title,
  description,
  accept,
  fileName,
  preview,
  icon,
  onFile,
}: {
  title: string
  description: string
  accept: string
  fileName: string
  preview: string | null
  icon: React.ReactNode
  onFile: (files: FileList | null) => void
}) {
  return (
    <label className="upload-tile">
      <input type="file" accept={accept} onChange={(event) => onFile(event.target.files)} />
      <span className="upload-icon">{icon}</span>
      <span>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <span className="file-pill">{fileName || 'Choose file'}</span>
      {preview && title === 'Reference face' && <img src={preview} alt="" />}
    </label>
  )
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
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: Array<RenderPreset['resolution']>
  value: RenderPreset['resolution']
  onChange: (value: RenderPreset['resolution']) => void
}) {
  return (
    <div className="segmented">
      <span>{label}</span>
      <div>
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
    </div>
  )
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="toggle">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <i />
    </label>
  )
}

function JobStatusIcon({ status }: { status: RenderJob['status'] }) {
  if (status === 'complete') return <CheckCircle2 className="status-complete" size={18} />
  if (status === 'blocked') return <CircleAlert className="status-blocked" size={18} />
  return <Clock3 className="status-running" size={18} />
}

export default App
