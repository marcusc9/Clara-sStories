# Clara's Stories Codex Handoff

This is the high-level handoff for future Codex work on Clara's Stories. Read this first, then inspect only the files relevant to the user’s newest comment. This file exists to reduce context burn.

Last refreshed: 2026-05-14.

## Product Feel

Clara's Stories should feel personal, careful, and easy to return to. The site is not trying to sound like a product team, a backend system, or generic AI-generated copy. Prefer plain human language:

- "Stories to come back to."
- "Clear pages, gentle colours, and simpler reads."
- "Every story is checked against an authoritative source and links back to where it came from."

Avoid language like:

- source-conscious
- reader-first
- different paths
- grows without becoming noisy
- trustworthy care is visible
- anything that sounds like architecture, backend, or SaaS positioning

The visual direction is warm, reverent, and Apple-like in restraint: generous spacing, clear hierarchy, soft material surfaces, readable controls, and no decorative clutter. User likes “21st.dev worthy” interactions, but this project is still static HTML/CSS/JS. Treat React/Tailwind/shadcn prompts as inspiration unless the user explicitly asks to migrate stacks.

## Context-Saving Workflow

To avoid burning Codex limits:

- Start with this handoff.
- Run `rg` for the exact selected text, class, or URL from the newest comment.
- Inspect only the relevant HTML/CSS/JS section.
- Keep cache version bumps consistent across `index.html`, `stories.html`, `about.html`, `story.html`, and `service-worker.js`.
- Use fresh localhost query strings while reviewing, for example `?codex=home-refine-7`.
- Summarize changes here whenever a multi-step visual/PWA sequence is still in progress.

For daily story curation, do not load all of `stories.js` into model context for discovery or repeat checks. Use `node scripts/clara-story-index.mjs --recent=12` to get compact recent-story metadata, duplicate hashes, source usage, theme usage, and recent image data. Load only the relevant `clara-racks/*.md` files for the current automation phase.

## Current User Priorities

- About page matters. Do not let content disappear because of reveal animations, file previews, service-worker cache, or unsupported APIs.
- Mobile polish matters as much as desktop.
- The nav menu should feel alive every time: fan/fade in, fade out on close, close on outside interaction, close on scroll, and keep background dimming intuitive.
- Remove install UI from the top bar, but keep PWA behavior working.
- Android PWA installation is important. Manifest and service worker scope must stay relative and deploy-friendly.
- Copy should sound like Marcus, not an assistant.
- The founder section is personal. Preserve the image and caption unless explicitly asked.
- The local/mobile PWA view must match localhost as closely as possible. When something looks fine on localhost but wrong on phone, suspect stale service worker/cache first, then responsive CSS.

## Files To Know

- `index.html`: home page with the hero plus an interactive floating-image introduction.
- `stories.html`: dedicated story library page with search, filters, and story cards.
- `about.html`: About page content and copy.
- `story.html`: individual reader page.
- `styles.css`: most layout, nav, About, reader, and PWA install styling.
- `install.js`: shared nav menu, theme, service worker, install prompt, and iOS install helper behavior.
- `about.js`: About-specific theme/reveal/header/hero motion behavior.
- `service-worker.js`: offline app shell and cache versioning.
- `manifest.json`, `manifest.webmanifest`, `site.webmanifest`: PWA metadata. Keep relative scope/start URL.

## Current Home Page Shape

`index.html` is now an introductory home page, not the story library.

- Hero remains at the top, with `Read the stories` linking to `stories.html`.
- Welcome section id: `#welcome`.
- Welcome copy:
  - Heading: "A gentler way into stories of light and courage."
  - Paragraph: "Clara's Stories gathers true Bahá'í stories in a calm reader, with sources kept close."
  - Pill: "About us"
- Floating collage:
  - Large card: ‘Abdu’l-Bahá under the Eiffel Tower. The old `Service` figcaption has been removed because it peeked out awkwardly on mobile.
  - Tall card: Lotus Temple, with `Prayer` pill. On mobile the Prayer pill is intentionally detached and moved lower-left; keep it clear of `Sacrifice`.
  - Small card: Kampala House of Worship, with `Community` pill.
  - Floating quality pills: Courage, Peace, Sacrifice.
- Home path cards:
  - Read one story.
  - Stay close to the source.
  - Come back when needed.
- Home close CTA:
  - "Choose a quality and let a story meet you there."
  - `Browse the library` links to `stories.html`.

Current home interaction:

- `script.js` has `initialiseFloatingGallery()`, `initialiseScrollBoard()`, and `initialiseHomeSectionScroll()`.
- CSS uses `--section-progress` on `.home-intro`, `.home-path`, and `.home-close`.
- CSS uses `--card-progress` on `[data-scroll-card]`.
- Keep scroll effects gentle. The site should feel alive, not dizzy.

## Current About Page Shape

Hero:

- Headline: "Stories to come back to."
- Orbit labels: original sources, daily reads, house letters.
- The orbit labels must not sit under the fixed top bar and must be readable on small screens.
- The bottom fade should be gentle. Do not make "roots" or the final word of the headline hard to read.

Index section:

- Should feel refined and steady, not like a raw text list.
- Current rows:
  - Keep the source within reach.
  - Let the reading stay quiet.
  - Give each kind of text a home.
- Keep copy short and user-facing.

Founder section:

- Uses `images/marcus-clara.jpeg`.
- Caption: "Clara, 7 months. ❤️"
- Heading: "A note:"
- Paragraph is intentionally warm and personal.

Letters/support:

- Letters should simply say they are coming soon with the same quiet reading experience.
- Support should invite contact with Marcus in a personal way.
- Support section needs real mobile margins and no clipped text.

## Recent Important Fixes

- Reveal animations now fail open. `.reveal` is visible by default; `.js .reveal` applies the hidden starting state only after JavaScript is confirmed.
- Inline head scripts add the `.js` class and wrap `localStorage` reads in `try/catch`, so `file://` previews do not break the About page.
- `about.js` handles missing `IntersectionObserver` by making reveal sections visible.
- Static asset cache version was bumped to `20260513-reveal-safe`.
- Nav install icon was removed from the top bar.
- Shared nav menu now closes on outside interaction, Escape, scroll, and link click.
- The story library has been moved out of the home page into `stories.html`; home CTAs and story backlinks should point there.
- Home now uses a native CSS/JS floating gallery inspired by 21st.dev-style interactions. Keep it dependency-free unless the project is intentionally migrated to a framework.
- Offline availability is communicated by one liquid-glass bottom toast. Do not add per-card "Available offline" badges back to story cards or the reader page.
- Nav menu letter badges (`S`, `A`, `L`) were replaced with minimal abstract marks because the letters read as "SAL".
- The first story feature image now points to a House of the Báb image, not the declaration-room image.
- Current cache version after latest story library update: `20260524-story-library-1`.

## PWA Notes

Android install previously prompted but did not reliably show on the home screen. Keep these rules:

- Service worker registration should use `./service-worker.js` with `scope: "./"`.
- The installed PWA checks for service-worker updates on launch. The service worker also refreshes same-origin windows once when a new cache version replaces an old Clara cache.
- Run `node scripts/check-pwa-sync.mjs` after changing cached HTML, CSS, or JS asset versions.
- Manifest `id`, `start_url`, and `scope` should stay relative.
- Icons must be reachable from the live GitHub deployment.
- After deploy, uninstall any old Clara install and clear site data before retesting Android, because stale service workers and old manifests can mask fixes.
- Android may place installed PWAs in the app drawer depending on launcher/browser behavior, but it still needs to behave like a real PWA.
- If phone screenshots show old layout, ask Marcus to hard-refresh/reinstall only after verifying the code version was bumped. Old installed PWAs can keep an older service worker.

## Verification Checklist

Before saying a frontend change is done:

- Run `git diff --check`.
- Run `node --check` on changed JS files.
- Inspect mobile width around 320-390px and a wider desktop/tablet width.
- Check both light and dark themes if the changed area uses color.
- Check `file://` and `localhost` behavior when the issue involves Codex preview, reveal animations, or service worker cache.
- Confirm no text is clipped, overlapped, or hidden under the fixed header.

Useful current URLs:

- Home welcome: `http://localhost:8008/index.html?codex=home-refine-7#welcome`
- Stories: `http://localhost:8008/stories.html?codex=home-refine-7`
- About: `http://localhost:8008/about.html?codex=home-refine-7`

## Quality Guardrails For Codex

- Read the relevant code before editing. Do not guess from the screenshot alone.
- Keep changes surgical. The site is already visually delicate.
- Do not introduce new frameworks or abstractions.
- Do not rewrite broad CSS unless the user asks for a redesign.
- When copy is requested, write as a human first, then trim it.
- Prefer one strong visual move over many decorative effects.
- If browser automation refuses `file://`, say so and verify with safe local alternatives where possible.

## Known Watchouts

- There may be several old `python3 -m http.server` processes from prior sessions. Prefer the current working port if it still responds; otherwise start a new port and state it.
- The worktree is intentionally dirty. Do not revert broad changes.
- `stories.js` has a newly added first story: `awake-for-the-morning-light-has-broken`. Preserve it.
- Image URLs are a mix of Wikimedia, Bahá'í World, and Bahá'í Media. If replacing images, prefer historically relevant and respectful images over generic stock.
- Keep the service worker app shell in sync when adding/removing top-level pages.
