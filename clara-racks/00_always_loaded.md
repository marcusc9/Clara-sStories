# Clara's Stories Always-Loaded Rules

These rules apply to every automation phase.

- Add exactly 1 new sourced Bahá'í story per run, or add 0 if no story meets Clara's excellence standard.
- Never add 2 or more stories in one run.
- Do not edit broad site design, typography, navigation, or PWA behavior during daily story curation unless the user explicitly asks.
- Do not load the full `stories.js` into model context for discovery or ranking. Use `node scripts/clara-story-index.mjs --recent=12` for compact metadata, duplicate signals, and source usage.
- Read `taxonomy.js` before assigning a theme. Every theme must resolve to one of the existing eight shelves; do not add or rename shelves during daily curation.
- Use 1-5 canonical descriptive tags. Do not introduce tag spelling variants listed in `taxonomy.js`.
- Before accepting a candidate, compare it against the compact duplicate signals: id, normalized title, source URL, source/page key, quote hash, first paragraph hash, and body hash.
- Reject candidates that appear to duplicate an existing story, substantially reuse the same source passage, or repeat a recently featured image.
- Reject candidates whose source text depends on visible editorial fragments, speech/report formatting, or historical significance without a Clara-level story arc and meaning.
- Card titles should not repeat or closely paraphrase the quote. Let the title name the narrative angle, object, person, or scene; let the quote field carry the memorable source line.
- If duplicate status is uncertain, inspect only the relevant existing story object and the candidate source passage.
- Run `node scripts/check-library-taxonomy.mjs` before reporting success.
