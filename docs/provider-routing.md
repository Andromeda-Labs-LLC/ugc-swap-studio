# Provider Routing

CopyTok uses a direct-first provider strategy:

1. Prefer the cheapest direct provider API when the vendor account exposes a clear upload, submit, poll, and download contract.
2. Use fal/PixVerse as the immediately usable fallback for one-click swap testing because the local Mac already has a working `FAL_KEY`.
3. Use HeyGen through the authenticated HeyGen CLI for talking-head and presenter clips.
4. Use OpenAI GPT Image 2 only for still assets, first-frame keyframes, carousel images, and avatar source images.
5. Keep FFmpeg as the invisible finishing engine after provider generation.

Renderer UI code never calls provider APIs directly. Secrets live in the macOS Keychain, shell environment, vendor CLI auth, or future backend secret stores.

## Current Provider Lanes

| UI chip | Backend route | Current status | Use |
| --- | --- | --- | --- |
| Seedance | `direct-seedance-2` | Packet/config-ready; needs BytePlus/Seedance credentials and exact endpoint config | High-quality multimodal video when direct pricing beats middlemen |
| Kling | `direct-kling-3` | Packet/config-ready; needs Kling credentials and exact task endpoint config | Direct image-to-video from first-frame avatar stills |
| PixVerse | `fal-pixverse-swap` | Live through fal | Fast source-video/person-swap testing |
| HeyGen | `heygen-cloud` | Live through authenticated HeyGen CLI when CLI auth is valid | Talking-head UGC and presenter videos |
| Image | `openai-image-2` | Live only when `OPENAI_API_KEY` exists; otherwise use ChatGPT Pro manually | High-quality still images and first-frame assets |

## Keychain Accounts

Use service `CopyTok`.

```text
FAL_KEY
APIFY_TOKEN
KLING_API_KEY
KLING_CREATE_URL
KLING_STATUS_URL_TEMPLATE
SEEDANCE_API_KEY
SEEDANCE_API_BASE_URL
SEEDANCE_CREATE_URL
SEEDANCE_STATUS_URL_TEMPLATE
BYTEPLUS_API_KEY
OPENAI_API_KEY
```

HeyGen is currently authenticated through the local `heygen` CLI, so no raw HeyGen key is required for the app path.

## Batch Variants

CopyTok supports one, two, or three render variants per job. Each variant must have a real first-frame avatar image for video providers. Prompt-only avatar recipes are creative presets, not renderable files, until the generated still is saved and attached.

## Direct Provider Rule

Do not silently fall back from direct Kling or direct Seedance to fal. If direct credentials or endpoint config are missing, the app should save a provider packet and return a blocked result with the missing item named clearly.

## FFmpeg Finish

Provider output is not the final marketing asset. The render packet includes an FFmpeg finish plan with hard-cut rules, caption style, export target, and campaign output folder under:

```text
/Volumes/Adventure/Andromeda Labs/Marketing/CopyTok
```
