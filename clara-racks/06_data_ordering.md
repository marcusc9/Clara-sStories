# Data Ordering

- Every new story object must include `addedOn` as today's ISO date string.
- Insert new stories newest-first in `window.ClaraStories`.
- Do not backdate entries.
- Make the new story the featured story for today unless a stronger same-day story is already featured.
- Preserve existing story objects unless a direct validation issue must be fixed.
