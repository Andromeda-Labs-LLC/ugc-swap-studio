# Moderation And Disclosure

UGC Swap Studio should make safe behavior the default.

## Required Checks Before Rendering

- The reference face is owned, generated, licensed, or consented.
- The source video is owned, licensed, or approved for derivative use.
- The export is prepared for AI disclosure/provenance metadata.

## Disallowed Use

- Impersonation without permission.
- False endorsements.
- Public-figure likeness use without rights.
- Private-person likeness use without consent.
- Attempts to bypass platform synthetic-media labels.
- Uploading or processing sensitive private media without permission.

## Export Policy

Exports should support:

- Human-readable AI disclosure overlay.
- Manifest JSON.
- Optional C2PA/content-credentials signing in a later release.
- Job audit trail with provider, timestamp, preset, and guardrail state.

## URL Import

URL import should remain disabled by default. Upload-first behavior is safer because it forces the team to work from files they own, licensed assets, or approved source clips.
