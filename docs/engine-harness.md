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
  -> verify rights and disclosure checks
  -> analyze pasted source URL if needed
  -> prepare source URL if needed
  -> clip to the first 30 seconds
  -> normalize source video to provider-friendly MP4
  -> extract audio for transcript fallback
  -> create provider-ready render packet
  -> hand packet to fal/PixVerse/other adapter
  -> poll or receive webhook
  -> store and show result video
```

## Current Provider Packets

The engine currently emits provider-ready packets without sending secrets:

- `falPixverseSwap`: `fal-ai/pixverse/swap`
- `pixverseDirectSwap`: direct PixVerse swap route placeholder
- `localFaceSwapLab`: local evaluation route placeholder

Secrets belong in the host/backend environment only. They must not be committed, exposed in React, or shown in public screenshots.

## Cost Guardrail

Prepared URL sources are clipped to 30 seconds by default. This keeps render cost predictable and aligns with short-form source-video limits from common video-generation providers.
