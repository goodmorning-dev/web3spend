/**
 * The values the brand page shows. The hex codes are the app's own dark
 * theme tokens from index.css, written out so they can be copied; a test
 * (brandData.test.ts) compares every one against index.css, so this page
 * can't quietly drift from what the product actually uses.
 */

export interface BrandColor {
  name: string
  hex: string
  /** The CSS variable in index.css this color comes from. */
  cssVar: string
  usage: string
}

export interface ColorGroup {
  title: string
  description: string
  colors: BrandColor[]
}

export const COLOR_GROUPS: ColorGroup[] = [
  {
    title: 'Ground',
    description: 'The dark base everything sits on.',
    colors: [
      { name: 'Ground', hex: '#0a0d13', cssVar: '--background', usage: 'Page background' },
      { name: 'Surface', hex: '#1e2431', cssVar: '--secondary', usage: 'Chips, inputs, tiles' },
      { name: 'Border', hex: '#262d3a', cssVar: '--border', usage: 'Card and divider lines' },
    ],
  },
  {
    title: 'Accents',
    description: 'Gold leads. Indigo backs it up.',
    colors: [
      {
        name: 'Gold',
        hex: '#f0b429',
        cssVar: '--primary',
        usage: 'Buttons, highlights, the logo',
      },
      {
        name: 'Indigo',
        hex: '#7c8cf8',
        cssVar: '--accent-2',
        usage: 'Second accent, used sparingly',
      },
    ],
  },
  {
    title: 'Signals',
    description: 'Color that means something. Never decoration.',
    colors: [
      { name: 'Mint', hex: '#34d399', cssVar: '--positive', usage: 'Cashback, good news' },
      { name: 'Amber', hex: '#f5a623', cssVar: '--warning', usage: 'Pending, worth a look' },
      { name: 'Coral', hex: '#f16565', cssVar: '--destructive', usage: 'Errors, deleting data' },
    ],
  },
  {
    title: 'Text',
    description: 'Three steps of contrast on the ground.',
    colors: [
      { name: 'Text', hex: '#eef1f6', cssVar: '--foreground', usage: 'Headings and key numbers' },
      { name: 'Text dim', hex: '#96a0b3', cssVar: '--text-dim', usage: 'Body copy' },
      { name: 'Text faint', hex: '#5c6579', cssVar: '--text-faint', usage: 'Captions, hints' },
    ],
  },
]

/** The eight colors charts and category dots cycle through, in order. */
export const CHART_COLORS: BrandColor[] = [
  { name: 'Gold', hex: '#f0b429', cssVar: '--chart-1', usage: 'First series' },
  { name: 'Indigo', hex: '#7c8cf8', cssVar: '--chart-2', usage: 'Second series' },
  { name: 'Mint', hex: '#34d399', cssVar: '--chart-3', usage: 'Third series' },
  { name: 'Burnt orange', hex: '#d97706', cssVar: '--chart-4', usage: 'Fourth series' },
  { name: 'Slate', hex: '#5b6577', cssVar: '--chart-5', usage: 'Fifth series, "Other"' },
  { name: 'Coral', hex: '#f16565', cssVar: '--chart-6', usage: 'Sixth series' },
  { name: 'Sky', hex: '#38bdf8', cssVar: '--chart-7', usage: 'Seventh series' },
  { name: 'Pink', hex: '#f472b6', cssVar: '--chart-8', usage: 'Eighth series' },
]

export interface TypeRow {
  label: string
  className: string
  sample: string
  spec: string
}

/** The sizes the product uses, so the page can show them as they render. */
export const TYPE_SCALE: TypeRow[] = [
  {
    label: 'Display',
    className: 'font-heading text-5xl leading-[1.1] font-semibold',
    sample: 'Your spending.',
    spec: 'Bricolage Grotesque, 48px, semibold',
  },
  {
    label: 'Section title',
    className: 'font-heading text-3xl font-semibold',
    sample: 'From export to insights',
    spec: 'Bricolage Grotesque, 30px, semibold',
  },
  {
    label: 'Card title',
    className: 'font-heading text-base font-semibold',
    sample: 'Spending by category',
    spec: 'Bricolage Grotesque, 16px, semibold',
  },
  {
    label: 'Body',
    className: 'text-sm text-text-dim',
    sample: 'Everything is parsed and stored on this device. Nothing is uploaded anywhere.',
    spec: 'Hanken Grotesk, 14px, regular',
  },
  {
    label: 'Caption',
    className: 'text-xs font-medium text-text-faint',
    sample: 'Cleared and pending purchases',
    spec: 'Hanken Grotesk, 12px, medium',
  },
]

export interface VoiceExample {
  say: string
  notThis: string
}

export const VOICE_EXAMPLES: VoiceExample[] = [
  {
    say: 'Nothing is uploaded anywhere.',
    notThis: 'Bank-grade, military-strength security for your data.',
  },
  {
    say: 'These are guesses, not confirmed subscriptions.',
    notThis: 'We found all your subscriptions!',
  },
  {
    say: "Rows we can't understand are listed, not skipped.",
    notThis: 'Oops, something went wrong.',
  },
]

export const VOICE_RULES: { title: string; body: string }[] = [
  {
    title: 'Calm and plain',
    body: 'Say what it does in the fewest words that stay true. No hype, no exclamation marks, no jargon a cardholder would have to look up.',
  },
  {
    title: 'Honest about limits',
    body: "When something is a guess, say it's a guess. When something can fail, say how. A claim you can't back up doesn't go on the page.",
  },
  {
    title: 'Privacy you can check',
    body: 'Be specific enough to verify: processed on your device, nothing uploaded, no account. Then point at the code and the Network tab.',
  },
  {
    title: 'Small details',
    body: 'Sentence case for headings. "ether.fi" is lowercase, "Web3Spend" is one word. No em dashes: use a comma, a colon, or start a new sentence.',
  },
]

export const LOGO_DO: string[] = [
  'Give the mark clear space of at least a quarter of its height on every side.',
  'Use it on the dark ground, or on the app icon tile when the background is busy.',
  'Set the wordmark in Bricolage Grotesque, semibold, next to the mark.',
]

export const LOGO_DONT: string[] = [
  'Recolor the mark, add outlines, or swap the gold for another accent.',
  'Stretch, rotate, or crop it, or redraw it from the wordmark.',
  "Place it on a light or patterned background without the tile, or imply it's ether.fi's.",
]
