# CopyTok Trend Scout

Trend Scout is CopyTok's SpyTok-style research module for finding proven short-form social formats and turning them into production briefs for Andromeda Labs apps.

## What It Does

- Selects an Andromeda app lane such as SnapGLP or ToneClone.
- Runs a search against a pluggable TikTok trend provider.
- Normalizes returned posts into a consistent format: source URL, author, caption text, metrics, hashtags, music, score, and format fingerprint.
- Ranks results by CopyTok score, views, engagement, recency, or format fit.
- Saves each run and selected adaptation brief to a local runtime database.
- Sends real source URLs back into the existing CopyTok source-analysis workflow.

## Runtime Storage

Runtime data is local-only and ignored by Git:

```text
/Volumes/Adventure/Andromeda Labs/SaaS/UGC Swap Studio/.local-runtime/
```

This folder may contain trend runs, normalized source caches, render packets, provider payloads, downloaded outputs, and adaptation briefs. It is intentionally not committed.

## Providers

### Local Demo

Local demo mode exists only to test the UI and adaptation flow. It is labeled as demo data and must not be treated as market evidence.

### Apify TikTok

The live adapter uses Apify's TikTok scraper actor through the Electron backend. The React UI never receives the token.

Expected secret:

```text
Service: CopyTok
Account: APIFY_TOKEN
```

Environment fallback:

```text
APIFY_TOKEN
```

Do not commit the token, paste it into chat, or add it to frontend code.

## Scoring

CopyTok scores real results with:

- view volume
- engagement rate
- velocity estimate from age and views
- format-fit estimate against the selected app lane

The current outlier score is an estimate unless the provider supplies account-average baselines. The UI labels local demo seeds separately so they cannot be confused with real scraped evidence.

## Adaptation Standard

A useful trend should preserve:

- first three seconds
- face/reaction/gesture
- on-screen text structure
- edit rhythm
- proof moment
- CTA shape

The Andromeda version should change product-specific proof, legal-sensitive claims, rights-sensitive voice/audio choices, and anything that implies endorsement or affiliation.
