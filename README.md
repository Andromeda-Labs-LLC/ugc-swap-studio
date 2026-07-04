# CopyTok

CopyTok is a self-hosted desktop workflow app for researching, cloning, and generating AI-assisted UGC variants from owned, licensed, generated, or explicitly permitted source posts. It is designed for Andromeda Labs marketing work: scout a proven format, attach first-frame avatars, choose a provider, and produce campaign-specific creative quickly.

This project is a clean-room workflow clone of public-facing face-swap creator tools. It does not copy private code, private APIs, visual assets, or brand identity from any third-party product.

## Current v0.1 Scope

- Electron + React desktop app for macOS.
- Local project shell with first-frame avatar and source-video intake.
- Source-link analysis for permitted TikTok, Instagram, YouTube Shorts, and other URLs supported by `yt-dlp`.
- Source-link preparation that clips, downloads, normalizes, and inspects the reference video.
- Campaign recipes for SnapGLP and Tone Clone.
- Saved trend-format presets, including reaction hooks, talking heads, faceless demos, carousels, rankings, tutorials, before/after, objection-bust, POV, and app showcase formats.
- One-, two-, or three-variant generation planning with per-variant avatar image attachment.
- Provider-ready render packet generation for direct Seedance, direct Kling, fal/PixVerse, HeyGen, OpenAI GPT Image 2, and local evaluation adapters.
- Caption/transcript extraction when source captions are available.
- Local Whisper transcript fallback when `whisper.cpp` and a model are available.
- Audio/voice readiness reporting with consent warnings.
- Trend Scout module for app-specific TikTok format discovery, ranking, and adaptation briefs.
- Provider-neutral render routing.
- Live fal/PixVerse route when `FAL_KEY` is present.
- HeyGen Video Agent route through the authenticated local `heygen` CLI.
- OpenAI GPT Image 2 high-quality still route when `OPENAI_API_KEY` is present.
- Direct Seedance and direct Kling SDK routes that block clearly until direct vendor credentials are installed.
- Job history, audit trail, preview area, and downloadable job manifest.
- FFmpeg finish-plan generation for hard-cut MP4 exports under the Adventure marketing tree.

The immediately executable video-swap path is fal/PixVerse because the local Mac has a working fal key. Direct Kling and Seedance are intentionally direct-only: they do not silently fall back to a middleman when direct credentials are missing.

## Run Locally

```bash
npm install
npm run electron:dev
```

For source-link analysis and preparation, install the local media helpers on the Mac:

```bash
brew install yt-dlp
brew install ffmpeg
brew install whisper-cpp
```

Optional enhancement hooks can later use Real-ESRGAN and rembg. They are detected if installed but are not required for the core flow.

## Build The Mac App

```bash
npm run app:dir
open "release/mac-arm64/CopyTok.app"
```

The generated app is unsigned and intended for local internal use.

## Provider Boundary

Renderer UI code should never call vendor APIs directly. Add real video providers behind adapter modules that accept a normalized job payload and return provider job/status/output records. Keep API keys out of the repo and out of client-rendered code.

See [docs/provider-routing.md](docs/provider-routing.md).
See [docs/engine-harness.md](docs/engine-harness.md).
See [docs/trend-scout.md](docs/trend-scout.md).

## Local Output Root

Campaign packets, generated outputs, avatar-library assets, and format presets are organized under:

```text
/Volumes/Adventure/Andromeda Labs/Marketing/CopyTok
```

## Guardrails

This tool is for owned, licensed, generated, or consented media only. It should not be used to impersonate people, clone voices without permission, create misleading endorsements, evade platform synthetic-media labels, or process private media without permission.

See [docs/moderation-and-disclosure.md](docs/moderation-and-disclosure.md).

## Model And Weight Policy

The public repository does not bundle model weights. Some face-swap and face-recognition models have non-commercial or research-only restrictions. Any local model setup must require an explicit license review and acknowledgement.

See [models/MANIFEST.md](models/MANIFEST.md).
