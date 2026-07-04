# Engine Harness

CopyTok uses a small original orchestration layer around permissive/open-source media tools and provider adapters.

## Included Local Spine

- `yt-dlp`: source-post metadata, captions, and permitted source-video download.
- `FFmpeg` / `FFprobe`: trim, normalize, inspect, encode, and extract audio.
- `whisper.cpp`: local transcript fallback when captions are missing and a model is available.
- `Real-ESRGAN`: optional future upscale/restoration hook.
- `rembg`: optional future avatar/background cleanup hook.

The repo does not vendor GPL, AGPL, OpenRAIL, or non-commercial model code. Candidate engines such as FaceFusion, VisoMaster, Wav2Lip, and MobileFaceSwap can be evaluated separately, but only permissive or legally cleared components should be embedded into CopyTok.

## One-Button Target Flow

```text
User clicks Generate Swap
  -> select campaign recipe and saved trend format
  -> select one, two, or three avatar variants
  -> attach a first-frame still for each render variant
  -> analyze pasted source URL if needed
  -> prepare source URL if needed
  -> clip to the first 15 seconds
  -> normalize source video to provider-friendly MP4
  -> extract audio for transcript fallback
  -> create provider-ready render packet
  -> hand packet to direct provider, fal/PixVerse fallback, HeyGen CLI, or image generator
  -> poll or receive webhook
  -> store raw provider result
  -> finish with FFmpeg according to the packet plan
```

## Current Provider Packets

The engine emits provider-ready packets for:

- `directSeedance2`: direct BytePlus/Seedance packet and config gate
- `directKling3`: direct Kling image-to-video packet and config gate
- `pixverseDirectSwap`: direct PixVerse swap route placeholder
- `falPixverseSwap`: live fal route when `FAL_KEY` is present
- `heygenVideoAgent`: authenticated HeyGen CLI route
- `openAiImage2`: GPT Image 2 high-quality still route when `OPENAI_API_KEY` is present
- `localFaceSwapLab`: local evaluation route placeholder

Secrets belong in the host/backend environment only. They must not be committed, exposed in React, or shown in public screenshots.

## FFmpeg Finish Policy

FFmpeg is an invisible backend finisher, not a manual editing surface. The render packet writes an export plan with:

- hard cuts only
- native cadence preservation where possible
- H.264/AAC MP4 output
- Rec.709, `yuv420p`, square pixels, `+faststart`
- CRF-based export rather than low fixed bitrate
- caption burn-in style selected in the UI

Marketing or Codex agents should create briefs, scripts, and shot logic. The app should run deterministic FFmpeg commands from the packet plan.

## Cost Guardrail

Prepared URL sources are clipped to 15 seconds by default. This keeps render cost predictable and aligns with short-form source-video limits from common video-generation providers.
