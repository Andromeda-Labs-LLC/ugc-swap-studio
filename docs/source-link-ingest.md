# Source Link Ingest

CopyTok can analyze a pasted source-post URL before creating a render job.

## Current Behavior

- Validates that the pasted value is an `http` or `https` URL.
- Uses local `yt-dlp` from the Electron host process.
- Fetches source metadata without downloading the full video.
- Attempts to fetch English caption or auto-caption text when available.
- Downloads and clips permitted source videos to the first 30 seconds during preparation.
- Normalizes prepared sources to provider-friendly MP4 with FFmpeg when available.
- Extracts mono 16 kHz audio for local transcript fallback.
- Reports audio-track availability as a voice/retained-audio consent gate.
- Stores a source summary and provider-ready packet in the mock render manifest.

## Current Limits

- Some platforms require login, cookies, or may block automated fetching.
- Caption extraction depends on captions being available to `yt-dlp`.
- This does not grant rights to copy a third-party post.
- Real video rendering still belongs in a provider adapter or local worker.
- Some source sites can fail if they require login, region access, or anti-bot verification.

## Provider Contract

A future render adapter should receive:

- source URL
- source platform and title
- duration
- thumbnail URL when available
- transcript text or transcript status
- normalized local MP4 path
- extracted audio path when available
- audio/voice consent status
- selected output preset
- rights and AI-disclosure checks

Voice cloning, retained source audio, and real-person likeness use require explicit permission before render.
