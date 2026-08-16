# Final Validation

Before saving or reporting success:

1. Confirm exactly 1 story was added today, or 0 if none met the standard.
2. Confirm the winner passed comparative scoring and the quality threshold.
3. Confirm compact duplicate signals did not match an existing story.
4. Confirm the story body is full verbatim source text.
5. Confirm source references are elegant and human.
6. Confirm every new source URL works.
7. Confirm every featured image URL works and is Bahá'í-relevant where possible.
8. Preview the featured card at mobile and desktop widths. Confirm the subject is deliberately framed; set or adjust `featureImagePosition` before saving if the centered crop cuts off the subject.
9. Confirm no repeated recent image or weak repeated source pattern.
10. Confirm newest-first ordering by `addedOn`.
11. Confirm the new theme resolves to an existing shelf and its 1-5 tags use canonical spellings.
12. Run `node scripts/check-library-taxonomy.mjs` and resolve every failure.
13. Run `node scripts/check-story-copy.mjs --recent=1` and resolve any title/quote similarity failure.
14. Run local JS syntax checks.
15. Spot-check that the first and last paragraphs match the source.
16. Scan for likely editorial paraphrase contamination in the `story` array.
