# Clara's Stories Codex Handoff

This is a high-level handoff for future Codex work on Clara's Stories. Read this before making design or PWA changes.

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

The visual direction is warm, reverent, and Apple-like in restraint: generous spacing, clear hierarchy, soft material surfaces, readable controls, and no decorative clutter.

## Current User Priorities

- About page matters. Do not let content disappear because of reveal animations, file previews, service-worker cache, or unsupported APIs.
- Mobile polish matters as much as desktop.
- The nav menu should feel alive every time: fan/fade in, fade out on close, close on outside interaction, close on scroll, and keep background dimming intuitive.
- Remove install UI from the top bar, but keep PWA behavior working.
- Android PWA installation is important. Manifest and service worker scope must stay relative and deploy-friendly.
- Copy should sound like Marcus, not an assistant.
- The founder section is personal. Preserve the image and caption unless explicitly asked.

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

## PWA Notes

Android install previously prompted but did not reliably show on the home screen. Keep these rules:

- Service worker registration should use `./service-worker.js` with `scope: "./"`.
- Manifest `id`, `start_url`, and `scope` should stay relative.
- Icons must be reachable from the live GitHub deployment.
- After deploy, uninstall any old Clara install and clear site data before retesting Android, because stale service workers and old manifests can mask fixes.
- Android may place installed PWAs in the app drawer depending on launcher/browser behavior, but it still needs to behave like a real PWA.

## Verification Checklist

Before saying a frontend change is done:

- Run `git diff --check`.
- Run `node --check` on changed JS files.
- Inspect mobile width around 320-390px and a wider desktop/tablet width.
- Check both light and dark themes if the changed area uses color.
- Check `file://` and `localhost` behavior when the issue involves Codex preview, reveal animations, or service worker cache.
- Confirm no text is clipped, overlapped, or hidden under the fixed header.

## Quality Guardrails For Codex

- Read the relevant code before editing. Do not guess from the screenshot alone.
- Keep changes surgical. The site is already visually delicate.
- Do not introduce new frameworks or abstractions.
- Do not rewrite broad CSS unless the user asks for a redesign.
- When copy is requested, write as a human first, then trim it.
- Prefer one strong visual move over many decorative effects.
- If browser automation refuses `file://`, say so and verify with safe local alternatives where possible.
