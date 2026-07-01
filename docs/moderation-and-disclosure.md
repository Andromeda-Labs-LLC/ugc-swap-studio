# Moderation And Disclosure

CopyTok should make safe behavior the default.

## Required Checks Before Rendering

- The reference face is owned, generated, licensed, or consented.
- The source video is owned, licensed, or approved for derivative use.
- Any transcript, audio, voice, or gesture reference from a source link is owned, licensed, or explicitly permitted.
- The export is prepared for AI disclosure/provenance metadata.

## Disallowed Use

- Impersonation without permission.
- False endorsements.
- Public-figure likeness use without rights.
- Private-person likeness use without consent.
- Voice cloning, voice imitation, or retained source audio without permission.
- Attempts to bypass platform synthetic-media labels.
- Uploading or processing sensitive private media without permission.

## Export Policy

Exports should support:

- Human-readable AI disclosure overlay.
- Manifest JSON.
- Optional C2PA/content-credentials signing in a later release.
- Job audit trail with provider, timestamp, preset, and guardrail state.

## URL Import

URL import is allowed only as a rights-gated source-analysis step. A pasted link should be analyzed before rendering so the job manifest can record the post title, platform, URL, caption/transcript status, audio detection, and consent warning.

The analyzer should not be treated as permission to copy a third-party post. It is a preparation step for owned, licensed, or otherwise permitted references.
