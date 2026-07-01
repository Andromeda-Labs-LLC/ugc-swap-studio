# Architecture

UGC Swap Studio is intentionally split into a local app shell and provider adapters.

## Layers

1. **Electron host**
   - Owns the desktop window.
   - Provides safe host metadata through preload IPC.
   - Later owns local filesystem workspace helpers.

2. **React renderer**
   - Owns the interactive workflow.
   - Handles uploads, rights checks, queue display, preset controls, and output review.
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
  -> adds source video or optional URL
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
  -> provider adapter
  -> local worker or cloud vendor
  -> status polling / webhook
  -> output artifact stored locally
  -> review and download
```

The provider adapter is the main extension point. The app should support multiple providers without reshaping the user-facing workflow.
