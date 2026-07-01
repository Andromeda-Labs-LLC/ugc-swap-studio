# Provider Routing Assessment

## Recommendation

Use a provider-neutral routing layer first. Keep the UI stable and swap the video engine behind it.

For Andromeda Labs, the best near-term provider path is:

1. **Pixverse-style video swap API if stable API access is available**
   - Best conceptual match for the SwapTok-style workflow: source video plus reference identity/image.
   - Likely strongest fit for short-form face-swap variants.
   - Main risk: public API availability, terms, cost, latency, and commercial-use clarity.

2. **HeyGen for talking-avatar UGC**
   - Strong fit when the source asset is a presenter/ad read rather than a viral-template swap.
   - Better for scripted founder/creator style clips, avatar workflows, and consistent brand-safe talking heads.
   - Not a perfect replacement for arbitrary source-video face swapping.

3. **Replicate as an experimentation router**
   - Good when we need quick access to hosted open models.
   - Useful for comparing quality and speed before committing.
   - Requires careful review of each model license and output policy.

4. **Local FaceFusion worker**
   - Best privacy posture.
   - Good for internal experiments and owned media.
   - Main risks: model licensing, local GPU speed, output quality, and setup complexity.

5. **Runway/Pika/Luma-style video APIs**
   - Better for text/image-to-video generation and stylized ad assets.
   - Less direct for identity-preserving face swap unless their API exposes the exact needed workflow.

## Adapter Requirements

Each provider adapter should implement:

- Accept a normalized source-link analysis payload when the user uses a URL instead of a local video file.
- Create job.
- Poll status.
- Fetch output.
- Normalize errors.
- Emit cost/latency metadata.
- Attach a guardrail/provenance manifest.

No provider key should ever be present in React code, screenshots, committed files, or public docs.

## Decision Criteria

- Can it accept a reference face/image and source video?
- Can it accept source metadata, captions/transcript, and action timing from a URL analyzer?
- Does it preserve motion, audio, framing, and timing?
- Does voice or retained source audio require separate consent, licensing, or provider-side policy checks?
- Does the license permit Andromeda marketing use?
- Does it support commercial output?
- Is latency acceptable for batch creative testing?
- Is pricing predictable enough for repeated variants?
- Can outputs be labeled/provenance-tagged?
- Can we delete input/output assets?

## Current Product Stance

The v0.1 app ships with a mock provider only. This is intentional. It keeps the workflow usable and testable without prematurely committing to vendor terms, model licenses, or secret-bearing code paths.
