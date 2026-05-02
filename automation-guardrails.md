# Clara's Stories Automation Guardrails

These rules govern every staged story refresh for Clara's Stories.

## Non-Negotiables

- Story text shown on the site must be copied verbatim from the source. Do not summarize, rewrite, paraphrase, or generate devotional prose.
- Each story page must include the full selected story or complete excerpt. Avoid cliffhangers whose main purpose is to push readers away from the site.
- Add only one new story per daily run. Quality over quantity is the governing rule. If no truly excellent source text is found, add none that day.
- Select one high-impact, spiritually moving, memorable, or historically significant story worthy of being the single daily feature.
- Story selection must support the long-term library shape. Prefer stories that clearly illuminate spiritual qualities, patterns of action, or capacities relevant to the Bahá’í community-building work of the Nine Year Plan.
- Rotate sources widely across days. Avoid using the same website or the same collection on consecutive days unless the source quality clearly justifies the exception.
- Strongly prefer classic and respected sources such as The Dawn-Breakers, The Priceless Pearl, Prelude to the Guardianship, The Covenant of Bahá'u'lláh, Memorials of the Faithful, the Bahá'í Reference Library, Star of the West, Promulgation of Universal Peace, Paris Talks, and clearly attributed memoirs, tablets, pilgrim recollections, or high-quality curated Bahá'í story collections.
- Featured reads should feel substantial. Prefer 5+ minute stories for the featured slot unless the story is unusually strong and complete.
- New stories must be sorted newest-first in the library after any featured story placement.
- The featured story image must exist, must load, and must not repeat another story image.
- Source links must open the correct source page or marker. If a precise marker is unavailable, the reference copy must stay human-facing and avoid backend language.
- The story body must remain source text only. Editorial writing is allowed only in title, summary, tags, read time, quote snippet, source label, and added date.
- Visible reference copy on the site must stay short and natural, for example: `Source: Memorials of the Faithful`, `by Nabíl-i-A‘ẓam`, `Chapter 16`, or `p. 119`. Do not expose validation language to readers.
- Tags are part of the library architecture, not decorative metadata. Prefer spiritual qualities and closely related capacities as the primary tags. Avoid using anecdotal, person-specific, or incident-specific labels as the main organizing idea when a clearer spiritual quality is the real takeaway.
- `theme` is the visible spiritual-quality label on story cards and story pages. `tags` are the original story themes used in the source panel. Do not replace either with `Anecdotes`.
- If a story is a short anecdotal recollection, add `collectionTags: ["Anecdotes"]` as an extra browsing category while preserving the original `theme` and `tags`.
- Homepage filters must match both exposed `theme` filters and `collectionTags`.
- If every story under a theme is already an anecdote, do not expose that theme as a homepage filter. Keep the theme visible on the cards and story pages, but let the homepage browsing shelf be `Anecdotes`.
- Homepage filters are additive. `All` clears the selected filters; other filters can be combined and clicked again to remove them.
- Search must be forgiving of Bahá'í diacritics, curly apostrophes, and spacing. A search for `Tahirih` should find `Ṭáhirih`; `Abdul baha` should find `‘Abdu’l-Bahá`.

## Penalty Check

Use this before staging. A story batch should not ship with any high-severity penalty unresolved.

- High: generated, summarized, or non-verbatim story text.
- High: a story page omits the full selected story or complete excerpt.
- High: more than one new story is staged for a daily run.
- High: a weak or filler story is added when no excellent source text was available.
- High: a story is selected mainly because it is convenient or anecdotal, while its connection to meaningful spiritual qualities is weak or unclear.
- High: source link does not open the stated source.
- High: the same website or same collection is reused on consecutive days without a clear quality reason.
- Medium: featured read is under 5 minutes without a clear reason.
- Medium: title and quote repeat the same line.
- Medium: source/reference copy mentions scraping, anchors, backend pages, stable URLs, or automation.
- Medium: featured image is missing, broken, repeated, or only loosely related.
- Low: missing read time, tags, or added date.
- Low: quote is technically verbatim but weak, out of place, or placed after the same line appears at the end of the story.

## Daily Staging Shape

1. Search for one excellent candidate story from a strong source family, with a bias toward rotating away from yesterday's source family and website.
2. Before staging, identify the core spiritual quality or closely related capacity the story will help users navigate by. If that center is muddy, the story is usually not strong enough for Clara's library.
3. If no candidate clearly meets Clara's quality bar, stage no new story that day.
4. Copy the full selected story or complete standalone source entry into `stories.js`.
5. Make that single new story the featured story for the day unless a stronger very recent feature must remain in place.
6. Add or validate one unique featured image that fits the mood and does not repeat yesterday's image.
7. Keep the visible reference text short and natural: source, author, chapter, and page when useful.
8. Assign tags that reflect the story's true spiritual-quality value to the library. Prefer a small set of durable, navigationally useful tags over clever or incidental ones.
9. Run link and image checks before staging.
10. Confirm the new story body is verbatim, the source is high quality, the tags fit the library taxonomy, and the new entry sits newest-first with today's `addedOn` date.

## Audio Direction

Cached OpenAI narration audio is the preferred path. Do not use browser or iOS text-to-speech as an invisible fallback; if a story has no cached audio, show that narration is not ready.

For generated or recorded narration:

- Prefer a warm, natural, respectful female narrator for stories centered on female figures.
- Keep pacing calm, sincere, intelligent, and reverent.
- Preserve pauses around paragraphs, prayers, sacred names, and quoted passages.
- Add timing cues so the reader can highlight and gently scroll as audio plays.
