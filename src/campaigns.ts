import type { TrendAppProfileId } from './trendScout'

export type CampaignAppId = TrendAppProfileId
export type CaptionStyleId =
  | 'tiktok-bold'
  | 'karaoke'
  | 'clean-minimal'
  | 'high-contrast'
  | 'creator-bubble'
  | 'lower-third'
  | 'big-hook'
export type FormatCategoryId =
  | 'reaction-hook'
  | 'talking-head'
  | 'faceless-demo'
  | 'slideshow-carousel'
  | 'ranking-list'
  | 'tutorial'
  | 'before-after'
  | 'objection-bust'
  | 'pov-story'
  | 'app-showcase'

export interface CampaignRecipe {
  id: CampaignAppId
  name: string
  shortName: string
  accent: string
  repoPath: string
  marketingRoot: string
  assetRoots: string[]
  screenshotRoots: string[]
  appStoreStatus: string
  oneLineTruth: string
  audience: string[]
  emotionalPromise: string
  tone: string[]
  approvedCtas: string[]
  productTruths: string[]
  claimBoundaries: string[]
  bannedAngles: string[]
  defaultFormatId: FormatCategoryId
  defaultTrendPresetId: string
  defaultQuery: string
  sourceNotes: string[]
}

export interface TrendPreset {
  id: string
  name: string
  source: 'seed' | 'trend-scout-save'
  hookPattern: string
  firstThreeSeconds: string
  visualBehavior: string
  captionStyleId: CaptionStyleId
  musicNote: string
  promptTemplate: string
}

export interface FormatCategory {
  id: FormatCategoryId
  name: string
  summary: string
  bestFor: string
  trendPresets: TrendPreset[]
}

export interface AvatarRecipe {
  id: string
  name: string
  appFit: CampaignAppId | 'shared'
  style: string
  imagePath?: string
  prompt: string
  usageNote: string
}

export interface CaptionStyle {
  id: CaptionStyleId
  name: string
  summary: string
  burnInRole: string
}

const marketingRoot = '/Volumes/Adventure/Andromeda Labs/Marketing/CopyTok'

export const campaignRecipes: CampaignRecipe[] = [
  {
    id: 'snapglp',
    name: 'SnapGLP',
    shortName: 'GLP',
    accent: '#5C7282',
    repoPath: '/Volumes/Adventure/Andromeda Labs/GLP1',
    marketingRoot: `${marketingRoot}/SnapGLP`,
    assetRoots: [
      '/Volumes/Adventure/Andromeda Labs/ASSETS/SnapGLP',
      '/Volumes/Adventure/Andromeda Labs/GLP1/Artifacts',
      '/Volumes/Adventure/Andromeda Labs/Marketing/Design Language/SnapGLP',
    ],
    screenshotRoots: [
      '/Volumes/Adventure/Andromeda Labs/ASSETS/SnapGLP/Screenshots',
      '/Volumes/Adventure/Andromeda Labs/GLP1/Artifacts/Screenshots',
    ],
    appStoreStatus: 'Live/review-active launch lane; health-adjacent claims require conservative public copy.',
    oneLineTruth:
      'SnapGLP helps people using GLP-1 or peptide weight-loss medication make calmer next-meal decisions from a food snap, label, barcode, or meal input.',
    audience: [
      'Adults using GLP-1 or peptide weight-loss medication.',
      'People whose appetite, fullness, nausea sensitivity, or meal planning feels newly complicated.',
      'Users who want practical food guidance without a shame-based diet coach.',
    ],
    emotionalPromise: 'Food can feel weird now. SnapGLP makes the next choice feel less loaded and more practical.',
    tone: ['calm', 'plain-language', 'privacy-aware', 'evidence-forward', 'never clinical cosplay'],
    approvedCtas: [
      'Get one calmer next move.',
      'Snap a meal. See a practical food-fit card.',
      'Save this before your next grocery run.',
    ],
    productTruths: [
      'Designed for calmer meal-decision support.',
      'Shows a practical next move.',
      'Not medical advice.',
      'Useful around meals, labels, barcode scans, restaurant choices, and saved food history.',
    ],
    claimBoundaries: [
      'Do not claim diagnosis, treatment, guaranteed weight loss, or medication advice.',
      'Avoid dosing, side-effect, adverse-event, clinician, or before/after body claims.',
      'Food photos, OCR, barcode, medication context, local history, and optional health context are sensitive.',
    ],
    bannedAngles: [
      'Lose weight faster',
      'Fix nausea',
      'Eat this on Ozempic',
      'Doctor recommended',
      'Before/after body proof',
    ],
    defaultFormatId: 'reaction-hook',
    defaultTrendPresetId: 'reaction-overwhelmed-fridge',
    defaultQuery: 'GLP-1 meal tracking app protein food scanner weight loss TikTok',
    sourceNotes: [
      'Use real app screenshots where possible.',
      'Keep public copy away from treatment, dosing, side-effect, or guaranteed-result language.',
      'Prefer phone-native product proof over influencer weight-loss aesthetics.',
    ],
  },
  {
    id: 'toneclone',
    name: 'Tone Clone',
    shortName: 'Tone',
    accent: '#5C7282',
    repoPath: '/Volumes/Adventure/Andromeda Labs/Tone Clone',
    marketingRoot: `${marketingRoot}/Tone Clone`,
    assetRoots: [
      '/Volumes/Adventure/Andromeda Labs/ASSETS/ToneClone',
      '/Volumes/Adventure/Andromeda Labs/Marketing/Design Language/ToneClone',
      '/Volumes/Adventure/Andromeda Labs/Marketing/Launch War Room/04 ImageGen Keyframes/ToneClone',
    ],
    screenshotRoots: [
      '/Volumes/Adventure/Andromeda Labs/ASSETS/ToneClone/AppStoreScreenshots/raw-real-current',
      '/Volumes/Adventure/Andromeda Labs/ASSETS/ToneClone/AppStoreScreenshots/raw-guitar-seed',
    ],
    appStoreStatus: 'Live/TestFlight/App Store lane; microphone/audio and IP claims require care.',
    oneLineTruth:
      'Tone Clone helps musicians analyze a target sound and translate it into practical tone settings, chains, or result cards they can actually use.',
    audience: [
      'Guitarists and bassists chasing a tone.',
      'Bedroom producers and home-recording musicians.',
      'Gear-curious players who want a practical starting point.',
    ],
    emotionalPromise: 'The sound in your head becomes something you can dial in.',
    tone: ['musician-native', 'tactile studio tool', 'specific', 'not celebrity-coded', 'audio-proof-first'],
    approvedCtas: [
      'Find the tone faster.',
      'Turn a sound into settings.',
      'Try it on your next riff.',
    ],
    productTruths: [
      'Helps translate a sound into settings.',
      'Gives users a starting chain to try.',
      'Designed for musicians dialing in their own sound.',
      'Best proof formats use original riffs, A/B demos, pedalboard close-ups, and app result cards.',
    ],
    claimBoundaries: [
      'Do not imply exact artist impersonation, endorsement, or brand affiliation.',
      'Avoid protected songs, artist likeness, voice cloning, and fake studio endorsements.',
      'Microphone/audio handling and deletion controls should stay plain in public copy.',
    ],
    bannedAngles: [
      'Sound exactly like a named artist',
      'Clone any voice',
      'Use any song legally',
      'Producer approved without substantiation',
      'Fake celebrity musician reaction',
    ],
    defaultFormatId: 'faceless-demo',
    defaultTrendPresetId: 'ab-real-amp-or-app',
    defaultQuery: 'guitar tone app amp simulator pedalboard home recording TikTok',
    sourceNotes: [
      'Use original riffs, dry/wet comparisons, and real app screenshots.',
      'Avoid named-artist or protected-song mimicry unless rights are explicitly cleared.',
      'Make the app feel like pedalboard intelligence, not generic AI music glitter.',
    ],
  },
]

export const captionStyles: CaptionStyle[] = [
  {
    id: 'tiktok-bold',
    name: 'TikTok Bold',
    summary: 'Large centered words with strong outline for silent-scroll hooks.',
    burnInRole: 'Best default for UGC talking head and reaction clips.',
  },
  {
    id: 'karaoke',
    name: 'Karaoke',
    summary: 'Word-by-word emphasis for voiceover-led clips.',
    burnInRole: 'Use when rhythm and spoken timing matter.',
  },
  {
    id: 'clean-minimal',
    name: 'Clean Minimal',
    summary: 'Small premium captions with generous safe zones.',
    burnInRole: 'Use for app demos and higher-trust product proof.',
  },
  {
    id: 'high-contrast',
    name: 'High Contrast',
    summary: 'Accessibility-first captions for busy backgrounds.',
    burnInRole: 'Use when the source video is visually noisy.',
  },
  {
    id: 'creator-bubble',
    name: 'Creator Bubble',
    summary: 'Compact creator-style speech bubble overlays.',
    burnInRole: 'Use for reaction hooks, confessions, and quick POVs.',
  },
  {
    id: 'lower-third',
    name: 'Lower Third',
    summary: 'Bottom-safe demo labels for app walkthroughs.',
    burnInRole: 'Use when the face or product proof needs clean space.',
  },
  {
    id: 'big-hook',
    name: 'Big Hook',
    summary: 'Huge first-line overlay that disappears after the hook.',
    burnInRole: 'Use for the first 1-3 seconds of scroll-stopping clips.',
  },
]

export const formatCategories: FormatCategory[] = [
  {
    id: 'reaction-hook',
    name: 'Reaction Hook',
    summary: 'A strong first-two-second emotion, then a proof cut.',
    bestFor: 'High-scroll social posts where the first face beat does the stopping.',
    trendPresets: [
      {
        id: 'reaction-overwhelmed-fridge',
        name: 'Overwhelmed/fridge stare',
        source: 'seed',
        hookPattern: 'Hold an anxious or overwhelmed face, then hard cut to the app solving the immediate choice.',
        firstThreeSeconds: 'POV: lunch feels different now and you still need one sane next move.',
        visualBehavior: 'Tight face or faceless fridge stare, hard cut to phone, app proof by second 5.',
        captionStyleId: 'big-hook',
        musicNote: 'Use a cleared voiceover or add a platform-native sound downstream.',
        promptTemplate:
          'Open with a realistic overwhelmed pause, then cut to a phone-native app proof moment. Keep the reaction honest, not theatrical.',
      },
      {
        id: 'reaction-hand-over-mouth',
        name: 'Hand-over-mouth shock',
        source: 'seed',
        hookPattern: 'Shock reaction first, then reveal the surprising before/after app proof.',
        firstThreeSeconds: 'I did not expect the app to catch this that fast.',
        visualBehavior: 'Hand over mouth, quick zoom or cut, then phone screen reveal.',
        captionStyleId: 'tiktok-bold',
        musicNote: 'Good with short suspense hit or silent caption-first post.',
        promptTemplate:
          'Match a shocked UGC reaction in the first beat, then reveal a simple truthful app result without overclaiming.',
      },
    ],
  },
  {
    id: 'talking-head',
    name: 'Talking Head',
    summary: 'Creator speaks directly to camera with a tight script.',
    bestFor: 'HeyGen/presenter route, testimonials, direct confessions, and founder-style proof.',
    trendPresets: [
      {
        id: 'confession-wish-knew',
        name: 'I wish I knew this earlier',
        source: 'seed',
        hookPattern: 'Direct confession, one pain, one proof, one CTA.',
        firstThreeSeconds: 'I wish I had this before I wasted time guessing.',
        visualBehavior: 'Direct eye contact, quick app insert, return to creator for CTA.',
        captionStyleId: 'karaoke',
        musicNote: 'Voice-first. Keep music low or add in TikTok.',
        promptTemplate:
          'Create a natural creator confession with clean direct eye contact and a short app proof insert.',
      },
    ],
  },
  {
    id: 'faceless-demo',
    name: 'Faceless App Demo',
    summary: 'Hands, phone, screen recording, and overlays instead of a speaking face.',
    bestFor: 'Tone Clone A/B demos, SnapGLP scan proof, privacy-sensitive content.',
    trendPresets: [
      {
        id: 'ab-real-amp-or-app',
        name: 'A/B guessing game',
        source: 'seed',
        hookPattern: 'Make the viewer guess before the reveal.',
        firstThreeSeconds: 'Real amp or app match? Guess before the reveal.',
        visualBehavior: 'Split A/B labels, waveform or phone screen, quick reveal at the end.',
        captionStyleId: 'lower-third',
        musicNote: 'Use original cleared audio proof only.',
        promptTemplate:
          'Build a faceless A/B app demo with quick labels, real proof rhythm, and a final reveal.',
      },
    ],
  },
  {
    id: 'slideshow-carousel',
    name: 'Slideshow Carousel',
    summary: 'Static images or slides with text-led persuasion.',
    bestFor: 'List posts, educational explainers, screenshot carousels, and image-only ads.',
    trendPresets: [
      {
        id: 'mistakes-list-carousel',
        name: 'Mistakes list',
        source: 'seed',
        hookPattern: 'One painful mistake per slide, then the app as the shortcut.',
        firstThreeSeconds: '3 mistakes I would stop making today.',
        visualBehavior: 'Static slide stack with bold text and one app screenshot proof slide.',
        captionStyleId: 'clean-minimal',
        musicNote: 'Add platform-native sound downstream if posting as slideshow.',
        promptTemplate:
          'Create a clean static carousel with one sharp idea per slide and truthful app proof.',
      },
    ],
  },
  {
    id: 'ranking-list',
    name: 'Ranking/List',
    summary: 'Ranked choices, mistakes, tools, or steps.',
    bestFor: 'Fast educational UGC and carousel/video hybrids.',
    trendPresets: [
      {
        id: 'ranked-choices',
        name: 'Ranked choices',
        source: 'seed',
        hookPattern: 'Rank 5 options from worst to best with a useful reveal.',
        firstThreeSeconds: 'I ranked the 5 fastest ways to stop guessing.',
        visualBehavior: 'Numbered overlays, quick cuts, winner reveal with app proof.',
        captionStyleId: 'high-contrast',
        musicNote: 'Works silent with captions.',
        promptTemplate:
          'Create a ranking sequence with crisp labels, fast cuts, and a final app-backed recommendation.',
      },
    ],
  },
  {
    id: 'tutorial',
    name: 'Step-by-Step Tutorial',
    summary: 'A simple sequence that makes the app feel instantly usable.',
    bestFor: 'Feature education without a hard sell.',
    trendPresets: [
      {
        id: 'three-step-proof',
        name: 'Three-step proof',
        source: 'seed',
        hookPattern: 'Step 1 problem, step 2 app action, step 3 result.',
        firstThreeSeconds: 'Here is the 3-step shortcut I use now.',
        visualBehavior: 'Hands/phone/action cards, three clear beats, no clutter.',
        captionStyleId: 'lower-third',
        musicNote: 'Light bed can be added downstream.',
        promptTemplate:
          'Create a clear three-step product demo with stable phone framing and room for captions.',
      },
    ],
  },
  {
    id: 'before-after',
    name: 'Before/After',
    summary: 'Compare confusion or bad output against a cleaner app-assisted result.',
    bestFor: 'Tone comparison and practical app utility.',
    trendPresets: [
      {
        id: 'before-after-settings',
        name: 'Before/after settings',
        source: 'seed',
        hookPattern: 'Bad first attempt, app-aided correction, improved result.',
        firstThreeSeconds: 'Before this, I was just guessing.',
        visualBehavior: 'Before label, app action, after label, quick result card.',
        captionStyleId: 'tiktok-bold',
        musicNote: 'Use original audio proof only for music apps.',
        promptTemplate:
          'Create a before/after proof sequence with clear labels and no exaggerated claims.',
      },
    ],
  },
  {
    id: 'objection-bust',
    name: 'Objection Bust',
    summary: 'Answer the obvious skeptical comment before it appears.',
    bestFor: 'Trust-sensitive apps where users need reassurance.',
    trendPresets: [
      {
        id: 'skeptic-comment-reply',
        name: 'Comment reply',
        source: 'seed',
        hookPattern: 'Show a skeptical comment, then answer it with product truth.',
        firstThreeSeconds: 'Someone asked if this was just another generic tracker.',
        visualBehavior: 'Comment bubble, creator/app proof, grounded answer.',
        captionStyleId: 'creator-bubble',
        musicNote: 'Voiceover or silent comment-reply format.',
        promptTemplate:
          'Create a comment-reply style video that answers one skepticism point with product proof.',
      },
    ],
  },
  {
    id: 'pov-story',
    name: 'POV / Storytime',
    summary: 'Narrative hook that drops the viewer into a real-life moment.',
    bestFor: 'Everyday use cases and relatable pain moments.',
    trendPresets: [
      {
        id: 'pov-one-problem',
        name: 'POV one problem',
        source: 'seed',
        hookPattern: 'POV line, immediate situation, app proof, relief beat.',
        firstThreeSeconds: 'POV: you need a decision, not another spreadsheet.',
        visualBehavior: 'Realistic situation shot, app insert, relief or completion beat.',
        captionStyleId: 'clean-minimal',
        musicNote: 'Platform-native low-volume sound works well.',
        promptTemplate:
          'Create a POV story clip with one concrete pain moment and one clear product proof.',
      },
    ],
  },
  {
    id: 'app-showcase',
    name: 'App Showcase',
    summary: 'Product-first demo with overlays and polished screenshots.',
    bestFor: 'App Store-style proof, retargeting clips, and clean launch assets.',
    trendPresets: [
      {
        id: 'feature-reveal',
        name: 'Feature reveal',
        source: 'seed',
        hookPattern: 'One feature, one result, one CTA.',
        firstThreeSeconds: 'This is the feature I would show first.',
        visualBehavior: 'Phone close-up, app screen, overlay text, clean export.',
        captionStyleId: 'lower-third',
        musicNote: 'Keep audio optional and secondary.',
        promptTemplate:
          'Create a premium app showcase with a real screenshot composite and simple benefit overlays.',
      },
    ],
  },
]

export const avatarRecipes: AvatarRecipe[] = [
  {
    id: 'uploaded-first-frame',
    name: 'Uploaded first-frame image',
    appFit: 'shared',
    style: 'User-supplied',
    prompt: 'Use the uploaded avatar image as the first frame and identity anchor.',
    usageNote: 'Best for real renders because it has a concrete local image file.',
  },
  {
    id: 'calm-food-guide',
    name: 'Calm food guide',
    appFit: 'snapglp',
    style: 'Natural iPhone selfie, warm kitchen light',
    prompt:
      'Photorealistic vertical iPhone selfie of a calm late-20s or early-30s food decision guide, natural makeup, soft kitchen daylight, trustworthy but not clinical, no medical props.',
    usageNote: 'Good SnapGLP face for calm meal-decision content.',
  },
  {
    id: 'busy-parent-kitchen',
    name: 'Busy kitchen realist',
    appFit: 'snapglp',
    style: 'Casual kitchen UGC',
    prompt:
      'Photorealistic vertical phone portrait of an everyday adult in a kitchen, slightly overwhelmed but relatable, natural light, realistic skin texture, no medication, no scale.',
    usageNote: 'Good for overwhelmed lunch/fridge hooks.',
  },
  {
    id: 'home-studio-guitarist',
    name: 'Home-studio guitarist',
    appFit: 'toneclone',
    style: 'Bedroom studio creator',
    prompt:
      'Photorealistic vertical iPhone portrait of a musician in a home studio with guitar nearby, natural creator lighting, tactile studio mood, no logos, no famous artist resemblance.',
    usageNote: 'Good Tone Clone talking head or reaction hook avatar.',
  },
  {
    id: 'faceless-guitar-hands',
    name: 'Faceless guitar hands',
    appFit: 'toneclone',
    style: 'Hands and pedalboard only',
    prompt:
      'Vertical realistic phone shot of hands holding an electric guitar near a pedalboard and audio interface, no face, brushed metal and amp black textures, no brand logos.',
    usageNote: 'Good for faceless A/B demos and app showcase clips.',
  },
]

export const generationCountOptions = [1, 2, 3] as const

export function getCampaignRecipe(id: CampaignAppId) {
  return campaignRecipes.find((recipe) => recipe.id === id) ?? campaignRecipes[0]
}

export function getFormatCategory(id: FormatCategoryId) {
  return formatCategories.find((format) => format.id === id) ?? formatCategories[0]
}

export function getTrendPreset(formatId: FormatCategoryId, presetId: string) {
  const format = getFormatCategory(formatId)
  return format.trendPresets.find((preset) => preset.id === presetId) ?? format.trendPresets[0]
}

export function getDefaultTrendPreset(formatId: FormatCategoryId) {
  return getFormatCategory(formatId).trendPresets[0]
}

export function avatarsForCampaign(campaignId: CampaignAppId) {
  return avatarRecipes.filter((avatar) => avatar.appFit === 'shared' || avatar.appFit === campaignId)
}
