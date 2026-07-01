# Architecture

CopyTok is intentionally split into a local app shell and provider adapters.

## Layers

1. **Electron host**
   - Owns the desktop window.
   - Provides safe host metadata through preload IPC.
   - Owns source-link analysis through `yt-dlp` so the renderer does not need social-platform credentials or vendor keys.
   - Later owns local filesystem workspace helpers.

2. **React renderer**
   - Owns the interactive workflow.
   - Handles uploads, source-analysis results, rights checks, queue display, preset controls, and output review.
   - Does not store provider secrets or call video vendors directly.

3. **Render provider contract**
   - Normalized job request.
   - Provider route selection.
   - Status polling.
   - Output artifact handoff.
   - Audit/provenance manifest generation.

4. **Future worker/service layer**
   - Local FaceFusion/FFmpeg worker, cloud API proxy, or Supabase Edge Function.
   - Responsible for any secret-bearing network calls.

## V0.1 Flow

```text
User opens Mac app
  -> adds reference face
  -> uploads a source video or pastes and analyzes a permitted source URL
  -> source analyzer fetches post metadata and caption text when available
  -> completes rights and disclosure checks
  -> selects provider route
  -> creates local render job
  -> mock provider advances job status
  -> manifest export records job, preset, and guardrail state
```

## Future Real Render Flow

```text
React renderer
  -> Electron IPC or local API
  -> source-link analyzer for permitted URL references
  -> provider adapter
  -> local worker or cloud vendor
  -> status polling / webhook
  -> output artifact stored locally
  -> review and download
```

The provider adapter is the main extension point. The app should support multiple providers without reshaping the user-facing workflow.
