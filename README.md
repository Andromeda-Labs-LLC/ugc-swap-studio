# UGC Swap Studio

UGC Swap Studio is a self-hosted desktop workflow app for creating AI-assisted UGC video variants. It is designed for small marketing teams that need a simple local queue, explicit rights checks, and a clean adapter boundary for future video-generation providers.

This project is a clean-room workflow clone of public-facing face-swap creator tools. It does not copy private code, private APIs, visual assets, or brand identity from any third-party product.

## Current v0.1 Scope

- Electron + React desktop app for macOS.
- Local project shell with reference-face and source-video intake.
- Rights, consent, and AI-disclosure guardrail checks.
- Provider-neutral render routing.
- Mock local renderer that simulates queue progress.
- Job history, audit trail, preview area, and downloadable job manifest.
- Adapter slots for FaceFusion local, Pixverse cloud, HeyGen cloud, and Replicate-hosted model routing.

The app does not yet perform real face swaps. The first release proves the workflow, UX, and provider architecture before secrets or external APIs are wired in.

## Run Locally

```bash
npm install
npm run electron:dev
```

## Build The Mac App

```bash
npm run app:dir
open "release/mac-arm64/UGC Swap Studio.app"
```

The generated app is unsigned and intended for local internal use.

## Provider Boundary

Renderer UI code should never call vendor APIs directly. Add real video providers behind adapter modules that accept a normalized job payload and return provider job/status/output records. Keep API keys out of the repo and out of client-rendered code.

See [docs/provider-routing.md](docs/provider-routing.md).

## Guardrails

This tool is for owned, licensed, generated, or consented media only. It should not be used to impersonate people, create misleading endorsements, evade platform synthetic-media labels, or process private media without permission.

See [docs/moderation-and-disclosure.md](docs/moderation-and-disclosure.md).

## Model And Weight Policy

The public repository does not bundle model weights. Some face-swap and face-recognition models have non-commercial or research-only restrictions. Any local model setup must require an explicit license review and acknowledgement.

See [models/MANIFEST.md](models/MANIFEST.md).
