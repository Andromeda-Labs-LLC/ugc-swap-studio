# Provider Routing

CopyTok uses a direct-first provider strategy:

1. Prefer the cheapest direct provider API when the vendor account exposes a clear upload, submit, poll, and download contract.
2. Use fal Seedance as the immediately usable Seedance lane because the local Mac already has a working `FAL_KEY` and the logged-in BytePlus/ModelArk account is currently blocked by country/region.
3. Use fal/PixVerse as the fast one-click swap testing fallback.
4. Use HeyGen through the authenticated HeyGen CLI for talking-head and presenter clips.
5. Use OpenAI GPT Image 2 only for still assets, first-frame keyframes, carousel images, and avatar source images.
6. Keep FFmpeg as the invisible finishing engine after provider generation.

Renderer UI code never calls provider APIs directly. Secrets live in the macOS Keychain, shell environment, vendor CLI auth, or future backend secret stores.

## Current Provider Lanes

| UI chip | Backend route | Current status | Use |
| --- | --- | --- | --- |
| Seedance | `fal-seedance-reference` | Live through fal with the installed `FAL_KEY` | Operational Seedance reference-to-video route while direct BytePlus access is region-blocked |
| Seedance Direct | `direct-seedance-2` | Live SDK route when a BytePlus ModelArk key is installed | High-quality multimodal video when direct pricing beats middlemen |
| Kling | `direct-kling-3` | Live SDK route when Kling access and secret keys are installed | Direct Kling motion-control or image-to-video jobs using first-frame avatar stills |
| PixVerse | `fal-pixverse-swap` | Live through fal | Fast source-video/person-swap testing |
| HeyGen | `heygen-cloud` | Live through authenticated HeyGen CLI when CLI auth is valid | Talking-head UGC and presenter videos |
| Image | `openai-image-2` | Live only when `OPENAI_API_KEY` exists; otherwise use ChatGPT Pro manually | High-quality still images and first-frame assets |

## Keychain Accounts

Use service `CopyTok`.

```text
FAL_KEY
APIFY_TOKEN
KLING_ACCESS_KEY
KLING_SECRET_KEY
KLING_MODEL
KLING_BASE_URL
ARK_API_KEY
SEEDANCE_API_KEY
SEEDANCE_API_BASE_URL
SEEDANCE_MODEL
BYTEPLUS_API_KEY
OPENAI_API_KEY
```

HeyGen is currently authenticated through the local `heygen` CLI, so no raw HeyGen key is required for the app path.

## Direct Provider Defaults

Kling direct defaults to `kling-v3.0-motion-control` so a source action video can drive the avatar performance. If no source video is supplied, the backend can be pointed at an image-to-video model with `KLING_MODEL`.

Seedance direct defaults to BytePlus ModelArk at `https://ark.ap-southeast.bytepluses.com/api/v3` using `dreamina-seedance-2-0-260128`. `ARK_API_KEY` is preferred; `SEEDANCE_API_KEY` and `BYTEPLUS_API_KEY` are accepted aliases. As of the July 2026 setup attempt, the logged-in US BytePlus account shows: "We apologize, but this product is currently not available in your country/region." Keep `fal-seedance-reference` as the active lane until BytePlus enables ModelArk for the account or Commander authorizes a non-US eligible business/account path.

## Batch Variants

CopyTok supports one, two, or three render variants per job. Each variant must have a real first-frame avatar image for video providers. Prompt-only avatar recipes are creative presets, not renderable files, until the generated still is saved and attached.

## Direct Provider Rule

Do not silently fall back from direct Kling or direct Seedance to fal. If direct credentials or endpoint config are missing, the app should save a provider packet and return a blocked result with the missing item named clearly.

## FFmpeg Finish

Provider output is not the final marketing asset. The render packet includes an FFmpeg finish plan with hard-cut rules, caption style, export target, and campaign output folder under:

```text
/Volumes/Adventure/Andromeda Labs/Marketing/CopyTok
```
