# Clara Editorial Archive

Clara's Stories uses a restrained editorial system shaped for historical storytelling, quiet reading, and reliable use across the website and installed PWA.

## Visual Character

- Treat the page as paper, not an aurora: near-solid warm bone in light mode and deep ink in dark mode.
- Use faint archival rules and one restrained atmospheric tint. Colour should come primarily from story imagery, selected qualities, and meaningful status.
- Prefer hairline borders, modest radii, and shallow elevation. Avoid glass-heavy surfaces, oversized pills, neon colour, and decorative gradients.
- Let hierarchy come from typography, spacing, and image scale rather than effects.

## Typography

- Newsreader is the editorial voice for titles, quotations, and story text.
- Inter is the interface voice for navigation, search, filters, metadata, summaries, sources, tags, and controls.
- Both families are stored with the project and cached by the PWA, so this hierarchy remains intact offline.
- Do not introduce a third display face without a deliberate redesign.
- Headings use balanced wrapping. Summaries and long-form paragraphs use natural, readable wrapping.
- Long-form text targets roughly 62-68 characters per line, with a calm line height around 1.62.

## Type Scale

| Role | Mobile | Desktop |
| --- | --- | --- |
| Library heading | 39-48px | 54-74px |
| Card title | 25-27px | 25-30px |
| Card quotation | 30-32px | 30-54px depending on card width |
| Card summary | 15-16px | 15-17px |
| Interface controls | 14-15px | 14-15px |
| Metadata | 11-12px | 11-12px |
| Reader title | 42-48px | 64-74px |
| Reader text | 19px | 19-21px |

## Components

- Header: quiet paper surface, fine border, compact radius, minimal shadow.
- Mobile home: use the Shrine as a full-viewport cinematic cover, retain the Bahá'í date and title, and hand scrolling directly to the story library. The short local MP4 is scrubbed by scroll, with the poster retained for reduced motion and constrained connections. Do not add explanatory home sections or a forced scroll cue on small screens.
- Archive surface: use a quiet tonal paper field with soft directional colour. Do not use a repeated square grid behind library content.
- Library filters: Inter labels with 44px targets; selected states carry colour, inactive states remain neutral.
- Story cards: rectangular archival plates with fine borders. The feature card may use a very restrained two-tone wash.
- Reader: the text is primary. Source information and tags should be quieter and use the interface face.
- Images: preserve historical integrity and use explicit focal positioning when the default crop is wrong.

## Maintenance

- Keep cache versions synchronized after CSS or font-source changes.
- Check desktop and 390px mobile layouts in both themes.
- Confirm the intended fonts are loaded and that body copy does not fall back to Times or Arial.
- Run `node scripts/check-pwa-sync.mjs` before reporting a visual/PWA change as complete.
